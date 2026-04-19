# Wrapper file contents

These two files live in `public/` and are served by Vite at the root of `localhost:8080`. Both are `.gitignore`d under `public/__*` so they never reach production. Recreate them from these canonical contents if missing or stale.

## `public/__mobile-frame.html`

Wraps any same-origin URL in a fixed-size iframe so the embedded page sees a true mobile viewport (`window.innerWidth`, matchMedia, etc. all reflect the iframe size). The iframe has `id="f"` so screenshots can target it with `ref="#f"`.

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Mobile Frame</title>
  <style>
    html,body{margin:0;padding:0;background:#000;height:100%;overflow:hidden}
    iframe{display:block;border:0;background:#fff}
  </style>
</head>
<body>
  <iframe id="f" src="" width="393" height="852"></iframe>
  <script>
    var p = new URLSearchParams(location.search);
    var w = parseInt(p.get('w') || '393', 10);
    var h = parseInt(p.get('h') || '852', 10);
    var url = p.get('url') || '/dashboard';
    var f = document.getElementById('f');
    f.width = w; f.height = h;
    f.src = url;
  </script>
</body>
</html>
```

Usage: `http://localhost:8080/__mobile-frame.html?url=/dashboard&w=393&h=852`.

Then capture with:

```json
{
  "viewId": "<localhost tab id>",
  "filename": "mobile-dashboard.png",
  "element": "mobile iframe",
  "ref": "#f"
}
```

## `public/__viewport-probe.html`

Diagnostic page that reports the viewport dimensions the browser actually presents. Use it (loaded inside the wrapper) to confirm a real mobile viewport before producing a final screenshot.

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Viewport probe</title>
  <style>
    html,body{margin:0;padding:0;background:#111;color:#fff;font-family:system-ui,sans-serif}
    body{padding:24px;font-size:24px;line-height:1.4}
    .row{padding:6px 0;border-bottom:1px solid #333}
    .label{color:#9ca3af;font-size:14px;text-transform:uppercase;letter-spacing:.05em}
    .val{font-weight:600;font-size:28px}
    @media (max-width: 767px){body{background:#7f1d1d}}
    @media (min-width: 768px) and (max-width: 1023px){body{background:#7c5e1d}}
    @media (min-width: 1024px){body{background:#14532d}}
  </style>
</head>
<body>
  <div class="row"><div class="label">window.innerWidth</div><div class="val" id="iw">…</div></div>
  <div class="row"><div class="label">window.innerHeight</div><div class="val" id="ih">…</div></div>
  <div class="row"><div class="label">devicePixelRatio</div><div class="val" id="dpr">…</div></div>
  <div class="row"><div class="label">documentElement.clientWidth</div><div class="val" id="dcw">…</div></div>
  <div class="row"><div class="label">screen.width × height</div><div class="val" id="sw">…</div></div>
  <div class="row"><div class="label">CSS media bucket</div><div class="val" id="bucket">…</div></div>
  <div class="row"><div class="label">user agent</div><div class="val" style="font-size:13px;word-break:break-all" id="ua">…</div></div>
  <script>
    function bucket(){
      if (window.matchMedia('(max-width: 767px)').matches) return 'mobile (<768)';
      if (window.matchMedia('(max-width: 1023px)').matches) return 'tablet (768-1023)';
      return 'desktop (>=1024)';
    }
    function update(){
      document.getElementById('iw').textContent = window.innerWidth;
      document.getElementById('ih').textContent = window.innerHeight;
      document.getElementById('dpr').textContent = window.devicePixelRatio;
      document.getElementById('dcw').textContent = document.documentElement.clientWidth;
      document.getElementById('sw').textContent = screen.width + ' × ' + screen.height;
      document.getElementById('bucket').textContent = bucket();
      document.getElementById('ua').textContent = navigator.userAgent;
    }
    update();
    window.addEventListener('resize', update);
  </script>
</body>
</html>
```

Pass/fail criteria when loaded inside `__mobile-frame.html?url=/__viewport-probe.html&w=393&h=852`:

- `window.innerWidth` reads **393** (matches `w` param)
- `documentElement.clientWidth` reads **393**
- "CSS MEDIA BUCKET" reads `mobile (<768)`
- Background is **red** (`#7f1d1d`)

If you see `1407` or `desktop (>=1024)`, the iframe wrapper isn't doing its job — re-write `__mobile-frame.html` from this file and re-navigate.
