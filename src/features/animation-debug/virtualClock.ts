/** Installed only inside the disposable debug iframe, never in the app window. */
export function installVirtualClock() {
  const nativeTimeout = window.setTimeout.bind(window);
  const epoch = Date.now();
  let now = 0;
  let id = 0;
  const timers = new Map<number, { at: number; callback: () => void; interval?: number }>();
  const frames = new Map<number, FrameRequestCallback>();
  const animations = new Map<Animation, { start: number; iteration: number; started: boolean; ended: boolean }>();
  // Seeking a paused CSS animation can enqueue native events on the real render
  // clock (including spurious iteration events when resetting to zero). Deliver
  // lifecycle events from virtual time instead, so React advances exactly once.
  for (const type of ['animationstart', 'animationiteration', 'animationend', 'transitionrun', 'transitionstart', 'transitionend']) {
    document.addEventListener(type, (event) => {
      if (event.isTrusted) event.stopImmediatePropagation();
    }, true);
  }

  function emit(animation: Animation, type: string, elapsed: number) {
    const target = (animation.effect as KeyframeEffect | null)?.target;
    if (!target) return;
    const event = new Event(type, { bubbles: true });
    Object.assign(event, {
      animationName: 'animationName' in animation ? animation.animationName : '',
      propertyName: 'transitionProperty' in animation ? animation.transitionProperty : '',
      elapsedTime: elapsed / 1000,
      pseudoElement: (animation.effect as KeyframeEffect | null)?.pseudoElement ?? '',
    });
    target.dispatchEvent(event);
  }
  const schedule = (callback: TimerHandler, delay = 0, args: unknown[] = [], interval?: number) => {
    if (typeof callback !== 'function') throw new Error('String timers are not supported in the animation lab.');
    const key = ++id;
    timers.set(key, { at: now + Math.max(1, delay), callback: () => callback(...args), interval });
    return key;
  };
  window.setTimeout = ((callback: TimerHandler, delay?: number, ...args: unknown[]) => schedule(callback, delay, args)) as typeof window.setTimeout;
  window.setInterval = ((callback: TimerHandler, delay = 0, ...args: unknown[]) => schedule(callback, delay, args, Math.max(1, delay))) as typeof window.setInterval;
  window.clearTimeout = window.clearInterval = (key?: unknown) => { if (typeof key === 'number') timers.delete(key); };
  window.requestAnimationFrame = (callback) => { frames.set(++id, callback); return id; };
  window.cancelAnimationFrame = (key) => { frames.delete(key); };
  Date.now = () => epoch + now;
  Object.defineProperty(performance, 'now', { configurable: true, value: () => now });

  function captureAnimations() {
    for (const animation of document.getAnimations()) {
      if (!animations.has(animation)) {
        animations.set(animation, { start: now, iteration: 0, started: false, ended: false });
        animation.pause();
        animation.currentTime = 0;
      }
    }
    for (const [animation, playback] of animations) {
      const target = (animation.effect as KeyframeEffect | null)?.target;
      if (animation.playState === 'idle' || (target && !target.isConnected)) { animations.delete(animation); continue; }
      animation.currentTime = now - playback.start;
      const timing = animation.effect?.getTiming();
      if (!timing || typeof timing.duration !== 'number') continue;
      // Repeated 1/60-second steps can land microscopically below a boundary.
      const activeTime = Math.round((now - playback.start - (timing.delay ?? 0)) * 1e6) / 1e6;
      const duration = timing.duration;
      const iterations = timing.iterations ?? 1;
      const isCss = 'animationName' in animation;
      const isTransition = 'transitionProperty' in animation;
      if (activeTime >= 0 && !playback.started) {
        playback.started = true;
        playback.iteration = Math.floor(timing.iterationStart ?? 0);
        if (isCss) emit(animation, 'animationstart', Math.max(0, -(timing.delay ?? 0)));
        if (isTransition) { emit(animation, 'transitionrun', 0); emit(animation, 'transitionstart', 0); }
      }
      if (activeTime < 0) continue;
      const lastIteration = Math.min(
        Math.floor(activeTime / Math.max(duration, 1) + (timing.iterationStart ?? 0)),
        Math.ceil(iterations + (timing.iterationStart ?? 0)) - 1,
      );
      while (isCss && duration > 0 && playback.iteration < lastIteration) {
        playback.iteration++;
        emit(animation, 'animationiteration', (playback.iteration - (timing.iterationStart ?? 0)) * duration);
      }
      if (!playback.ended && Number.isFinite(iterations) && activeTime >= duration * iterations) {
        playback.ended = true;
        if (isCss) emit(animation, 'animationend', duration * iterations);
        if (isTransition) emit(animation, 'transitionend', duration);
        // Also settle Web Animations API `finished` promises for future fixtures.
        animation.finish();
      }
    }
  }

  return {
    get time() { return now; },
    settle: () => new Promise<void>((resolve) => nativeTimeout(resolve, 0)),
    captureAnimations,
    tick(delta: number) {
      now += delta;
      // Snapshot queues: callbacks scheduled inside a frame run on the next frame.
      const due = [...timers.entries()].filter(([, timer]) => timer.at <= now).sort((a, b) => a[1].at - b[1].at);
      const pendingFrames = [...frames.entries()];
      for (const [key, timer] of due) {
        if (!timers.has(key)) continue;
        if (timer.interval) timer.at += timer.interval;
        else timers.delete(key);
        timer.callback();
      }
      for (const [key, callback] of pendingFrames) {
        if (!frames.has(key)) continue;
        frames.delete(key);
        callback(now);
      }
    },
    tracks() {
      return [...animations.keys()].map((animation) => ({
        name: 'animationName' in animation ? String(animation.animationName)
          : 'transitionProperty' in animation ? String(animation.transitionProperty) : 'Web animation',
        time: Number(animation.currentTime ?? 0),
        duration: String(animation.effect?.getTiming().duration ?? 0),
        state: animation.playState,
      }));
    },
  };
}
