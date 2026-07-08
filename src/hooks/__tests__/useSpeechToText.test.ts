import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpeechToText } from '@/hooks/useSpeechToText';

class MockSpeechRecognition {
  static instances: MockSpeechRecognition[] = [];

  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  lang = '';
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  onstart: (() => void) | null = null;

  start = vi.fn(() => {
    this.onstart?.();
  });
  stop = vi.fn(() => {
    this.onend?.();
  });
  abort = vi.fn();

  constructor() {
    MockSpeechRecognition.instances.push(this);
  }
}

const mockGetUserMedia = vi.fn();
const mockStopTrack = vi.fn();

function grantMicPermission() {
  mockGetUserMedia.mockResolvedValue({
    getTracks: () => [{ stop: mockStopTrack }],
  });
}

function denyMicPermission() {
  mockGetUserMedia.mockRejectedValue(
    new DOMException('Permission denied', 'NotAllowedError')
  );
}

describe('useSpeechToText microphone consent flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockSpeechRecognition.instances = [];
    vi.stubGlobal('SpeechRecognition', MockSpeechRecognition);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: mockGetUserMedia },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests microphone consent before starting recognition and releases the stream', async () => {
    grantMicPermission();
    const { result } = renderHook(() =>
      useSpeechToText({ onResult: vi.fn() })
    );

    await act(async () => {
      await result.current.startListening();
    });

    expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(mockStopTrack).toHaveBeenCalled();
    expect(MockSpeechRecognition.instances).toHaveLength(1);
    expect(MockSpeechRecognition.instances[0].start).toHaveBeenCalled();
    expect(result.current.isListening).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('surfaces a retryable error and skips recognition when consent is denied', async () => {
    denyMicPermission();
    const { result } = renderHook(() =>
      useSpeechToText({ onResult: vi.fn() })
    );

    await act(async () => {
      await result.current.startListening();
    });

    expect(result.current.error).toMatch(/microphone access was denied/i);
    expect(result.current.isListening).toBe(false);
    expect(MockSpeechRecognition.instances).toHaveLength(0);
  });

  it('re-runs the consent process on each start attempt after a denial', async () => {
    denyMicPermission();
    const { result } = renderHook(() =>
      useSpeechToText({ onResult: vi.fn() })
    );

    await act(async () => {
      await result.current.startListening();
    });
    expect(mockGetUserMedia).toHaveBeenCalledTimes(1);

    // User re-clicks after allowing access in the browser prompt
    grantMicPermission();
    await act(async () => {
      await result.current.startListening();
    });

    expect(mockGetUserMedia).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
    expect(result.current.isListening).toBe(true);
  });

  it('falls back to recognition-managed permissions when mediaDevices is unavailable', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: undefined,
    });
    const { result } = renderHook(() =>
      useSpeechToText({ onResult: vi.fn() })
    );

    await act(async () => {
      await result.current.startListening();
    });

    expect(MockSpeechRecognition.instances).toHaveLength(1);
    expect(result.current.isListening).toBe(true);
  });

  it('reports a friendly message when no microphone hardware is found', async () => {
    mockGetUserMedia.mockRejectedValue(
      new DOMException('No device', 'NotFoundError')
    );
    const { result } = renderHook(() =>
      useSpeechToText({ onResult: vi.fn() })
    );

    await act(async () => {
      await result.current.startListening();
    });

    expect(result.current.error).toMatch(/no microphone was found/i);
    expect(result.current.isListening).toBe(false);
  });

  it('allows retry after recognition.start() throws synchronously', async () => {
    grantMicPermission();
    let shouldThrow = true;
    class ThrowingOnceSpeechRecognition extends MockSpeechRecognition {
      start = vi.fn(() => {
        if (shouldThrow) {
          shouldThrow = false;
          throw new Error('already started');
        }
        this.onstart?.();
      });
    }
    vi.stubGlobal('SpeechRecognition', ThrowingOnceSpeechRecognition);

    const { result } = renderHook(() =>
      useSpeechToText({ onResult: vi.fn() })
    );

    await act(async () => {
      await result.current.startListening();
    });
    expect(result.current.error).toMatch(/failed to start/i);
    expect(result.current.isListening).toBe(false);

    // The failed instance must not block the next attempt.
    await act(async () => {
      await result.current.startListening();
    });
    expect(result.current.error).toBeNull();
    expect(result.current.isListening).toBe(true);
  });

  it('ignores re-entrant start clicks while the consent prompt is open', async () => {
    let resolveConsent: (value: { getTracks: () => { stop: () => void }[] }) => void;
    mockGetUserMedia.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveConsent = resolve;
        })
    );
    const { result } = renderHook(() =>
      useSpeechToText({ onResult: vi.fn() })
    );

    let firstStart: Promise<void>;
    act(() => {
      firstStart = result.current.startListening();
      void result.current.startListening();
    });

    await act(async () => {
      resolveConsent!({ getTracks: () => [{ stop: mockStopTrack }] });
      await firstStart;
    });

    expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
    expect(MockSpeechRecognition.instances).toHaveLength(1);
  });
});
