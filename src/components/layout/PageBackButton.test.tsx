import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@vitest-harness/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { PageBackButton } from './PageBackButton';
import { usePageBackNavigation } from './usePageBackNavigation';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe('PageBackButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with the default Back label', () => {
    render(<PageBackButton />);

    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });

  it('navigates back when browser history exists', async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, 'history', {
      configurable: true,
      value: { length: 2 },
    });

    render(<PageBackButton />);
    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it('falls back to home when there is no history', async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, 'history', {
      configurable: true,
      value: { length: 1 },
    });

    render(<PageBackButton />);
    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('supports a custom fallback destination', async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, 'history', {
      configurable: true,
      value: { length: 1 },
    });

    render(<PageBackButton fallbackTo={{ pathname: '/', hash: 'features' }} label="Back to Features" />);
    await user.click(screen.getByRole('button', { name: 'Back to Features' }));

    expect(navigateMock).toHaveBeenCalledWith({ pathname: '/', hash: 'features' });
  });
});

describe('usePageBackNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a handler that navigates back when history exists', () => {
    Object.defineProperty(window, 'history', {
      configurable: true,
      value: { length: 3 },
    });

    function TestHarness() {
      const goBack = usePageBackNavigation('/dashboard');
      return <button type="button" onClick={goBack}>Go</button>;
    }

    render(<TestHarness />);
    screen.getByRole('button', { name: 'Go' }).click();

    expect(navigateMock).toHaveBeenCalledWith(-1);
  });
});
