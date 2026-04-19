import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@/test/utils/test-utils';
import { FleetMapErrorBoundary } from '../FleetMapErrorBoundary';

// Silence the React-internal "The above error occurred in the <Throw>
// component" log that would otherwise spam test output. The boundary itself
// also calls logger.error, which is mocked.
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

const Throw: React.FC<{ message?: string }> = ({ message = 'synthetic boom' }) => {
  throw new Error(message);
};

describe('FleetMapErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Boundary mode', () => {
    it('catches a render-time error in children and renders the diagnostic card', () => {
      render(
        <FleetMapErrorBoundary>
          <Throw message="marker.js cannot read properties of undefined" />
        </FleetMapErrorBoundary>,
      );

      expect(screen.getByText('Fleet Map Error')).toBeInTheDocument();
      expect(
        screen.getByText('marker.js cannot read properties of undefined'),
      ).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('renders children unchanged when nothing throws', () => {
      render(
        <FleetMapErrorBoundary>
          <div data-testid="happy-path">all good</div>
        </FleetMapErrorBoundary>,
      );

      expect(screen.getByTestId('happy-path')).toBeInTheDocument();
      expect(screen.queryByText('Fleet Map Error')).not.toBeInTheDocument();
    });

    it('clears boundary state and re-renders children when Try Again is clicked', () => {
      // A controllable child whose throw-on-render is gated by an externally
      // mutable flag so React 18 StrictMode's mount/unmount/remount behavior
      // doesn't accidentally let the second mount succeed before the test
      // can assert the error state.
      const flag = { shouldThrow: true };
      const ThrowControlled: React.FC = () => {
        if (flag.shouldThrow) throw new Error('controlled-throw');
        return <div data-testid="recovered">recovered</div>;
      };

      render(
        <FleetMapErrorBoundary>
          <ThrowControlled />
        </FleetMapErrorBoundary>,
      );

      expect(screen.getByText('Fleet Map Error')).toBeInTheDocument();
      expect(screen.getByText('controlled-throw')).toBeInTheDocument();

      flag.shouldThrow = false;
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      expect(screen.getByTestId('recovered')).toBeInTheDocument();
      expect(screen.queryByText('Fleet Map Error')).not.toBeInTheDocument();
    });

    it('invokes onReset after the boundary state is cleared', () => {
      const onReset = vi.fn();
      const flag = { shouldThrow: true };
      const ThrowControlled: React.FC = () => {
        if (flag.shouldThrow) throw new Error('controlled-throw');
        return <div data-testid="recovered">recovered</div>;
      };

      render(
        <FleetMapErrorBoundary onReset={onReset}>
          <ThrowControlled />
        </FleetMapErrorBoundary>,
      );

      expect(screen.getByText('Fleet Map Error')).toBeInTheDocument();

      flag.shouldThrow = false;
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      expect(onReset).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('recovered')).toBeInTheDocument();
    });
  });

  describe('Presentational mode', () => {
    it('renders the diagnostic card immediately when given an `error` prop', () => {
      const onRetry = vi.fn();
      render(
        <FleetMapErrorBoundary error="Edge function exploded" onRetry={onRetry} />,
      );

      expect(screen.getByText('Fleet Map Error')).toBeInTheDocument();
      expect(screen.getByText('Edge function exploded')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('invokes onRetry when Try Again is clicked', () => {
      const onRetry = vi.fn();
      render(
        <FleetMapErrorBoundary error="oops" onRetry={onRetry} isRetrying={false} />,
      );

      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('disables the button and shows "Retrying..." when isRetrying is true', () => {
      render(
        <FleetMapErrorBoundary error="oops" onRetry={vi.fn()} isRetrying={true} />,
      );

      const button = screen.getByRole('button', { name: /retrying/i });
      expect(button).toBeDisabled();
    });
  });
});
