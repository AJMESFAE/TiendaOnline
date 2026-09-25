import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import { test } from 'node:test';
import {
  buildRedsysOrderNumber,
  createSignature,
  decodeMerchantParameters,
  encodeMerchantParameters,
  isAuthorizedResponse,
  isRefundAccepted,
  signRequest,
  toRedsysAmount,
  verifySignature
} from '../dist/services/signature.js';

// Clave pública del comercio de pruebas genérico de Redsys (999008881).
const TEST_KEY = 'sq7HjrUOBfKmC576ILgskD5srU870gJ7';

/** Implementación independiente (openssl CLI) de la diversificación 3DES. */
function opensslSignature(keyB64, order, paramsB64) {
  const key = Buffer.from(keyB64, 'base64').toString('hex');
  const orderBuf = Buffer.from(order);
  const padded = Buffer.alloc(Math.ceil(orderBuf.length / 8) * 8, 0);
  orderBuf.copy(padded);
  const derived = execFileSync(
    'openssl',
    ['enc', '-des-ede3-cbc', '-K', key, '-iv', '0000000000000000', '-nopad'],
    { input: padded }
  );
  return crypto.createHmac('sha256', derived).update(paramsB64).digest('base64');
}

test('la firma coincide con una implementación independiente (openssl)', () => {
  for (const order of ['1446068581', '000100230042', '1234', '12345678']) {
    const params = encodeMerchantParameters({
      DS_MERCHANT_AMOUNT: '145',
      DS_MERCHANT_ORDER: order,
      DS_MERCHANT_MERCHANTCODE: '999008881',
      DS_MERCHANT_CURRENCY: '978',
      DS_MERCHANT_TRANSACTIONTYPE: '0',
      DS_MERCHANT_TERMINAL: '1'
    });
    assert.equal(
      createSignature(TEST_KEY, order, params),
      opensslSignature(TEST_KEY, order, params)
    );
  }
});

test('signRequest genera los tres campos del formulario', () => {
  const signed = signRequest(TEST_KEY, {
    DS_MERCHANT_ORDER: '000100230042',
    DS_MERCHANT_AMOUNT: '1990'
  });
  assert.equal(signed.Ds_SignatureVersion, 'HMAC_SHA256_V1');
  assert.deepEqual(decodeMerchantParameters(signed.Ds_MerchantParameters), {
    DS_MERCHANT_ORDER: '000100230042',
    DS_MERCHANT_AMOUNT: '1990'
  });
  assert.ok(
    verifySignature(TEST_KEY, '000100230042', signed.Ds_MerchantParameters, signed.Ds_Signature)
  );
});

test('verifica notificaciones con Base64 URL-safe y valores URL-encoded', () => {
  const order = '000100230042';
  const params = Buffer.from(
    JSON.stringify({
      Ds_Date: '25%2F09%2F2026',
      Ds_Hour: '10%3A15',
      Ds_Amount: '1990',
      Ds_Currency: '978',
      Ds_Order: order,
      Ds_Response: '0000'
    })
  ).toString('base64');
  const sig = createSignature(TEST_KEY, order, params)
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  assert.ok(verifySignature(TEST_KEY, order, params, sig));
  const decoded = decodeMerchantParameters(params);
  assert.equal(decoded.Ds_Date, '25/09/2026');
  assert.equal(decoded.Ds_Hour, '10:15');
});

test('rechaza firmas manipuladas o de otro pedido', () => {
  const order = '000100230042';
  const params = encodeMerchantParameters({ Ds_Order: order, Ds_Amount: '1990' });
  const sig = createSignature(TEST_KEY, order, params);
  const tampered = encodeMerchantParameters({ Ds_Order: order, Ds_Amount: '1' });
  assert.equal(verifySignature(TEST_KEY, order, tampered, sig), false);
  assert.equal(verifySignature(TEST_KEY, '000100230043', params, sig), false);
  assert.equal(verifySignature(TEST_KEY, order, params, ''), false);
  assert.equal(verifySignature(TEST_KEY, order, params, 'AAAA'), false);
});

test('importes en céntimos sin errores de coma flotante', () => {
  assert.equal(toRedsysAmount(19.9), '1990');
  assert.equal(toRedsysAmount('0.29'), '29');
  assert.equal(toRedsysAmount('1.005'), '101');
  assert.equal(toRedsysAmount(100), '10000');
  assert.throws(() => toRedsysAmount('abc'));
});

test('códigos de respuesta', () => {
  assert.ok(isAuthorizedResponse('0000'));
  assert.ok(isAuthorizedResponse('0099'));
  assert.equal(isAuthorizedResponse('0101'), false);
  assert.equal(isAuthorizedResponse('9915'), false);
  assert.equal(isAuthorizedResponse(undefined), false);
  assert.ok(isRefundAccepted('0900'));
  assert.equal(isRefundAccepted('0000'), false);
});

test('número de pedido Redsys: 12 dígitos, empieza por el nº de pedido', () => {
  const n = buildRedsysOrderNumber(10023);
  assert.match(n, /^\d{12}$/);
  assert.ok(n.startsWith('00010023'));
});

test('rechaza claves con longitud incorrecta', () => {
  assert.throws(() => createSignature('c2hvcnQ=', '1234', 'x'));
});
