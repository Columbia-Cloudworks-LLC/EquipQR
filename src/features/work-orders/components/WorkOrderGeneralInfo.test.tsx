import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@vitest-harness/utils/test-utils';
import { WorkOrderGeneralInfo } from '@/features/work-orders/components/WorkOrderGeneralInfo';

describe('WorkOrderGeneralInfo', () => {
  const setValue = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the description field', () => {
    render(
      <WorkOrderGeneralInfo
        values={{ title: '', priority: 'medium', description: '' }}
        errors={{}}
        setValue={setValue}
      />
    );

    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  it('updates description via setValue when typing', () => {
    render(
      <WorkOrderGeneralInfo
        values={{ title: '', priority: 'medium', description: '' }}
        errors={{}}
        setValue={setValue}
      />
    );

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Leak found' } });

    expect(setValue).toHaveBeenCalledWith('description', 'Leak found');
  });
});
