import type { PaginatedResult } from '../types/api.js';

export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize: number
): PaginatedResult<T> {
  const startIndex = (page - 1) * pageSize;
  return {
    totalCount: items.length,
    page,
    pageSize,
    items: items.slice(startIndex, startIndex + pageSize),
  };
}
