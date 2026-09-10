import { jsonHeaders } from '../../cors';
import { readSnapshotMeta } from '../../_lib/snapshot';

interface Env {
  DB: D1Database;
}

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return new Response(null, { status: 204, headers: jsonHeaders(request) });
};

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const headers = jsonHeaders(request);
  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Schedule database is not bound' }), {
      status: 503,
      headers,
    });
  }

  try {
    const row = await readSnapshotMeta(env.DB);
    if (!row) {
      return new Response(JSON.stringify({ error: 'No schedule snapshot yet' }), {
        status: 404,
        headers,
      });
    }

    return new Response(JSON.stringify({
      fetchedAt: row.fetched_at,
      year: row.year,
      term: row.term,
      termCode: row.term_code,
    }), { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read schedule meta';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers });
  }
};
