import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildNewOrderMessages, sendPushMessages } from '../dist/services/pushMessages.js';

const order = {
  uuid: 'u-1',
  order_number: '10023',
  grand_total: '34.9000',
  currency: 'EUR',
  customer_full_name: 'María López',
  customer_email: 'maria@example.com',
  total_qty: 2
};

test('aviso de pedido nuevo: título, texto y pedido que abre', () => {
  const [m] = buildNewOrderMessages(order, ['ExponentPushToken[a]']);
  assert.equal(m.to, 'ExponentPushToken[a]');
  assert.equal(m.title, 'Nuevo pedido #10023');
  assert.match(m.body, /^María López · 34,90\s€ · 2 artículos$/);
  assert.deepEqual(m.data, { orderUuid: 'u-1' });
  assert.equal(m.channelId, 'pedidos');
  const [anon] = buildNewOrderMessages({ ...order, customer_full_name: null, total_qty: 1 }, ['t']);
  assert.match(anon.body, /^maria@example\.com · 34,90\s€ · 1 artículo$/);
});

test('envío: lotes de 100 y tokens caducados', async () => {
  const calls = [];
  const fakeFetch = async (url, init) => {
    const batch = JSON.parse(init.body);
    calls.push({ url, n: batch.length, auth: init.headers.Authorization });
    return new Response(
      JSON.stringify({
        data: batch.map((m) =>
          m.to === 't5'
            ? { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } }
            : m.to === 't7'
              ? { status: 'error', message: 'rate', details: { error: 'MessageRateExceeded' } }
              : { status: 'ok', id: 'x' }
        )
      }),
      { status: 200 }
    );
  };
  const tokens = Array.from({ length: 150 }, (_, i) => `t${i}`);
  const warnings = [];
  const invalid = await sendPushMessages(buildNewOrderMessages(order, tokens), fakeFetch, (w) => warnings.push(w));
  assert.deepEqual(calls.map((c) => c.n), [100, 50]);
  assert.equal(calls[0].url, 'https://exp.host/--/api/v2/push/send');
  assert.equal(calls[0].auth, undefined);
  assert.deepEqual(invalid, ['t5']);
  assert.equal(warnings.length, 1);
});

test('envío: error HTTP de Expo', async () => {
  const fakeFetch = async () => new Response(JSON.stringify({ errors: [{ message: 'Unauthorized' }] }), { status: 401 });
  await assert.rejects(sendPushMessages(buildNewOrderMessages(order, ['t']), fakeFetch), /Unauthorized/);
});
