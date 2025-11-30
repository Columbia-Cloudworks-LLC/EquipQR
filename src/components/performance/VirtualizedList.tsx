import React, { useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  width?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

// Virtualized list for large datasets
function VirtualizedList<T>({
  items,
  itemHeight,
  height,
  width = 800,
  renderItem,
  className = ''
}: VirtualizedListProps<T>) {
  
  const ItemRenderer = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      {renderItem(items[index], index)}
    </div>
  ), [items, renderItem]);

  // Memoize the list to prevent re-renders
  const virtualizedList = useMemo(() => (
    <List
      height={height}
      width={width}
      itemCount={items.length}
      itemSize={itemHeight}
      className={className}
    >
      {ItemRenderer}
    </List>
  ), [items.length, itemHeight, height, width, className, ItemRenderer]);

  return virtualizedList;
}

export default React.memo(VirtualizedList);

