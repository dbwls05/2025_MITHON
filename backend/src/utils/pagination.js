// ===============================
// 커서 기반 페이지네이션 (created_at, id 순)
// OFFSET 대신 마지막으로 받은 행 다음부터 읽어서, 목록이 길어져도 조회 비용이 일정하다.
// (place_id, created_at) 같은 기존 인덱스를 그대로 탄다.
// 요청: ?limit=20&cursor=<이전 응답의 nextCursor>
// 응답: { items: [...], nextCursor: string | null }
// ===================================
const HttpError = require('./HttpError');

function parsePage(query, { defaultLimit = 20, maxLimit = 50 } = {}) {
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  if (!query.cursor) return { limit, cursor: null };

  try {
    const [iso, id] = JSON.parse(Buffer.from(String(query.cursor), 'base64url').toString());
    const createdAt = new Date(iso);
    if (Number.isNaN(createdAt.getTime()) || !Number.isInteger(id)) throw new Error();
    return { limit, cursor: { createdAt, id } };
  } catch {
    throw new HttpError(400, '잘못된 cursor입니다.');
  }
}

// 최신순(내림차순) 기준 "cursor보다 오래된 것" 조건
function olderThan(alias, cursor) {
  if (!cursor) return { sql: '', params: [] };
  return {
    sql: `AND (${alias}.created_at < ? OR (${alias}.created_at = ? AND ${alias}.id < ?))`,
    params: [cursor.createdAt, cursor.createdAt, cursor.id],
  };
}

// limit + 1개를 조회해 두고 넘치면 다음 페이지가 있다고 판단한다
function toPage(rows, limit, mapRow) {
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const last = pageRows[pageRows.length - 1];
  return {
    items: pageRows.map(mapRow),
    nextCursor: hasMore
      ? Buffer.from(JSON.stringify([last.created_at.toISOString(), last.id])).toString('base64url')
      : null,
  };
}

module.exports = { parsePage, olderThan, toPage };
