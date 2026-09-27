import assert from 'node:assert/strict';
import { test } from 'node:test';
import { descriptionToText, textToDescription } from '../src/lib/description.ts';
import { parseDecimal, slugify } from '../src/lib/format.ts';

test('descripción: ida y vuelta entre texto y bloques de EditorJS', () => {
  const text = 'Primer párrafo con <etiquetas> & signos.\nSegunda línea.\n\nOtro párrafo.';
  const rows = textToDescription(text, 'libro-1');
  assert.equal(rows.length, 1);
  const blocks = rows[0].columns[0].data.blocks;
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].data.text, 'Primer párrafo con &lt;etiquetas&gt; &amp; signos.<br>Segunda línea.');
  assert.equal(descriptionToText(rows), text);
});

test('descripción: lee títulos, listas y HTML de la importación de Shopify', () => {
  const rows = [
    {
      id: 'r',
      size: 1,
      columns: [
        {
          id: 'c',
          size: 1,
          data: {
            blocks: [
              { type: 'header', data: { text: 'Índice', level: 2 } },
              { type: 'paragraph', data: { text: '<b>Autor:</b> Ibn&nbsp;Hazm' } },
              { type: 'list', data: { items: ['uno', { content: 'dos' }] } }
            ]
          }
        }
      ]
    }
  ];
  assert.equal(descriptionToText(rows), 'Índice\n\nAutor: Ibn Hazm\n\n• uno\n• dos');
  assert.equal(descriptionToText(null), '');
  assert.deepEqual(textToDescription('  \n\n ', 'x'), []);
});

test('formato: slug y decimales con coma', () => {
  assert.equal(slugify('Historia de al-Ándalus (2ª ed.)'), 'historia-de-al-andalus-2-ed');
  assert.equal(parseDecimal('12,50'), 12.5);
  assert.equal(parseDecimal(' 3.2 '), 3.2);
  assert.ok(Number.isNaN(parseDecimal('')));
});

test('formato: fechas ISO, en milisegundos y objetos { value }', async () => {
  const { formatDate } = await import('../src/lib/format.ts');
  const ms = String(Date.UTC(2026, 8, 27, 10, 30));
  assert.match(formatDate(ms), /2026/);
  assert.equal(formatDate({ value: ms }), formatDate(ms));
  assert.match(formatDate('2026-09-27T10:30:00Z'), /2026/);
  assert.equal(formatDate(null), '');
});
