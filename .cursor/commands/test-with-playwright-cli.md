# Test with Playwright CLI

## Overview

Test the EquipQR app at `http://localhost:8080` using the `playwright-cli` tool.
After every command, `playwright-cli` automatically returns a snapshot of the current
browser state — use element refs (e.g. `e12`) from that snapshot for the next interaction.

## Steps

### 1. Verify the dev server is running

```powershell
# Check if port 8080 is listening
Test-NetConnection -ComputerName localhost -Port 8080 -InformationLevel Quiet
```

If the server is not running, start it (idempotent):

```powershell
.\dev-start.bat
```

Wait ~10 seconds, then re-check before continuing.

### 2. Open the browser and navigate

```bash
# Open a new browser session directly at the app
playwright-cli open http://localhost:8080
```

> If you need a named session (e.g. to run two roles in parallel), use:
> `playwright-cli -s=admin open http://localhost:8080`

### 3. Authenticate via the Dev Quick Login panel

Navigate to `/auth`. The login page has a **Dev Quick Login** panel with a persona dropdown — no password needed in development.

```bash
playwright-cli goto http://localhost:8080/auth
# Open the persona dropdown
playwright-cli click e32
# Select a test account (pick one from the list below), then:
playwright-cli click e62   # example: Alex Apex (Owner)
# Click Quick Login — the button enables once a persona is selected
playwright-cli click e123
# The app redirects to /dashboard on success
```

> **Tip:** Element refs change between sessions. Always `playwright-cli snapshot` after opening
> the page to get the current refs if the ones above don't match.

#### Available test personas

| Org | Plan | Persona | Role |
|---|---|---|---|
| Apex Construction | Premium | Alex Apex | Owner |
| Apex Construction | Premium | Amanda Admin | Admin |
| Apex Construction | Premium | Tom Technician | Member |
| Metro Equipment | Premium | Marcus Metro | Owner |
| Metro Equipment | Premium | Mike Mechanic | Member |
| Valley Landscaping | Free Tier | Victor Valley | Owner |
| Industrial Rentals | Premium | Irene Industrial | Owner |
| Multi-Org Testing | — | Multi Org User | Member (multiple orgs) |

To persist auth across test runs, save state after login:

```bash
playwright-cli state-save auth.json
# Next time, load it instead of logging in:
playwright-cli open http://localhost:8080/dashboard
playwright-cli state-load auth.json
```

### 4. Navigate to the page under test

```bash
playwright-cli goto http://localhost:8080/equipment
```

### 5. Interact with the page

Use refs from the most recent snapshot output for all interactions.

**Click:**

```bash
playwright-cli click e12
```

**Fill a form field:**

```bash
playwright-cli fill e5 "Test Forklift"
```

**Select a dropdown option:**

```bash
playwright-cli select e9 "heavy-equipment"
```

**Keyboard shortcuts:**

```bash
playwright-cli press Enter
playwright-cli press Escape
playwright-cli press Tab
```

**Scroll:**

```bash
playwright-cli mousewheel 0 500
```

**Hover (for tooltips / dropdown menus):**

```bash
playwright-cli hover e7
```

### 6. Inspect and verify

```bash
# On-demand snapshot (accessibility tree + element refs)
playwright-cli snapshot --filename=after-action.yaml

# Screenshot
playwright-cli screenshot --filename=result.png

# Check console for JS errors
playwright-cli console

# Inspect network requests
playwright-cli network

# Evaluate arbitrary JS
playwright-cli eval "document.title"
playwright-cli eval "el => el.textContent" e5
```

### 7. Debugging tools

```bash
# Start a trace for detailed replay
playwright-cli tracing-start
# ... perform actions ...
playwright-cli tracing-stop

# Record a video
playwright-cli video-start
# ... perform actions ...
playwright-cli video-stop recording.webm

# Mock a failing API endpoint to test error states
playwright-cli route "https://*/rest/v1/equipment*" --status=500
```

### 8. Close when done

```bash
playwright-cli close
```

---

## Common EquipQR Routes

| Page | URL | Notes |
|---|---|---|
| Login | `http://localhost:8080/auth` | Dev Quick Login persona dropdown available |
| Dashboard | `http://localhost:8080/dashboard` | `/` redirects here when authenticated |
| Equipment list | `http://localhost:8080/equipment` | |
| Work orders | `http://localhost:8080/work-orders` | |
| Fleet map | `http://localhost:8080/fleet-map` | |
| Team management | `http://localhost:8080/team` | |
| Inventory | `http://localhost:8080/inventory` | |
| Settings | `http://localhost:8080/settings` | |

---

## Quick Reference

| Command | Purpose |
|---|---|
| `playwright-cli open <url>` | Open new browser session |
| `playwright-cli goto <url>` | Navigate to URL |
| `playwright-cli snapshot` | Capture accessibility tree + element refs |
| `playwright-cli screenshot` | Save a PNG screenshot |
| `playwright-cli click <ref>` | Click an element |
| `playwright-cli fill <ref> "<text>"` | Clear and type into an input |
| `playwright-cli type "<text>"` | Append text (no clear) |
| `playwright-cli select <ref> "<value>"` | Choose a select option |
| `playwright-cli press <Key>` | Send a keyboard event |
| `playwright-cli hover <ref>` | Hover over an element |
| `playwright-cli console` | Print browser console output |
| `playwright-cli network` | Print recent network requests |
| `playwright-cli state-save <file>` | Persist cookies + localStorage |
| `playwright-cli state-load <file>` | Restore saved auth state |
| `playwright-cli route "<pattern>"` | Mock a network request |
| `playwright-cli -s=<name> open` | Named session (multi-tab / multi-role) |
| `playwright-cli close` | Close current session |
| `playwright-cli close-all` | Close all open sessions |

---

## Testing Checklist

- [ ] Dev server confirmed running on port 8080
- [ ] Browser opened and app loaded without errors
- [ ] Authenticated successfully (or auth state loaded)
- [ ] Target page navigated to and renders correctly
- [ ] Interactions (clicks, fills, selects) behave as expected
- [ ] UI reflects correct state after mutations
- [ ] No console errors (`playwright-cli console`)
- [ ] No unexpected network failures (`playwright-cli network`)
- [ ] Browser closed after testing
