/**
 * Browser-only QR scan success feedback: Web Audio synthesis + Vibration API.
 * Live camera scans mark a short-lived sessionStorage flag; QR redirect completion consumes it.
 */

export const PENDING_SCAN_FEEDBACK_STORAGE_KEY = 'equipqr_pending_scan_feedback';

/** Ignore markers older than this (ms) so abandoned flows do not surprise the user later. */
const PENDING_MARKER_MAX_AGE_MS = 60_000;

let sharedAudioContext: AudioContext | null = null;

function getAudioContextConstructor(): (typeof AudioContext) | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & { webkitAudioContext?: typeof AudioContext };
  return window.AudioContext ?? w.webkitAudioContext ?? null;
}

function ensureSharedContext(): AudioContext | null {
  try {
    const Ctor = getAudioContextConstructor();
    if (!Ctor) return null;
    if (!sharedAudioContext) {
      sharedAudioContext = new Ctor();
    }
    return sharedAudioContext;
  } catch {
    return null;
  }
}

/**
 * Call from a user gesture (e.g. "Start camera scan") to create/resume AudioContext
 * so a later scan can play without autoplay restrictions.
 */
export function prepareScanFeedback(): void {
  try {
    const ctx = ensureSharedContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
  } catch {
    /* no-op */
  }
}

export function markScanFeedbackPending(): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(
      PENDING_SCAN_FEEDBACK_STORAGE_KEY,
      JSON.stringify({ ts: Date.now() })
    );
  } catch {
    /* no-op */
  }
}

function readAndClearPendingMarker(): boolean {
  try {
    if (typeof sessionStorage === 'undefined') return false;
    const raw = sessionStorage.getItem(PENDING_SCAN_FEEDBACK_STORAGE_KEY);
    if (!raw) return false;
    sessionStorage.removeItem(PENDING_SCAN_FEEDBACK_STORAGE_KEY);
    const parsed = JSON.parse(raw) as { ts?: number };
    if (typeof parsed.ts !== 'number' || Number.isNaN(parsed.ts)) return false;
    if (Date.now() - parsed.ts > PENDING_MARKER_MAX_AGE_MS) return false;
    return true;
  } catch {
    return false;
  }
}

function triggerHaptic(): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([60, 30, 40]);
    }
  } catch {
    /* no-op */
  }
}

function playPing(ctx: AudioContext, onEnded?: () => void): void {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(1046.5, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(1318.51, ctx.currentTime + 0.08);

  gainNode.gain.setValueAtTime(0.35, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

  oscillator.onended = () => {
    onEnded?.();
  };

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.25);
}

/**
 * If a live camera scan set a pending marker, play haptic + ping. Safe to call on every redirect completion.
 */
export function triggerPendingScanFeedback(): void {
  try {
    if (!readAndClearPendingMarker()) return;
    triggerHaptic();

    prepareScanFeedback();

    let ctx = sharedAudioContext;
    let ephemeral: AudioContext | null = null;
    const Ctor = getAudioContextConstructor();

    if (!ctx && Ctor) {
      try {
        ephemeral = new Ctor();
        ctx = ephemeral;
      } catch {
        return;
      }
    }

    if (!ctx) return;

    const run = () => {
      try {
        const closeEphemeral = ephemeral !== null;
        playPing(ctx, closeEphemeral ? () => void ephemeral?.close().catch(() => undefined) : undefined);
      } catch {
        void ephemeral?.close().catch(() => undefined);
        if (ephemeral === null && ctx === sharedAudioContext) {
          sharedAudioContext = null;
        }
      }
    };

    if (ctx.state === 'suspended') {
      void ctx.resume().then(run).catch(() => undefined);
    } else {
      run();
    }
  } catch {
    /* no-op */
  }
}

/** Dev / critique: play the same ping without requiring a pending marker. */
export function playDirectScanFeedbackTone(): void {
  try {
    prepareScanFeedback();
    let ctx = sharedAudioContext;
    let ephemeral: AudioContext | null = null;
    const Ctor = getAudioContextConstructor();

    if (!ctx && Ctor) {
      try {
        ephemeral = new Ctor();
        ctx = ephemeral;
      } catch {
        return;
      }
    }
    if (!ctx) return;

    const run = () => {
      try {
        const closeEphemeral = ephemeral !== null;
        playPing(ctx, closeEphemeral ? () => void ephemeral?.close().catch(() => undefined) : undefined);
      } catch {
        void ephemeral?.close().catch(() => undefined);
        if (ephemeral === null && ctx === sharedAudioContext) {
          sharedAudioContext = null;
        }
      }
    };

    if (ctx.state === 'suspended') {
      void ctx.resume().then(run).catch(() => undefined);
    } else {
      run();
    }
  } catch {
    /* no-op */
  }
}

export function getScanFeedbackDebugInfo(): {
  webAudioSupported: boolean;
  contextState: AudioContextState | null;
  vibrationSupported: boolean;
} {
  const Ctor = typeof window !== 'undefined' ? getAudioContextConstructor() : null;
  return {
    webAudioSupported: Boolean(Ctor),
    contextState: sharedAudioContext?.state ?? null,
    vibrationSupported: typeof navigator !== 'undefined' && 'vibrate' in navigator,
  };
}

/** Test-only reset of module state and storage marker. */
export function resetScanFeedbackForTests(): void {
  try {
    void sharedAudioContext?.close().catch(() => undefined);
  } catch {
    /* no-op */
  }
  sharedAudioContext = null;
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(PENDING_SCAN_FEEDBACK_STORAGE_KEY);
    }
  } catch {
    /* no-op */
  }
}
