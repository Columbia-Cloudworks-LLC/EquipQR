import React, { useMemo, useCallback } from 'react';
import { List, type RowComponentProps } from 'react-window';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  width?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

type VirtualRowProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
};

// Virtualized list for large datasets
function VirtualizedList<T>({
  items,
  itemHeight,
  height,
  width = 800,
  renderItem,
  className = '',
}: VirtualizedListProps<T>) {
  const rowProps: VirtualRowProps<T> = useMemo(
    () => ({ items, renderItem }),
    [items, renderItem]
  );

  const Row = useCallback((props: RowComponentProps<VirtualRowProps<T>>) => {
    const item = props.items[props.index];
    if (item === undefined) return null;
    return (
      <div {...props.ariaAttributes} style={props.style}>
        {props.renderItem(item, props.index)}
      </div>
    );
  }, []);

  const virtualizedList = useMemo(
    () => (
      <List
        rowComponent={Row}
        rowCount={items.length}
        rowHeight={itemHeight}
        rowProps={rowProps}
        className={className}
        style={{ height, width }}
      />
    ),
    [items.length, itemHeight, height, width, className, rowProps, Row]
  );

  return virtualizedList;
}

export default React.memo(VirtualizedList) as typeof VirtualizedList;
