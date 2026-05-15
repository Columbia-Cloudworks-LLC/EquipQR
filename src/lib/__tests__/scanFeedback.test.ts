import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PENDING_SCAN_FEEDBACK_STORAGE_KEY,
  getScanFeedbackDebugInfo,
  markScanFeedbackPending,
  playDirectScanFeedbackTone,
  prepareScanFeedback,
  resetScanFeedbackForTests,
  triggerPendingScanFeedback,
} from '@/lib/scanFeedback';

describe('scanFeedback', () => {
  const audioInstances: MockAudioContext[] = [];
  let oscillatorOnEnded: (() => void) | null;

  class MockAudioContext {
    state: AudioContextState = 'suspended';
    currentTime = 0;
    destination = {} as AudioDestinationNode;
    resume = vi.fn(async () => {
      this.state = 'running';
    });
    close = vi.fn(async () => Promise.resolve());
    createOscillator = vi.fn(() => {
      const osc = {
        type: 'sine' as OscillatorType,
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        frequency: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        set onended(fn: (() => void) | null) {
          oscillatorOnEnded = fn;
        },
        get onended() {
          return oscillatorOnEnded;
        },
      };
      return osc as unknown as OscillatorNode;
    });
    createGain = vi.fn(() => {
      const gain = {
        connect: vi.fn(),
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
      };
      return gain as unknown as GainNode;
    });

    constructor() {
      audioInstances.push(this);
    }
  }

  beforeEach(() => {
    oscillatorOnEnded = null;
    audioInstances.length = 0;
    resetScanFeedbackForTests();
    vi.stubGlobal('AudioContext', MockAudioContext);
    vi.stubGlobal('navigator', { ...navigator, vibrate: undefined as typeof navigator.vibrate });
  });

  afterEach(() => {
    resetScanFeedbackForTests();
    vi.unstubAllGlobals();
  });

  it('prepareScanFeedback creates one shared AudioContext and resumes when suspended', () => {
    prepareScanFeedback();
    expect(audioInstances).toHaveLength(1);
    expect(audioInstances[0].resume).toHaveBeenCalledTimes(1);
    expect(audioInstances[0].state).toBe('running');

    audioInstances[0].state = 'suspended';
    prepareScanFeedback();
    expect(audioInstances).toHaveLength(1);
    expect(audioInstances[0].resume).toHaveBeenCalledTimes(2);
  });

  it('prepareScanFeedback is a no-op when AudioContext is missing', () => {
    vi.unstubAllGlobals();
    delete (globalThis as { AudioContext?: unknown }).AudioContext;
    expect(() => prepareScanFeedback()).not.toThrow();
  });

  it('triggerPendingScanFeedback does nothing without a marker', () => {
    prepareScanFeedback();
    audioInstances[0].state = 'running';

    const vibrate = vi.fn();
    vi.stubGlobal('navigator', { ...navigator, vibrate });

    triggerPendingScanFeedback();
    expect(vibrate).not.toHaveBeenCalled();
    expect(audioInstances[0].createOscillator).not.toHaveBeenCalled();
  });

  it('triggerPendingScanFeedback vibrates and plays ping when marker is fresh', async () => {
    prepareScanFeedback();
    const ctx = audioInstances[0];
    ctx.state = 'running';
    ctx.resume.mockClear();

    const vibrate = vi.fn();
    vi.stubGlobal('navigator', { ...navigator, vibrate });

    markScanFeedbackPending();
    expect(sessionStorage.getItem(PENDING_SCAN_FEEDBACK_STORAGE_KEY)).not.toBeNull();

    triggerPendingScanFeedback();

    expect(sessionStorage.getItem(PENDING_SCAN_FEEDBACK_STORAGE_KEY)).toBeNull();
    expect(vibrate).toHaveBeenCalledWith([60, 30, 40]);
    expect(ctx.createOscillator).toHaveBeenCalled();
    expect(ctx.createGain).toHaveBeenCalled();
  });

  it('ignores stale pending markers', () => {
    prepareScanFeedback();
    audioInstances[0].state = 'running';

    const vibrate = vi.fn();
    vi.stubGlobal('navigator', { ...navigator, vibrate });

    sessionStorage.setItem(
      PENDING_SCAN_FEEDBACK_STORAGE_KEY,
      JSON.stringify({ ts: Date.now() - 120_000 })
    );

    triggerPendingScanFeedback();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('clears shared AudioContext when playPing throws on shared context', () => {
    prepareScanFeedback();
    const ctx = audioInstances[0];
    ctx.state = 'running';

    const vibrate = vi.fn();
    vi.stubGlobal('navigator', { ...navigator, vibrate });

    markScanFeedbackPending();

    ctx.createOscillator.mockImplementationOnce(() => {
      throw new Error('playPing fail');
    });

    triggerPendingScanFeedback();

    expect(vibrate).toHaveBeenCalled();
    expect(getScanFeedbackDebugInfo().contextState).toBeNull();

    prepareScanFeedback();
    expect(audioInstances.length).toBe(2);
  });

  it('playDirectScanFeedbackTone clears shared context when playPing throws', () => {
    prepareScanFeedback();
    const ctx = audioInstances[0];
    ctx.state = 'running';

    ctx.createOscillator.mockImplementationOnce(() => {
      throw new Error('playPing fail');
    });

    playDirectScanFeedbackTone();

    expect(getScanFeedbackDebugInfo().contextState).toBeNull();
    prepareScanFeedback();
    expect(audioInstances.length).toBe(2);
  });

  it('playDirectScanFeedbackTone plays without session marker', () => {
    prepareScanFeedback();
    audioInstances[0].state = 'running';
    const createOscillatorCalls = audioInstances[0].createOscillator.mock.calls.length;

    playDirectScanFeedbackTone();
    expect(audioInstances[0].createOscillator.mock.calls.length).toBeGreaterThan(createOscillatorCalls);
  });
});
