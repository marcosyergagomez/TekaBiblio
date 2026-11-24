export type PaginationQuery = {
  page?: number;
  pageSize?: number;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

const MAX_PAGE_SIZE = 100;

export function resolvePagination(
  query: PaginationQuery,
  defaultPageSize: number,
): { page: number; pageSize: number } {
  const page =
    typeof query.page === 'number' && query.page > 0
      ? Math.floor(query.page)
      : 1;
  const requested =
    typeof query.pageSize === 'number' && query.pageSize > 0
      ? Math.floor(query.pageSize)
      : defaultPageSize;
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, requested));

  return { page, pageSize };
}

export function paginateFromQuery<T>(
  items: T[],
  query: PaginationQuery,
  defaultPageSize: number,
): PaginatedResult<T> {
  const { page, pageSize } = resolvePagination(query, defaultPageSize);
  const total = items.length;
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
  };
}
