import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@vitest-harness/utils/test-utils';
import { WorkOrderGeneralInfo } from '@/features/work-orders/components/WorkOrderGeneralInfo';

const mockToggleListening = vi.fn();

vi.mock('@/hooks/useVoiceTextAppender', () => ({
  useVoiceTextAppender: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => ({
    isSupported: true,
    isListening: false,
    error: null,
    interimTranscript: '',
    toggleListening: () => {
      mockToggleListening();
      onChange(`${value}${value.trim() ? ' ' : ''}voice description`);
    },
    canUseVoice: true,
  }),
}));

describe('WorkOrderGeneralInfo voice dictation', () => {
  const setValue = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows voice control on the description field', () => {
    render(
      <WorkOrderGeneralInfo
        values={{ title: '', priority: 'medium', description: '' }}
        errors={{}}
        setValue={setValue}
      />
    );

    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start voice input' })).toBeInTheDocument();
  });

  it('appends dictated text to description via setValue', () => {
    render(
      <WorkOrderGeneralInfo
        values={{ title: '', priority: 'medium', description: 'Leak found' }}
        errors={{}}
        setValue={setValue}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Start voice input' }));

    expect(mockToggleListening).toHaveBeenCalledTimes(1);
    expect(setValue).toHaveBeenCalledWith('description', 'Leak found voice description');
  });
});
