# Method A — Playwright MCP (primary)

This is the preferred method. The Playwright MCP (`user-playwright-recording`) gives you a real Chromium with full Chrome DevTools Protocol access, so the page genuinely believes it's a phone — `window.innerWidth = 393`, `matchMedia('(max-width: 767px)')` matches, `useIsMobile()` returns `true`, and you can also crank DPR to 3, enable touch, and set an iPhone user agent for full-fidelity emulation.

Key tools used (all on the `user-playwright-recording` server):

- `browser_navigate` — page.goto()
- `browser_resize` — page.setViewportSize() (this one **does** work, unlike Cursor's)
- `browser_evaluate` — page.evaluate(), returns serialized result
- `browser_run_code` — execute arbitrary `async (page) => { ... }` (used for CDP)
- `browser_take_screenshot` — page.screenshot()
- `browser_snapshot` — accessibility tree (used to find refs for clicking)
- `browser_click` — page.click()
- `browser_close` — page.close() (call when done to free resources)

## Workflow

```markdown
Playwright Mobile Screenshot Progress
- [ ] 1) Set the viewport BEFORE navigating
- [ ] 2) (Optional) Apply CDP overrides for full iPhone emulation
- [ ] 3) Navigate to the target route
- [ ] 4) If redirected to /auth, perform Dev Quick Login
- [ ] 5) Re-navigate to the original target route (if needed)
- [ ] 6) Wait 2–4 s for the SPA to hydrate
- [ ] 7) Take the screenshot
- [ ] 8) Close the page
```

### 1) Set the viewport BEFORE navigating

```jsonc
// browser_resize
{ "width": 393, "height": 852 }
```

Why first: setting the viewport before the first `goto` ensures the SPA mounts already knowing it's mobile. `useIsMobile()` reads `window.innerWidth` synchronously on first render via `useSyncExternalStore`, so a viewport set after mount would *also* work (it fires a matchMedia change event), but setting it first guarantees the cleanest hydration with no desktop flash.

### 2) (Optional but recommended) Apply CDP overrides

Standard `browser_resize` only sets viewport size and gives you DPR=1 plus desktop UA. For a fully realistic phone emulation (Retina sharpness, touch detection, mobile UA), use `browser_run_code` to send CDP commands:

```jsonc
// browser_run_code
{
  "code": "async (page) => {\n  const client = await page.context().newCDPSession(page);\n  await client.send('Emulation.setDeviceMetricsOverride', {\n    width: 393,\n    height: 852,\n    deviceScaleFactor: 3,\n    mobile: true,\n    screenWidth: 393,\n    screenHeight: 852\n  });\n  await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });\n  await client.send('Emulation.setUserAgentOverride', {\n    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',\n    platform: 'iPhone'\n  });\n  return { ok: true };\n}"
}
```

After this, a `browser_evaluate` should report:

```json
{
  "innerWidth": 393, "innerHeight": 852,
  "dpr": 3,
  "ua": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 ...",
  "platform": "iPhone",
  "mobileMQ": true,
  "hover": false,
  "pointerCoarse": true,
  "maxTouchPoints": 5
}
```

If the user only cares about layout and screenshot fidelity (not DPR or UA-sniffing), step 2 is optional and step 1 is enough.

### 3) Navigate to the target route

```jsonc
// browser_navigate
{ "url": "http://localhost:8080/dashboard" }
```

### 4) Quick-Login if redirected to /auth

Playwright runs in a fresh browser context — no shared cookies with the user's manual session. If the response page is `/auth`, perform the Dev Quick Login flow:

```jsonc
// browser_snapshot — to get current refs
{}

// browser_click — open the test-account dropdown (combobox)
{ "element": "Dev quick login account combobox", "ref": "<combobox ref from snapshot>" }

// browser_snapshot — refresh refs after dropdown opens
{}

// browser_click — pick a test account; default to Alex Apex (Owner)
{ "element": "Alex Apex (Owner) option", "ref": "<option ref>" }

// browser_click — click the Quick Login button (NOT the generic 'Sign In' button)
{ "element": "Quick Login button", "ref": "<quick login button ref>" }
```

After Quick Login, the browser lands on `/dashboard`. Available test accounts (from local seed data, verified 2026-04-19):

| Org | Account | Role |
|---|---|---|
| Apex Construction (Premium) | Alex Apex | Owner |
| Apex Construction (Premium) | Amanda Admin | Admin |
| Apex Construction (Premium) | Tom Technician | Member |
| Metro Equipment (Premium) | Marcus Metro | Owner |
| Metro Equipment (Premium) | Mike Mechanic | Member |
| Valley Landscaping (Free Tier) | Victor Valley | Owner |
| Industrial Rentals (Premium) | Irene Industrial | Owner |
| Multi-Org Testing | Multi Org User | Member |

**Important**: when looking for the button, two refs match the name "Sign In" — the `Sign In` *tab* and a `Sign In` *form button*. The Dev Quick Login button is named exactly `Quick Login` and only appears after a test account is selected. Click that one, not the generic Sign In.

### 5) Re-navigate to the target route (if needed)

If Quick Login dumped you on `/dashboard` but you wanted `/dashboard/work-orders`, navigate again:

```jsonc
// browser_navigate
{ "url": "http://localhost:8080/dashboard/work-orders" }
```

The viewport from step 1 (and CDP overrides from step 2) **persist** across navigations in the same Playwright page.

### 6) Wait for hydration

```jsonc
// Use Await tool (not browser_wait_for) for simple time-based waits
// 2500–3500 ms for /dashboard
// 3500–4500 ms for /dashboard/work-orders, /dashboard/equipment (data-heavy)
```

### 7) Take the screenshot

```jsonc
// browser_take_screenshot
{ "type": "png", "filename": "mobile-<route-slug>.png" }
```

Default capture is the **viewport**, which is exactly the phone-shaped image you want — no extra cropping needed. Pass `fullPage: true` if you need a full scrollable-page capture.

### 8) Close the page

```jsonc
// browser_close
{}
```

This frees the browser. The next `browser_navigate` call will spin up a fresh browser, so the next session will need Quick Login again.

## Verifying the simulation worked

Before final screenshot, you can sanity-check with:

```jsonc
// browser_evaluate
{
  "function": "() => ({ innerWidth: window.innerWidth, mobileMQ: window.matchMedia('(max-width: 767px)').matches })"
}
```

Expect `innerWidth: 393, mobileMQ: true`. If `mobileMQ` is `false`, the resize didn't apply or got reset — re-run step 1.

You can also navigate to the viewport probe (`/__viewport-probe.html`) for a richer dump (DPR, UA, hover/pointer media queries, max touch points). The probe is in `wrapper.md`.

## Pitfalls

- **First `browser_navigate` without `browser_resize`** — page mounts at 1366×900 default desktop size, then resize fires after but the SPA's already laid out as desktop until matchMedia fires. Always resize before navigating, or re-navigate after resize.
- **CDP overrides last for the page's lifetime** — if you `browser_close` and re-open, you must reapply them.
- **`browser_run_code` does not have access to `process`, `require`, or Node globals** — it runs in a Playwright execution sandbox. Stick to the `page` argument and Playwright APIs.
- **Screenshots default to viewport, not iframe-cropped** — there's no iframe wrapper here, so a plain `browser_take_screenshot` is exactly the phone-shaped image you want.
- **Quick Login button vs Sign In button** — see step 4 note. Use the explicitly-named "Quick Login" ref.
