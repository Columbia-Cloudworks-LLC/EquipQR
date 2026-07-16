import {
  clampListPage,
  getListPageCount,
  getListPageRange,
  paginateListItems,
} from '@/utils/listPagination';

export const DEFAULT_ALTERNATE_GROUP_CARD_PAGE_SIZE = 12;
export const DEFAULT_ALTERNATE_GROUP_TABLE_PAGE_SIZE = 25;

export const ALTERNATE_GROUP_CARD_PAGE_SIZE_OPTIONS = [12, 24, 36, 48] as const;
export const ALTERNATE_GROUP_TABLE_PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;

export const paginateAlternateGroupItems = paginateListItems;
export const getAlternateGroupPageCount = getListPageCount;
export const clampAlternateGroupPage = clampListPage;
export const getAlternateGroupPageRange = getListPageRange;
