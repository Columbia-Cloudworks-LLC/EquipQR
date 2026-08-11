import { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@vitest-harness/utils/test-utils';

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

  // Strip react-resizable-panels API props so they are not spread onto the
  // DOM node (React warns about unknown `defaultSize`/`minSize` attributes).
  type MockPanelProps = React.ComponentPropsWithoutRef<'div'> & {
    defaultSize?: number;
    minSize?: number;
    maxSize?: number;
    collapsible?: boolean;
    collapsedSize?: number;
  };

  const Panel = React.forwardRef<HTMLDivElement, MockPanelProps>(function MockPanel(props, ref) {
    const { children, defaultSize, minSize, maxSize, collapsible, collapsedSize, ...rest } = props;
    void defaultSize;
    void minSize;
    void maxSize;
    void collapsible;
    void collapsedSize;
    return (
      <div ref={ref} data-testid="mock-resizable-panel" {...rest}>
        {children}
      </div>
    );
  });

  function assignRef<T>(r: React.Ref<T> | undefined, value: T | null): void {
    if (!r) return;
    if (typeof r === 'function') {
      r(value);
    } else if ('current' in r) {
      (r as React.MutableRefObject<T | null>).current = value;
    }
  }

  function MockSeparator({
    children,
    className,
    elementRef,
    ...rest
  }: React.ComponentPropsWithoutRef<'div'> & {
    elementRef?: React.Ref<HTMLDivElement | null>;
  }) {
    return (
      <div
        ref={(el) => assignRef(elementRef, el)}
        role="separator"
        className={className}
        {...rest}
      >
        {children}
      </div>
    );
  }

  const Separator = MockSeparator;

  return { Group, Panel, Separator };
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

  it('maps direction vertical to orientation on the underlying Group', () => {
    render(
      <ResizablePanelGroup direction="vertical" className="min-h-[200px]">
        <ResizablePanel defaultSize={50}>A</ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50}>B</ResizablePanel>
      </ResizablePanelGroup>
    );

    const group = screen.getByTestId('mock-resizable-group');
    expect(group).toHaveAttribute('data-orientation', 'vertical');
  });
});
