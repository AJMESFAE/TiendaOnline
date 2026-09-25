import crypto from 'crypto';

/**
 * Firma Redsys HMAC_SHA256_V1 (TPV Virtual, "Redirección" y REST).
 *
 * 1. La clave secreta del comercio (Base64) se decodifica: 24 bytes.
 * 2. Se diversifica por pedido: 3DES-CBC (IV de ceros, sin padding PKCS)
 *    del número de pedido rellenado con 0x00 hasta múltiplo de 8.
 * 3. Firma = Base64( HMAC-SHA256(claveDiversificada, Ds_MerchantParameters) ).
 *
 * Este módulo no depende de EverShop para poder probarse de forma aislada.
 */

export const SIGNATURE_VERSION = 'HMAC_SHA256_V1';

export type MerchantParameters = Record<string, string>;

function deriveOrderKey(secretKeyBase64: string, order: string): Buffer {
  const key = Buffer.from(secretKeyBase64, 'base64');
  if (key.length !== 24) {
    throw new Error(
      'La clave secreta de Redsys no es válida (debe ser Base64 de 24 bytes)'
    );
  }
  const orderBytes = Buffer.from(order, 'utf8');
  const paddedLength = Math.ceil(orderBytes.length / 8) * 8;
  const padded = Buffer.alloc(paddedLength, 0);
  orderBytes.copy(padded);
  const cipher = crypto.createCipheriv('des-ede3-cbc', key, Buffer.alloc(8, 0));
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(padded), cipher.final()]);
}

/** Redsys puede devolver Base64 estándar o "URL safe": normalizamos a estándar. */
export function toStandardBase64(value: string): string {
  return value.replace(/-/g, '+').replace(/_/g, '/');
}

export function encodeMerchantParameters(params: MerchantParameters): string {
  return Buffer.from(JSON.stringify(params), 'utf8').toString('base64');
}

export function decodeMerchantParameters(
  merchantParameters: string
): MerchantParameters {
  const json = Buffer.from(
    toStandardBase64(merchantParameters),
    'base64'
  ).toString('utf8');
  const parsed = JSON.parse(json);
  // Los valores de la notificación llegan URL-encoded (p. ej. Ds_Date 25%2F09%2F2026).
  const result: MerchantParameters = {};
  for (const [k, v] of Object.entries(parsed)) {
    const str = v === null || v === undefined ? '' : String(v);
    try {
      result[k] = decodeURIComponent(str);
    } catch {
      result[k] = str;
    }
  }
  return result;
}

export function createSignature(
  secretKeyBase64: string,
  order: string,
  merchantParametersBase64: string
): string {
  const orderKey = deriveOrderKey(secretKeyBase64, order);
  return crypto
    .createHmac('sha256', orderKey)
    .update(merchantParametersBase64)
    .digest('base64');
}

/** Comparación en tiempo constante, tolerante a Base64 URL-safe. */
export function verifySignature(
  secretKeyBase64: string,
  order: string,
  merchantParametersBase64: string,
  receivedSignature: string
): boolean {
  if (!receivedSignature || !order) {
    return false;
  }
  const expected = Buffer.from(
    createSignature(secretKeyBase64, order, merchantParametersBase64),
    'base64'
  );
  const received = Buffer.from(toStandardBase64(receivedSignature), 'base64');
  return (
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received)
  );
}

/** Importe en céntimos como exige Redsys (DS_MERCHANT_AMOUNT). */
export function toRedsysAmount(amount: number | string): string {
  // toFixed(6) absorbe el error binario (1.005 * 100 = 100.49999…).
  const value = Math.round(Number((Number(amount) * 100).toFixed(6)));
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Importe no válido para Redsys: ${amount}`);
  }
  return String(value);
}

/** Ds_Response 0000–0099 = operación autorizada. */
export function isAuthorizedResponse(dsResponse: string | undefined): boolean {
  const code = parseInt(String(dsResponse ?? ''), 10);
  return Number.isInteger(code) && code >= 0 && code <= 99;
}

/** Ds_Response 0900 = devolución/confirmación aceptada. */
export function isRefundAccepted(dsResponse: string | undefined): boolean {
  return parseInt(String(dsResponse ?? ''), 10) === 900;
}

/**
 * DS_MERCHANT_ORDER: 4–12 caracteres alfanuméricos, los 4 primeros numéricos,
 * y único por intento de pago (Redsys rechaza números repetidos, SIS0051).
 * Formato: número de pedido EverShop (8 dígitos) + 4 dígitos aleatorios.
 */
export function buildRedsysOrderNumber(orderNumber: string | number): string {
  const digits = String(orderNumber).replace(/\D/g, '').slice(-8).padStart(8, '0');
  const suffix = crypto.randomInt(0, 10000).toString().padStart(4, '0');
  return `${digits}${suffix}`;
}

export interface SignedRequest {
  Ds_SignatureVersion: string;
  Ds_MerchantParameters: string;
  Ds_Signature: string;
}

export function signRequest(
  secretKeyBase64: string,
  params: MerchantParameters
): SignedRequest {
  const order = params.DS_MERCHANT_ORDER;
  if (!order) {
    throw new Error('DS_MERCHANT_ORDER es obligatorio');
  }
  const merchantParameters = encodeMerchantParameters(params);
  return {
    Ds_SignatureVersion: SIGNATURE_VERSION,
    Ds_MerchantParameters: merchantParameters,
    Ds_Signature: createSignature(secretKeyBase64, order, merchantParameters)
  };
}

/** Lee el número de pedido de una respuesta (notificación o REST). */
export function getOrderFromParameters(params: MerchantParameters): string {
  return params.Ds_Order || params.DS_ORDER || params.Ds_Merchant_Order || '';
}
