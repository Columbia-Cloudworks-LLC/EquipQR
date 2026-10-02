// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installVirtualClock } from './virtualClock';

const original = {
  setTimeout: window.setTimeout, clearTimeout: window.clearTimeout,
  setInterval: window.setInterval, clearInterval: window.clearInterval,
  requestAnimationFrame: window.requestAnimationFrame, cancelAnimationFrame: window.cancelAnimationFrame,
};
const dateNow = Date.now;
const performanceNow = Object.getOwnPropertyDescriptor(performance, 'now');

afterEach(() => {
  Object.assign(window, original);
  Date.now = dateNow;
  if (performanceNow) Object.defineProperty(performance, 'now', performanceNow);
  else Reflect.deleteProperty(performance, 'now');
  vi.restoreAllMocks();
});

describe('isolated animation clock', () => {
  it('freezes timers until stepped, cancels them, and queues newly requested frames', () => {
    const clock = installVirtualClock();
    const completed = vi.fn();
    const cancelled = vi.fn();
    window.setTimeout(completed, 100);
    window.clearTimeout(window.setTimeout(cancelled, 20));
    const frames: number[] = [];
    window.requestAnimationFrame((time) => {
      frames.push(time);
      window.requestAnimationFrame((next) => frames.push(next));
    });
    expect(completed).not.toHaveBeenCalled();
    clock.tick(50);
    expect(frames).toEqual([50]);
    expect(completed).not.toHaveBeenCalled();
    clock.tick(50);
    expect(frames).toEqual([50, 100]);
    expect(completed).toHaveBeenCalledOnce();
    expect(cancelled).not.toHaveBeenCalled();
    expect(performance.now()).toBe(100);
  });

  it('supports self-cancelling intervals', () => {
    const clock = installVirtualClock();
    let count = 0;
    const interval = window.setInterval(() => { count++; window.clearInterval(interval); }, 10);
    clock.tick(10);
    clock.tick(20);
    expect(count).toBe(1);
  });

  it('runs due timers in deadline order, regardless of registration order', () => {
    const clock = installVirtualClock();
    const order: number[] = [];
    window.setTimeout(() => order.push(10), 10);
    window.setTimeout(() => order.push(5), 5);
    clock.tick(16);
    expect(order).toEqual([5, 10]);
  });

  it('pauses CSS animations and gives newly mounted tracks their own start time', () => {
    const clock = installVirtualClock();
    const target = document.createElement('div');
    document.body.appendChild(target);
    const animation = { pause: vi.fn(), currentTime: 25, animationName: 'reveal', playState: 'paused', effect: { target, getTiming: () => ({ duration: 300 }) } };
    const getAnimations = vi.fn(() => [] as unknown as Animation[]);
    Object.defineProperty(document, 'getAnimations', { configurable: true, value: getAnimations });
    clock.tick(100);
    getAnimations.mockReturnValue([animation as unknown as Animation]);
    clock.captureAnimations();
    expect(animation.pause).toHaveBeenCalledOnce();
    expect(animation.currentTime).toBe(0);
    clock.tick(50);
    clock.captureAnimations();
    expect(animation.currentTime).toBe(50);
    target.remove();
    clock.captureAnimations();
    expect(clock.tracks()).toEqual([]);
    Reflect.deleteProperty(document, 'getAnimations');
  });

  it('delivers CSS iteration and completion on the virtual clock exactly once', () => {
    const clock = installVirtualClock();
    const target = document.createElement('div');
    document.body.appendChild(target);
    const iteration = vi.fn();
    const end = vi.fn();
    target.addEventListener('animationiteration', iteration);
    target.addEventListener('animationend', end);
    const animation = { pause: vi.fn(), finish: vi.fn(), currentTime: 0, animationName: 'scan', playState: 'paused', effect: { target, getTiming: () => ({ duration: 100, iterations: 2, delay: 0 }) } };
    Object.defineProperty(document, 'getAnimations', { configurable: true, value: () => [animation] });
    clock.captureAnimations();
    expect(iteration).not.toHaveBeenCalled();
    clock.tick(100);
    clock.captureAnimations();
    expect(iteration).toHaveBeenCalledOnce();
    expect(iteration.mock.calls[0][0].elapsedTime).toBe(0.1);
    clock.tick(100);
    clock.captureAnimations();
    clock.captureAnimations();
    expect(iteration).toHaveBeenCalledOnce();
    expect(end).toHaveBeenCalledOnce();
    expect(animation.finish).toHaveBeenCalledOnce();
    target.remove();
    Reflect.deleteProperty(document, 'getAnimations');
  });
});
