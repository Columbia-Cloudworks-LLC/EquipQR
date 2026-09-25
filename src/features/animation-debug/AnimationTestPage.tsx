import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { animationCatalog } from './catalog';
import { ALL_STATE_CODES } from '@/components/landing/stateVectors';
import { FRAME_MS, type StageSnapshot } from './protocol';

const fieldClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

export default function AnimationTestPage() {
  const initial = new URLSearchParams(location.search).get('animation');
  const [selected, setSelected] = useState(animationCatalog.find((entry) => entry.id === initial)?.id ?? animationCatalog[0].id);
  const [state, setState] = useState('TX');
  const [seed, setSeed] = useState(1);
  const [width, setWidth] = useState(480);
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [snapshot, setSnapshot] = useState<StageSnapshot | null>(null);
  const [target, setTarget] = useState(0);
  const [seekInput, setSeekInput] = useState('0');
  const iframe = useRef<HTMLIFrameElement>(null);
  const busy = useRef(false);
  const lastPlaybackTick = useRef<number | null>(null);
  const fixture = animationCatalog.find((entry) => entry.id === selected)!;
  const time = snapshot?.time ?? 0;

  function restart(nextTarget = 0) {
    setPlaying(false);
    lastPlaybackTick.current = null;
    setSnapshot(null);
    busy.current = false;
    setTarget(nextTarget);
    setGeneration((value) => value + 1);
  }

  const advance = useCallback((delta: number) => {
    if (busy.current || !iframe.current?.contentWindow || !snapshot || snapshot.error) return;
    busy.current = true;
    iframe.current.contentWindow.postMessage({ type: 'animation-advance', delta }, location.origin);
  }, [snapshot]);

  useEffect(() => {
    function receive(event: MessageEvent<StageSnapshot>) {
      if (event.origin !== location.origin || event.source !== iframe.current?.contentWindow || event.data?.type !== 'animation-snapshot') return;
      busy.current = false;
      setSnapshot(event.data);
    }
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);

  useEffect(() => {
    if (!snapshot || snapshot.error) return;
    const remaining = target - snapshot.time;
    if (remaining > 0.1) {
      const id = window.setTimeout(() => advance(Math.min(1000, remaining)), 0);
      return () => window.clearTimeout(id);
    }
    if (playing) {
      const id = window.requestAnimationFrame((now) => {
        const elapsed = lastPlaybackTick.current === null ? FRAME_MS : Math.min(100, now - lastPlaybackTick.current);
        lastPlaybackTick.current = now;
        advance(elapsed * speed);
      });
      return () => window.cancelAnimationFrame(id);
    }
    lastPlaybackTick.current = null;
  }, [snapshot, target, playing, speed, advance]);

  function seek(next: number) {
    if (!Number.isFinite(next)) return;
    const clamped = Math.max(0, Math.min(120000, next));
    setPlaying(false);
    if (clamped < time) restart(clamped);
    else setTarget(clamped);
  }

  const source = `/debug/animation-test?${new URLSearchParams({ stage: selected, state, seed: String(seed), run: String(generation) })}`;
  const seeking = target - time > 0.1;

  return <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">EquipQR · Preview tools</p><h1 className="text-3xl font-bold tracking-tight">Animation lab</h1><p className="mt-2 text-sm text-muted-foreground">Pause, inspect, and replay every move. Start with a story or isolate a single phase.</p></div>
        <div className="flex items-center gap-4"><span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">Excluded from production</span><Link to="/" className="text-sm underline">Back to app</Link></div>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-5 rounded-xl border bg-card p-5">
          <label className="block space-y-2 text-sm font-medium"><span>Animation · {animationCatalog.length} fixtures</span><select aria-label="Animation" className={fieldClass} value={selected} onChange={(event) => { setSelected(event.target.value); restart(); history.replaceState(null, '', `?animation=${encodeURIComponent(event.target.value)}`); }}>{[...new Set(animationCatalog.map((entry) => entry.group))].map((group) => <optgroup key={group} label={group}>{animationCatalog.filter((entry) => entry.group === group).map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</optgroup>)}</select></label>
          <p className="text-sm leading-relaxed text-muted-foreground">{fixture.description}</p>
          <label className="block space-y-2 text-sm"><span>State · isolated map phases</span><select className={fieldClass} value={state} onChange={(event) => { setState(event.target.value); restart(); }}>{ALL_STATE_CODES.map((code) => <option key={code}>{code}</option>)}</select></label>
          <label className="block space-y-2 text-sm"><span>Random seed / variant</span><input className={fieldClass} type="number" min="0" max="99999" value={seed} onChange={(event) => { setSeed(Math.max(0, Math.min(99999, Number(event.target.value)))); restart(); }} /></label>
          <label className="block space-y-2 text-sm"><span>Stage width</span><select className={fieldClass} value={width} onChange={(event) => { setWidth(Number(event.target.value)); restart(); }}><option value={320}>Mobile · 320 px</option><option value={480}>Default · 480 px</option><option value={768}>Wide · 768 px</option></select></label>
          <p className="text-xs leading-relaxed text-muted-foreground">Your system’s reduced-motion preference is respected. Replay uses the same seed. Future hero stories appear here automatically.</p>
        </aside>
        <section className="min-w-0 space-y-4" aria-label="Animation player">
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3"><h2 className="text-sm font-semibold">{fixture.label}</h2><output aria-label="Playback status" className="text-xs text-muted-foreground">{snapshot?.error ? 'Error' : !snapshot ? 'Loading…' : seeking ? 'Seeking…' : playing ? 'Playing' : 'Paused'}</output></div>
            <div className="flex min-h-80 justify-center overflow-hidden bg-muted/20 p-3 sm:p-6"><iframe key={source} ref={iframe} src={source} title="Animation test stage" className="max-w-full rounded-lg border bg-background" style={{ width, aspectRatio: '1 / 1' }} /></div>
            {snapshot?.error && <p role="alert" className="px-5 py-3 text-sm text-destructive">{snapshot.error}</p>}
            <div className="space-y-4 border-t p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Button disabled={!snapshot || Boolean(snapshot.error) || seeking} onClick={() => setPlaying(!playing)}>{playing ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}{playing ? 'Pause' : 'Play'}</Button>
                <Button variant="outline" onClick={() => restart()}><RotateCcw className="mr-2 h-4 w-4" />Restart</Button>
                <Button variant="outline" disabled={!snapshot || playing || seeking || time < FRAME_MS} onClick={() => seek(time - FRAME_MS)}><SkipBack className="mr-2 h-4 w-4" />Back one frame</Button>
                <Button variant="outline" disabled={!snapshot || playing || seeking} onClick={() => advance(FRAME_MS)}><SkipForward className="mr-2 h-4 w-4" />Step one frame</Button>
                <label className="flex items-center gap-2 text-sm">Speed<select aria-label="Playback speed" className="h-10 rounded border bg-background px-2" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>{[0.1, 0.25, 0.5, 1, 2].map((value) => <option key={value} value={value}>{value}×</option>)}</select></label>
              </div>
              <div className="flex flex-wrap items-center gap-3"><output aria-label="Elapsed time" className="font-mono text-lg tabular-nums">{(time / 1000).toFixed(3)} s</output><span className="text-xs text-muted-foreground">Frame {Math.round(time / FRAME_MS)} · 60 fps stepping</span><form className="ml-auto flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); seek(Number(seekInput) * 1000); }}><label className="text-sm" htmlFor="seek-time">Seek to (s)</label><input id="seek-time" type="number" min="0" max="120" step="0.1" className="h-9 w-20 rounded border bg-background px-2 text-sm" value={seekInput} onChange={(event) => setSeekInput(event.target.value)} /><Button variant="secondary" size="sm" disabled={!snapshot || seeking}>Go</Button></form></div>
              <p className="text-xs text-muted-foreground">Backward steps replay from the beginning to preserve timers and phase changes. Seek up to 120 seconds.</p>
            </div>
          </div>
          <details className="rounded-xl border bg-card p-5" open><summary className="cursor-pointer text-sm font-semibold">Inspect this frame · {snapshot?.tracks.length ?? 0} browser tracks · {snapshot?.tweens ?? 0} GSAP tweens</summary><div className="mt-4 max-h-64 overflow-auto text-xs"><table className="w-full text-left"><thead><tr><th className="pb-2">Animation / transition</th><th>Time (ms)</th><th>Duration (ms)</th></tr></thead><tbody>{[...(snapshot?.tracks ?? []), ...(snapshot?.tweenTracks ?? [])].map((track, index) => <tr key={`${track.name}-${index}`} className="border-t"><td className="py-2">{track.name}</td><td>{track.time.toFixed(1)}</td><td>{track.duration}</td></tr>)}</tbody></table><p className="mt-3 break-words text-muted-foreground">Mounted: {snapshot?.markers.join(' · ') || 'No named markers'}</p><p className="mt-3 text-muted-foreground">{snapshot?.events.join(' / ') || 'No completion events yet.'}</p></div></details>
        </section>
      </div>
    </div>
  </main>;
}
