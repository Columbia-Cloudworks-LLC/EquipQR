import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@vitest-harness/utils/test-utils';
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

  it('applies positioning className for overlay placement', () => {
    render(
      <VoiceInputButton
        isListening={false}
        onToggle={vi.fn()}
        canUseVoice={true}
        className="absolute bottom-2 left-2"
      />
    );

    const button = screen.getByRole('button', { name: 'Start voice input' });
    expect(button.className).toContain('bottom-2');
    expect(button.className).toContain('left-2');
  });
});
