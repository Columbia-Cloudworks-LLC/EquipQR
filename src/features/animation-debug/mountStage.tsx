import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Suspense, useLayoutEffect } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { installVirtualClock } from './virtualClock';
import { FRAME_MS, type StageSnapshot } from './protocol';

export async function mountStage() {
  const params = new URLSearchParams(location.search);
  const clock = installVirtualClock();
  // Repeatable replays, including state choice and GSAP's random stagger order.
  let randomSeed = Number(params.get('seed') ?? 1) || 1;
  Math.random = () => { randomSeed = (Math.imul(randomSeed, 1664525) + 1013904223) >>> 0; return randomSeed / 4294967296; };
  const events: string[] = [];
  const sendError = (error: unknown) => parent.postMessage({ type: 'animation-snapshot', time: clock.time, tracks: [], tweenTracks: [], tweens: 0, markers: [], events, error: String(error) }, location.origin);
  window.addEventListener('error', (event) => sendError(event.message));
  window.addEventListener('unhandledrejection', (event) => sendError(event.reason));
  try {
    // Import AFTER clock installation so GSAP and all phase schedulers share it.
    const [{ animationCatalog }, { HERO_SLIDES }, { ALL_STATE_CODES }, { gsap }] = await Promise.all([
      import('./catalog'), import('@/components/landing/hero-gallery/heroSlides'),
      import('@/components/landing/stateVectors'), import('gsap'),
    ]);
    await Promise.all(HERO_SLIDES.map((slide) => slide.preload()));
    const fixture = animationCatalog.find((entry) => entry.id === params.get('stage'));
    if (!fixture) throw new Error('Unknown animation. Select an animation from the catalog.');
    const state = ALL_STATE_CODES.find((code) => code === params.get('state')) ?? 'TX';
    gsap.ticker.lagSmoothing(0);
    const complete = () => { events.push(`${(clock.time / 1000).toFixed(3)}s · Sequence completed`); };
    document.documentElement.classList.add('dark');
    const root = createRoot(document.getElementById('root')!);
    let committed = false;
    let preparation = 0;
    function Ready() {
      useLayoutEffect(() => { committed = true; }, []);
      return null;
    }
    const renderStage = () => root.render(<MemoryRouter><Suspense key={preparation} fallback={<p>Loading animation…</p>}><div style={{ width: '100%', height: '100vh', overflow: 'auto' }}><fixture.Stage state={state} seed={Number(params.get('seed') ?? 1)} complete={complete} /><Ready /></div></Suspense></MemoryRouter>);
    flushSync(renderStage);
    // A resolved lazy import can remain behind React's fallback commit delay.
    // Remount only the uncommitted boundary, while time is still zero, until a
    // layout effect proves the actual fixture (not its fallback) has committed.
    for (let pass = 0; !committed && pass < 100; pass++) {
      await clock.settle();
      preparation++;
      flushSync(renderStage);
    }
    if (!committed) throw new Error('Animation did not finish loading. Please restart the stage.');
    await clock.settle();
    clock.captureAnimations();
    function report() {
      const tweens = gsap.globalTimeline.getChildren(true, true, false) as gsap.core.Tween[];
      const snapshot: StageSnapshot = {
        type: 'animation-snapshot', time: clock.time, tracks: clock.tracks(),
        tweens: tweens.length,
        tweenTracks: tweens.slice(0, 100).map((tween) => ({
          name: `GSAP · ${tween.targets().map((target) => target instanceof Element ? `${target.tagName.toLowerCase()}${target.id ? `#${target.id}` : ''}` : 'object').slice(0, 3).join(', ')}`,
          time: tween.totalTime() * 1000, duration: String(tween.duration() * 1000),
          state: tween.isActive() ? 'active' : 'waiting',
        })),
        markers: [...document.querySelectorAll('[data-testid]')].map((node) => node.getAttribute('data-testid')!).slice(0, 30),
        events: events.slice(-20),
      };
      parent.postMessage(snapshot, location.origin);
    }
    let busy = false;
    window.addEventListener('message', async (event) => {
      if (event.origin !== location.origin || event.source !== parent || event.data?.type !== 'animation-advance' || busy) return;
      const delta = Number(event.data.delta);
      if (!Number.isFinite(delta) || delta < 0 || delta > 1000) return;
      busy = true;
      try {
        let remaining = delta;
        while (remaining > 0.001) {
          clock.captureAnimations();
          const step = Math.min(FRAME_MS, remaining);
          flushSync(() => clock.tick(step));
          await clock.settle();
          clock.captureAnimations();
          remaining -= step;
        }
        report();
      } catch (error) { sendError(error); }
      finally { busy = false; }
    });
    report();
  } catch (error) { sendError(error); }
}
