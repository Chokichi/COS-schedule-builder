export function jsonHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('Origin') || '';
  const headers: Record<string, string> = {
    'Cache-Control': 'public, max-age=60',
    'Content-Type': 'application/json; charset=utf-8',
  };
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
  }
  return headers;
}
