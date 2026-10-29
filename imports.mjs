/**
 * /api/imports
 * Stored Service Line Detail Report imports. Each upload is kept as its own
 * blob and listed in a small index, so history accumulates instead of being
 * replaced: upload whatever date range you have and the dashboard merges them,
 * newest upload winning on any week two imports both cover.
 *
 *   GET                -> the index: [{ id, name, uploadedAt, rows, weeks, first, last }]
 *   GET  ?id=<id>      -> one full import record, including its parsed dataset
 *   POST               -> store an import: { name, rows, weeks, first, last, data }
 *   DELETE ?id=<id>    -> remove one import
 *   DELETE ?all=1      -> remove every import
 */
import { getStore } from '@netlify/blobs';

const INDEX = 'imports-index';
const PREFIX = 'import/';
const MAX_IMPORTS = 24;

const store = () => getStore({ name: 'sbs-wow', consistency: 'strong' });

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });

const readIndex = async (s) => (await s.get(INDEX, { type: 'json' })) ?? [];
const writeIndex = (s, list) => s.setJSON(INDEX, list);

export default async (req) => {
  try {
    const s = store();
    const url = new URL(req.url);

    if (req.method === 'GET') {
      const id = url.searchParams.get('id');
      if (!id) return json(await readIndex(s));
      const rec = await s.get(PREFIX + id, { type: 'json' });
      return rec ? json(rec) : json({ error: 'No import with that id.' }, 404);
    }

    if (req.method === 'POST') {
      const body = await req.json();
      if (!body || !body.data) return json({ error: 'Body must include a parsed data object.' }, 400);

      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const meta = {
        id,
        name: String(body.name || 'SLDR import').slice(0, 160),
        uploadedAt: new Date().toISOString(),
        rows: body.rows ?? null,
        weeks: body.weeks ?? null,
        first: body.first ?? null,
        last: body.last ?? null
      };

      await s.setJSON(PREFIX + id, { ...meta, v: body.v ?? 1, data: body.data });

      // Newest first, and trim the tail so the store cannot grow without bound.
      const list = [meta, ...(await readIndex(s))];
      const keep = list.slice(0, MAX_IMPORTS);
      for (const gone of list.slice(MAX_IMPORTS)) {
        try { await s.delete(PREFIX + gone.id); } catch (e) { /* already gone */ }
      }
      await writeIndex(s, keep);
      return json({ ok: true, meta, count: keep.length });
    }

    if (req.method === 'DELETE') {
      if (url.searchParams.get('all')) {
        for (const m of await readIndex(s)) {
          try { await s.delete(PREFIX + m.id); } catch (e) { /* already gone */ }
        }
        await writeIndex(s, []);
        return json({ ok: true, count: 0 });
      }
      const id = url.searchParams.get('id');
      if (!id) return json({ error: 'Pass id or all=1.' }, 400);
      try { await s.delete(PREFIX + id); } catch (e) { /* already gone */ }
      const list = (await readIndex(s)).filter(m => m.id !== id);
      await writeIndex(s, list);
      return json({ ok: true, count: list.length });
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (err) {
    return json({ error: String(err && err.message || err) }, 500);
  }
};

export const config = { path: '/api/imports' };
