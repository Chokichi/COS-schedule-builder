export interface SnapshotMeta {
  fetched_at: string;
  year: number;
  term: string;
  term_code: string;
}

export async function readSnapshotMeta(db: D1Database): Promise<SnapshotMeta | null> {
  return db.prepare(
    'SELECT fetched_at, year, term, term_code FROM schedule_snapshot WHERE id = 1'
  ).first<SnapshotMeta>();
}

export async function readSnapshotPayload(db: D1Database): Promise<{ courses: unknown[]; online: unknown[] }> {
  const chunks = await db.prepare(
    'SELECT data FROM schedule_chunk ORDER BY seq'
  ).all<{ data: string }>();

  const joined = (chunks.results || []).map((row) => row.data).join('');
  if (joined) {
    return JSON.parse(joined);
  }

  const row = await db.prepare(
    'SELECT payload FROM schedule_snapshot WHERE id = 1'
  ).first<{ payload: string }>();
  if (!row?.payload || row.payload === '{}') {
    return { courses: [], online: [] };
  }
  return JSON.parse(row.payload);
}
