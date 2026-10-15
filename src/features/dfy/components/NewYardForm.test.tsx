import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NewYardForm } from './NewYardForm';

const svc = vi.hoisted(() => ({
  checkExisting: vi.fn(),
  create: vi.fn(),
}));

vi.mock('@/features/dfy/services/dfyProvisioningService', () => ({
  dfyProvisioning: svc,
}));

function renderForm() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<NewYardForm onCreated={() => {}} />, { wrapper });
}

function fill(staff: string) {
  fireEvent.change(screen.getByLabelText('Organization name'), { target: { value: 'Acme Heavy' } });
  fireEvent.change(screen.getByLabelText(/^Staff/), { target: { value: staff } });
}

describe('NewYardForm', () => {
  beforeEach(() => {
    svc.checkExisting.mockReset();
    svc.create.mockReset();
  });

  it('discards a review that finishes after the staff list was edited', async () => {
    let resolveCheck: (emails: string[]) => void = () => {};
    svc.checkExisting.mockReturnValue(new Promise<string[]>((resolve) => { resolveCheck = resolve; }));

    renderForm();
    fill('old@acme.co, owner');
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    await waitFor(() => expect(svc.checkExisting).toHaveBeenCalledWith(['old@acme.co']));

    fireEvent.change(screen.getByLabelText(/^Staff/), { target: { value: 'new@acme.co, owner' } });
    await act(async () => resolveCheck([]));

    expect(screen.queryByTestId('dfy-review')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create yard' })).toBeDisabled();
  });

  it('enables Create after a current review', async () => {
    svc.checkExisting.mockResolvedValue([]);
    renderForm();
    fill('owner@acme.co, owner');
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    expect(await screen.findByTestId('dfy-review')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create yard' })).toBeEnabled();
  });
});
