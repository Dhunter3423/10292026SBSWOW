/**
 * /api/targets
 * Shared monthly goals, weekly forecast and Needs List figures for the
 * Schools+ Ops WOW dashboard, held in Netlify Blobs.
 *
 *   GET  -> the stored targets document, or null if nothing is saved yet
 *   PUT  -> replace the document (body is the targets JSON)
 *   POST -> same as PUT
 */
import { getStore } from '@netlify/blobs';

const KEY = 'targets';
const store = () => getStore({ name: 'sbs-wow', consistency: 'strong' });

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });

export default async (req) => {
  try {
    const s = store();

    if (req.method === 'GET') {
      const doc = await s.get(KEY, { type: 'json' });
      return json(doc ?? null);
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      const body = await req.json();
      if (!body || typeof body !== 'object') return json({ error: 'Body must be a targets object.' }, 400);
      body.updated = new Date().toISOString().slice(0, 10);
      await s.setJSON(KEY, body);
      return json({ ok: true, updated: body.updated });
    }

    if (req.method === 'DELETE') {
      await s.delete(KEY);
      return json({ ok: true });
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (err) {
    return json({ error: String(err && err.message || err) }, 500);
  }
};

export const config = { path: '/api/targets' };
