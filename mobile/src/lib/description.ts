// La descripción de los productos de EverShop se guarda en el formato del
// editor del panel: filas → columnas → bloques de EditorJS. En la app se edita
// como texto plano: un párrafo por cada bloque separado por una línea en blanco.

type EditorBlock = { id?: string; type: string; data: Record<string, any> };
type Column = { id: string; size: number; data: { time?: number; version?: string; blocks?: EditorBlock[] } };
export type DescriptionRow = { id: string; size: number; className?: string; columns: Column[] };

function stripHtml(html: string): string {
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function blockText(block: EditorBlock): string {
  const d = block.data || {};
  if (block.type === 'list' && Array.isArray(d.items)) {
    return d.items
      .map((it: any) => `• ${stripHtml(typeof it === 'string' ? it : it?.content ?? '')}`)
      .join('\n');
  }
  if (typeof d.text === 'string') return stripHtml(d.text);
  return '';
}

export function descriptionToText(description: unknown): string {
  if (!Array.isArray(description)) return '';
  const parts: string[] = [];
  for (const row of description as DescriptionRow[]) {
    for (const col of row?.columns ?? []) {
      for (const block of col?.data?.blocks ?? []) {
        const t = blockText(block);
        if (t) parts.push(t);
      }
    }
  }
  return parts.join('\n\n');
}

export function textToDescription(text: string, key: string): DescriptionRow[] {
  const id = key.replace(/[^a-z0-9]/gi, '_') || 'app';
  const blocks = text
    .replace(/\r/g, '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p, i) => ({
      id: `${id}_${i}`,
      type: 'paragraph',
      data: { text: escapeHtml(p).replace(/\n/g, '<br>') }
    }));
  if (blocks.length === 0) return [];
  return [
    {
      id: `r_${id}`,
      size: 1,
      className: 'md:grid-cols-1',
      columns: [{ id: `c_${id}`, size: 1, data: { time: Date.now(), version: '2.31.0', blocks } }]
    }
  ];
}
