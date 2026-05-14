import { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils/test-utils';

vi.mock('react-resizable-panels', async () => {
  const React = await import('react');

  const Group = React.forwardRef<
    HTMLDivElement,
    React.ComponentPropsWithoutRef<'div'> & { orientation?: string }
  >(function MockGroup({ children, className, orientation, ...rest }, ref) {
    return (
      <div
        ref={ref}
        data-testid="mock-resizable-group"
        data-orientation={orientation}
        className={className}
        {...rest}
      >
        {children}
      </div>
    );
  });

  const Panel = React.forwardRef<
    HTMLDivElement,
    React.ComponentPropsWithoutRef<'div'>
  >(function MockPanel({ children, ...rest }, ref) {
    return (
      <div ref={ref} data-testid="mock-resizable-panel" {...rest}>
        {children}
      </div>
    );
  });

  const Separator = ({
    children,
    className,
    elementRef,
    ...rest
  }: React.ComponentPropsWithoutRef<'div'> & {
    elementRef?: React.Ref<HTMLDivElement | null>;
  }) => {
    const setRef = (node: HTMLDivElement | null) => {
      if (typeof elementRef === 'function') {
        elementRef(node);
      } else if (elementRef && 'current' in elementRef) {
        (elementRef as React.MutableRefObject<HTMLDivElement | null>).current =
          node;
      }
    };
    return (
      <div
        ref={setRef}
        role="separator"
        className={className}
        {...rest}
      >
        {children}
      </div>
    );
  };

  const useDefaultLayout = () => ({
    defaultLayout: undefined,
    onLayoutChange: undefined,
    onLayoutChanged: undefined as ((layout: Record<string, number>) => void) | undefined,
  });

  return { Group, Panel, Separator, useDefaultLayout };
});

import { Panel } from 'react-resizable-panels';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from './resizable';

describe('resizable', () => {
  it('aliases ResizablePanel to the primitive Panel export', () => {
    expect(ResizablePanel).toBe(Panel);
  });

  it('forwards ref from ResizableHandle to Separator via elementRef', () => {
    const handleRef = createRef<HTMLDivElement | null>();

    render(
      <ResizablePanelGroup direction="horizontal" className="h-32">
        <ResizablePanel defaultSize={50} minSize={10}>
          <div>Left</div>
        </ResizablePanel>
        <ResizableHandle ref={handleRef} data-testid="split-handle" />
        <ResizablePanel defaultSize={50} minSize={10}>
          <div>Right</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    );

    const handle = screen.getByTestId('split-handle');
    expect(handle).toBeInTheDocument();
    expect(handleRef.current).toBe(handle);
  });
});
