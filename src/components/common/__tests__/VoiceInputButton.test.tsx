import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/utils/test-utils';
import VoiceInputButton from '@/components/common/VoiceInputButton';

describe('VoiceInputButton', () => {
  it('renders nothing when canUseVoice is false and not listening', () => {
    render(
      <VoiceInputButton
        isListening={false}
        onToggle={vi.fn()}
        canUseVoice={false}
      />
    );

    expect(screen.queryByRole('button', { name: /voice input/i })).not.toBeInTheDocument();
  });

  it('renders stop control when listening even if canUseVoice becomes false', () => {
    const onToggle = vi.fn();
    render(
      <VoiceInputButton
        isListening={true}
        onToggle={onToggle}
        canUseVoice={false}
      />
    );

    const button = screen.getByRole('button', { name: 'Stop voice input' });
    expect(button).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders start voice input button with aria-pressed false', () => {
    render(
      <VoiceInputButton
        isListening={false}
        onToggle={vi.fn()}
        canUseVoice={true}
      />
    );

    const button = screen.getByRole('button', { name: 'Start voice input' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Voice')).toBeInTheDocument();
  });

  it('renders stop voice input button with aria-pressed true', () => {
    render(
      <VoiceInputButton
        isListening={true}
        onToggle={vi.fn()}
        canUseVoice={true}
      />
    );

    const button = screen.getByRole('button', { name: 'Stop voice input' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Stop')).toBeInTheDocument();
  });

  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn();
    render(
      <VoiceInputButton
        isListening={false}
        onToggle={onToggle}
        canUseVoice={true}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Start voice input' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders icon-only variant for composer placement', () => {
    render(
      <VoiceInputButton
        isListening={false}
        onToggle={vi.fn()}
        canUseVoice={true}
        size="icon"
      />
    );

    expect(screen.getByRole('button', { name: 'Start voice input' })).toBeInTheDocument();
    expect(screen.queryByText('Voice')).not.toBeInTheDocument();
  });
});
