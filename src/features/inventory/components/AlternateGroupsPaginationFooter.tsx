import type { ComponentProps } from 'react';
import ListPaginationFooter from '@/components/common/ListPaginationFooter';

type AlternateGroupsPaginationFooterProps = ComponentProps<typeof ListPaginationFooter>;

const AlternateGroupsPaginationFooter = (props: AlternateGroupsPaginationFooterProps) => (
  <ListPaginationFooter testId="alternate-groups-pagination-footer" {...props} />
);

export default AlternateGroupsPaginationFooter;
