import { jsonHeaders } from '../../cors';

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
    const row = await env.DB.prepare(
      'SELECT fetched_at, year, term, term_code, payload FROM schedule_snapshot WHERE id = 1'
    ).first<{
      fetched_at: string;
      year: number;
      term: string;
      term_code: string;
      payload: string;
    }>();

    if (!row) {
      return new Response(JSON.stringify({ error: 'No schedule snapshot yet' }), {
        status: 404,
        headers,
      });
    }

    const payload = JSON.parse(row.payload);
    return new Response(JSON.stringify({
      fetchedAt: row.fetched_at,
      year: row.year,
      term: row.term,
      termCode: row.term_code,
      courses: payload.courses || [],
      online: payload.online || [],
    }), { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read schedule';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers });
  }
};
