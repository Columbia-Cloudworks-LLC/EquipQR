export function paginateListItems<T>(items: T[], page: number, pageSize: number): T[] {
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function getListPageCount(totalItems: number, pageSize: number): number {
  if (totalItems <= 0) return 1;
  return Math.ceil(totalItems / pageSize);
}

export function clampListPage(page: number, totalItems: number, pageSize: number): number {
  return Math.min(Math.max(1, page), getListPageCount(totalItems, pageSize));
}

export function getListPageRange(
  totalItems: number,
  page: number,
  pageSize: number,
): { start: number; end: number } {
  if (totalItems <= 0) {
    return { start: 0, end: 0 };
  }

  const safePage = clampListPage(page, totalItems, pageSize);
  const start = (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalItems);
  return { start, end };
}
