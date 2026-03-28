import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/utils/test-utils';

vi.mock('vaul', async () => {
  const React = await import('react');

  return {
    Drawer: {
      Root: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
        React.createElement('div', props, children),
      Trigger: ({ children, ...props }: React.HTMLAttributes<HTMLButtonElement>) =>
        React.createElement('button', props, children),
      Portal: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
      Close: ({ children, ...props }: React.HTMLAttributes<HTMLButtonElement>) =>
        React.createElement('button', props, children),
      Overlay: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) =>
        React.createElement('div', { ...props, ref, 'data-testid': 'drawer-overlay' })
      ),
      Content: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) =>
        React.createElement('div', { ...props, ref, 'data-testid': 'drawer-content' })
      ),
      Title: React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>((props, ref) =>
        React.createElement('h2', { ...props, ref })
      ),
      Description: React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>((props, ref) =>
        React.createElement('p', { ...props, ref })
      ),
    },
  };
});

import { DrawerContent } from '../drawer';

describe('DrawerContent', () => {
  it('uses semantic modal z-index utilities for overlay and content', () => {
    render(<DrawerContent>Drawer body</DrawerContent>);

    expect(screen.getByTestId('drawer-overlay')).toHaveClass('z-modal-backdrop');
    expect(screen.getByTestId('drawer-content')).toHaveClass('z-modal');
    expect(screen.getByTestId('drawer-overlay').className).not.toContain('z-[1100]');
    expect(screen.getByTestId('drawer-content').className).not.toContain('z-[1101]');
  });
});
