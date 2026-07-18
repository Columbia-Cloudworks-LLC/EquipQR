import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { appendSpeechTranscript, useVoiceTextAppender } from '@/hooks/useVoiceTextAppender';

const mockToggleListening = vi.fn();
const mockStopListening = vi.fn();
const mockUseSpeechToText = vi.fn();

let mockIsListening = false;

vi.mock('@/hooks/useSpeechToText', () => ({
  useSpeechToText: (options: { onResult: (transcript: string) => void }) => {
    mockUseSpeechToText(options);
    return {
      isSupported: true,
      get isListening() {
        return mockIsListening;
      },
      error: null,
      interimTranscript: '',
      startListening: vi.fn(),
      stopListening: mockStopListening,
      toggleListening: mockToggleListening,
    };
  },
}));

describe('appendSpeechTranscript', () => {
  it('returns current value when transcript is empty or whitespace', () => {
    expect(appendSpeechTranscript('hello', '')).toBe('hello');
    expect(appendSpeechTranscript('hello', '   ')).toBe('hello');
  });

  it('appends transcript to empty value without leading space', () => {
    expect(appendSpeechTranscript('', ' dictated ')).toBe('dictated');
  });

  it('appends transcript with a single space separator when value is non-empty', () => {
    expect(appendSpeechTranscript('Existing note', 'new words')).toBe('Existing note new words');
  });

  it('trims trailing whitespace from existing value before appending', () => {
    expect(appendSpeechTranscript('Existing note ', 'new words')).toBe('Existing note new words');
  });
});

describe('useVoiceTextAppender', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsListening = false;
  });

  it('forwards speech results to onChange with append semantics', () => {
    const onChange = vi.fn();

    renderHook(() =>
      useVoiceTextAppender({
        value: 'Start',
        onChange,
      })
    );

    const { onResult } = mockUseSpeechToText.mock.calls[0][0];
    act(() => {
      onResult('more text');
    });

    expect(onChange).toHaveBeenCalledWith('Start more text');
  });

  it('uses latest value via refs when speech result arrives later', () => {
    const onChange = vi.fn();

    const { rerender } = renderHook(
      ({ value }) =>
        useVoiceTextAppender({
          value,
          onChange,
        }),
      { initialProps: { value: 'First' } }
    );

    rerender({ value: 'Second' });

    const { onResult } = mockUseSpeechToText.mock.calls.at(-1)![0];
    act(() => {
      onResult('third');
    });

    expect(onChange).toHaveBeenCalledWith('Second third');
  });

  it('sets canUseVoice false when disabled or readOnly', () => {
    const onChange = vi.fn();

    const { result: disabledResult } = renderHook(() =>
      useVoiceTextAppender({
        value: '',
        onChange,
        disabled: true,
      })
    );
    expect(disabledResult.current.canUseVoice).toBe(false);

    const { result: readOnlyResult } = renderHook(() =>
      useVoiceTextAppender({
        value: '',
        onChange,
        readOnly: true,
      })
    );
    expect(readOnlyResult.current.canUseVoice).toBe(false);
  });

  it('sets canUseVoice true when supported and enabled', () => {
    const onChange = vi.fn();

    const { result } = renderHook(() =>
      useVoiceTextAppender({
        value: '',
        onChange,
      })
    );

    expect(result.current.canUseVoice).toBe(true);

    act(() => {
      result.current.toggleListening();
    });

    expect(mockToggleListening).toHaveBeenCalledTimes(1);
  });

  it('stops listening when disabled or readOnly becomes true', () => {
    const onChange = vi.fn();
    mockIsListening = true;

    const { rerender } = renderHook(
      ({ disabled, readOnly }: { disabled?: boolean; readOnly?: boolean }) =>
        useVoiceTextAppender({
          value: '',
          onChange,
          disabled,
          readOnly,
        }),
      { initialProps: { disabled: false, readOnly: false } }
    );

    expect(mockStopListening).not.toHaveBeenCalled();

    rerender({ disabled: true, readOnly: false });
    expect(mockStopListening).toHaveBeenCalledTimes(1);

    mockStopListening.mockClear();
    mockIsListening = true;
    rerender({ disabled: false, readOnly: true });
    expect(mockStopListening).toHaveBeenCalledTimes(1);
  });

  it('allows stop but blocks start when disabled or readOnly', () => {
    const onChange = vi.fn();

    mockIsListening = true;
    const { result: listeningResult } = renderHook(() =>
      useVoiceTextAppender({
        value: '',
        onChange,
        disabled: true,
      })
    );

    // Mount effect also stops when disabled + listening; isolate toggle behavior.
    mockStopListening.mockClear();

    act(() => {
      listeningResult.current.toggleListening();
    });

    expect(mockStopListening).toHaveBeenCalledTimes(1);
    expect(mockToggleListening).not.toHaveBeenCalled();

    mockStopListening.mockClear();
    mockIsListening = false;

    const { result: idleResult } = renderHook(() =>
      useVoiceTextAppender({
        value: '',
        onChange,
        readOnly: true,
      })
    );

    act(() => {
      idleResult.current.toggleListening();
    });

    expect(mockStopListening).not.toHaveBeenCalled();
    expect(mockToggleListening).not.toHaveBeenCalled();
  });
});
