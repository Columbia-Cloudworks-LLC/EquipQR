import { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils/test-utils';

vi.mock('react-resizable-panels', async () => {
  const React = await import('react');

  const Group = React.forwardRef<
    HTMLDivElement,
    React.ComponentPropsWithoutRef<'div'> & { orientation?: string }
  >(function MockGroup({ children, className, ...rest }, ref) {
    return (
      <div ref={ref} data-testid="mock-resizable-group" className={className} {...rest}>
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

  const Separator = React.forwardRef<
    HTMLDivElement,
    React.ComponentPropsWithoutRef<'div'>
  >(function MockSeparator({ children, className, ...rest }, ref) {
    return (
      <div
        ref={ref}
        role="separator"
        className={className}
        {...rest}
      >
        {children}
      </div>
    );
  });

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

  it('forwards ref from ResizableHandle to Separator', () => {
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
