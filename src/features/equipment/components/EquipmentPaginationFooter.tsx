import type { ComponentProps } from 'react';
import ListPaginationFooter from '@/components/common/ListPaginationFooter';

type EquipmentPaginationFooterProps = ComponentProps<typeof ListPaginationFooter>;

const EquipmentPaginationFooter = (props: EquipmentPaginationFooterProps) => (
  <ListPaginationFooter testId="equipment-list-pagination-footer" {...props} />
);

export default EquipmentPaginationFooter;
