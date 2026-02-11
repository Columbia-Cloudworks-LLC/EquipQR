# Playwright MCP Testing Context

Use this context when testing the EquipQR application with Playwright MCP tools.

## Application Overview

EquipQR is an equipment management and work order tracking application built with React, TypeScript, and Supabase. It supports multi-tenancy with organization-based access control.

## Development (Local) Server

- **Base URL**: `http://localhost:8080`
- Ensure the dev server is running before testing: `npm run dev`

## Preview (Staging) Server

- **Base URL**: `https://preview.equipqr.app`
- This site is automatically updated from the latest commit on the preview branch. This uses a custom "staging" environment on Vercel.

## Production Server

- **Base URL**: `https://equipqr.app`
- Vercel deploys to the preview environment automatically from the latest commit to the main branch. Preview deployments are manually promoted to Production.

## Available Playwright MCP Tools

All tools are called directly as `user-playwright-browser_*`. The complete set of available tools:

### Navigation & Page Management

| Tool | Purpose |
| --- | --- |
| `browser_navigate` | Navigate to a URL (`{ "url": "http://localhost:8080" }`) |
| `browser_navigate_back` | Go back to the previous page in browser history |
| `browser_tabs` | List, create, close, or switch between browser tabs (`{ "action": "list" }`) |
| `browser_close` | Close the page |
| `browser_install` | Install the browser binary if not already present |

### Page Inspection & Screenshots

| Tool | Purpose |
| --- | --- |
| `browser_snapshot` | Capture accessibility snapshot — **always use this before interacting** to get element `ref` values |
| `browser_take_screenshot` | Take a visual screenshot. Supports `fullPage: true` for full scrollable page, `element`/`ref` for specific elements, `filename` for saving, and `type` (`"png"` or `"jpeg"`) |

### Interaction

| Tool | Purpose |
| --- | --- |
| `browser_click` | Click an element. Supports `button` (`"left"`, `"right"`, `"middle"`), `doubleClick: true`, and `modifiers` (`["Alt"`, `"Control"`, `"Shift"`, `"Meta"`, `"ControlOrMeta"]`) |
| `browser_type` | Append text to an editable element. Use `slowly: true` for key-by-key input. Use `submit: true` to press Enter after typing |
| `browser_fill_form` | Fill multiple form fields at once. Field types: `"textbox"`, `"checkbox"`, `"radio"`, `"combobox"`, `"slider"` |
| `browser_select_option` | Select one or more options in a `<select>` dropdown (`{ "ref": "...", "values": ["option1"] }`) |
| `browser_press_key` | Press a keyboard key (e.g., `"Enter"`, `"Escape"`, `"ArrowDown"`, `"Tab"`) |
| `browser_hover` | Hover over an element to trigger tooltips, dropdown menus, or hover states |
| `browser_drag` | Drag and drop between two elements (`startRef`/`startElement` to `endRef`/`endElement`) |
| `browser_file_upload` | Upload one or more files by absolute path (`{ "paths": ["C:\\path\\to\\file.jpg"] }`) |
| `browser_handle_dialog` | Accept or dismiss native `alert()`/`confirm()`/`prompt()` dialogs. Call **before** the triggering action. Use `accept: false` for Cancel, `promptText` for custom prompt input |

### Observation & Debugging

| Tool | Purpose |
| --- | --- |
| `browser_console_messages` | Return console messages. Filter by `level`: `"error"`, `"warning"`, `"info"`, `"debug"`. Optionally save to `filename` |
| `browser_network_requests` | Return all network requests since page load. Set `includeStatic: true` to include images/fonts/scripts |
| `browser_wait_for` | Wait for `text` to appear, `textGone` to disappear, or `time` (seconds) to elapse |

### Advanced: Viewport, Network Emulation & Custom Code

| Tool | Purpose |
| --- | --- |
| `browser_resize` | **Resize the browser viewport** to test responsive layouts (`{ "width": 375, "height": 667 }`) |
| `browser_evaluate` | **Execute arbitrary JavaScript** in the page context. Can access DOM, `localStorage`, `navigator`, etc. Optionally target a specific element via `ref` |
| `browser_run_code` | **Run raw Playwright code** with full `page` API access. The most powerful tool — enables CDP sessions for network throttling, offline simulation, geolocation mocking, and more |

---

## Responsive / Viewport Testing

Use `browser_resize` to test the app at different breakpoints. EquipQR field technicians commonly use mobile devices.

### Common Device Presets

| Device | Width | Height |
| --- | --- | --- |
| iPhone SE | 375 | 667 |
| iPhone 14 Pro | 393 | 852 |
| Android (Pixel 7) | 412 | 915 |
| iPad Mini | 768 | 1024 |
| iPad Pro 12.9" | 1024 | 1366 |
| Laptop (small) | 1280 | 720 |
| Desktop (HD) | 1920 | 1080 |

### Responsive Testing Workflow

```plaintext
1. browser_navigate → target page (after auth)
2. browser_resize → { "width": 375, "height": 667 } (mobile)
3. browser_snapshot → verify sidebar collapsed, mobile layout active
4. browser_take_screenshot → capture mobile view (filename: "mobile-375.png")
5. browser_resize → { "width": 768, "height": 1024 } (tablet)
6. browser_snapshot → verify tablet layout
7. browser_resize → { "width": 1920, "height": 1080 } (desktop)
8. browser_snapshot → verify full desktop layout with sidebar expanded
```

---

## Network Emulation (Offline / Throttling)

Use `browser_run_code` to access Chrome DevTools Protocol (CDP) for network condition emulation. This is critical for testing the offline queue feature.

### Go Offline

```javascript
async (page) => {
  const context = page.context();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.emulateNetworkConditions', {
    offline: true,
    downloadThroughput: 0,
    uploadThroughput: 0,
    latency: 0
  });
  return 'Network: OFFLINE';
}
```

### Simulate Slow 3G

```javascript
async (page) => {
  const context = page.context();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: (400 * 1024) / 8,   // 400 kbps
    uploadThroughput: (400 * 1024) / 8,
    latency: 2000                             // 2s RTT
  });
  return 'Network: Slow 3G';
}
```

### Simulate Fast 3G

```javascript
async (page) => {
  const context = page.context();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: (1.5 * 1024 * 1024) / 8,  // 1.5 Mbps
    uploadThroughput: (750 * 1024) / 8,              // 750 kbps
    latency: 563                                      // 563ms RTT
  });
  return 'Network: Fast 3G';
}
```

### Go Back Online (Reset Network)

```javascript
async (page) => {
  const context = page.context();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: -1,
    uploadThroughput: -1,
    latency: 0
  });
  return 'Network: ONLINE (reset)';
}
```

### Trigger Browser Online/Offline Events (via evaluate)

Use `browser_evaluate` to dispatch browser-level online/offline events, useful for testing `navigator.onLine` listeners:

```javascript
// Dispatch 'offline' event
() => {
  window.dispatchEvent(new Event('offline'));
  return navigator.onLine;
}
```

```javascript
// Dispatch 'online' event
() => {
  window.dispatchEvent(new Event('online'));
  return navigator.onLine;
}
```

---

## JavaScript Evaluation & Page Inspection

Use `browser_evaluate` to run JavaScript in the page context, and `browser_run_code` for full Playwright API access.

### Check navigator.onLine Status

```javascript
() => ({ online: navigator.onLine })
```

### Read localStorage / sessionStorage

```javascript
() => {
  const keys = Object.keys(localStorage);
  const data = {};
  keys.forEach(k => { data[k] = localStorage.getItem(k); });
  return { keyCount: keys.length, data };
}
```

### Check for Pending Offline Queue Items

```javascript
() => {
  const queue = localStorage.getItem('offlineQueue');
  return queue ? JSON.parse(queue) : 'No offline queue found';
}
```

### Get Current Route / URL

```javascript
() => ({ href: window.location.href, pathname: window.location.pathname })
```

### Scroll to Bottom of Page

```javascript
() => { window.scrollTo(0, document.body.scrollHeight); }
```

### Count Elements by Selector

```javascript
() => ({
  buttons: document.querySelectorAll('button').length,
  inputs: document.querySelectorAll('input').length,
  links: document.querySelectorAll('a').length
})
```

---

## Application Routes

### Public Routes (No Auth Required)

| Route | Description |
| --- | --- |
| `/` | Landing page (redirects to dashboard if authenticated) |
| `/auth` | Sign in / Sign up page |
| `/auth?tab=signin` | Sign in tab |
| `/auth?tab=signup` | Sign up tab |
| `/support` | Public support page |
| `/terms-of-service` | Terms of Service |
| `/privacy-policy` | Privacy Policy |
| `/solutions/repair-shops` | Repair shops solution page |

### Protected Routes (Auth Required)

All protected routes are under `/dashboard/*`:

| Route | Description |
| --- | --- |
| `/dashboard` | Main dashboard with stats, recent equipment, work orders |
| `/dashboard/equipment` | Equipment list with filters, search, grid/list views |
| `/dashboard/equipment/:equipmentId` | Equipment details with tabs (Details, Notes, Images, Parts, Work Orders) |
| `/dashboard/work-orders` | Work orders list with status filters |
| `/dashboard/work-orders/:workOrderId` | Work order details |
| `/dashboard/teams` | Teams management |
| `/dashboard/teams/:teamId` | Team details |
| `/dashboard/fleet-map` | Fleet map view |
| `/dashboard/organization` | Organization settings |
| `/dashboard/pm-templates` | Preventative maintenance templates |
| `/dashboard/pm-templates/:templateId` | PM template details |
| `/dashboard/inventory` | Inventory list |
| `/dashboard/inventory/:itemId` | Inventory item details |
| `/dashboard/part-lookup` | Part lookup search |
| `/dashboard/alternate-groups` | Alternate parts groups |
| `/dashboard/reports` | Reports and exports |
| `/dashboard/notifications` | User notifications |
| `/dashboard/settings` | User settings |
| `/dashboard/scanner` | QR code scanner |
| `/dashboard/audit-log` | Audit log viewer |

## Authentication Flow

### Sign In Form Structure

The sign-in page (`/auth`) contains:

- **Tabs**: "Sign In" and "Sign Up" tabs
- **Email field**: `id="signin-email"`, `type="email"`
- **Password field**: `id="signin-password"`, `type="password"`
- **Submit button**: "Sign In" button
- **Google OAuth**: "Continue with Google" button

### Testing Authentication

1. Navigate to `http://localhost:8080/auth`
2. Take a snapshot to get element refs
3. Fill email and password fields
4. Click the Sign In button
5. Wait for redirect to `/dashboard`

---

## Common Testing Workflows

### 1. Basic Navigation Test

```plaintext
1. browser_navigate → http://localhost:8080
2. browser_snapshot → verify landing page loaded
3. browser_click → "Sign In" or navigate to /auth
4. browser_snapshot → verify auth page
```

### 2. Authentication Test

```plaintext
1. browser_navigate → http://localhost:8080/auth
2. browser_snapshot → get form element refs
3. browser_type → email field with test email
4. browser_type → password field with test password
5. browser_click → Sign In button
6. browser_wait_for → dashboard to load
7. browser_snapshot → verify dashboard content
```

### 3. Equipment Management Test

```plaintext
1. (after auth) browser_navigate → http://localhost:8080/dashboard/equipment
2. browser_snapshot → verify equipment list
3. browser_click → "Add Equipment" button (if exists)
4. browser_fill_form → equipment details (textbox fields)
5. browser_select_option → equipment type dropdown
6. browser_click → submit
7. browser_snapshot → verify equipment created
```

### 4. Work Order Test

```plaintext
1. (after auth) browser_navigate → http://localhost:8080/dashboard/work-orders
2. browser_snapshot → verify work orders list
3. browser_click → "Create Work Order" or existing work order
4. browser_fill_form → work order details
5. browser_select_option → status, priority, assigned team dropdowns
6. browser_click → submit
7. browser_snapshot → verify work order created/updated
```

### 5. Offline Queue Test (Equipment + Work Orders)

Tests whether a technician can create records offline and have them sync when back online.

```plaintext
 1. (after auth) browser_navigate → http://localhost:8080/dashboard
 2. browser_snapshot → verify dashboard loaded, note existing counts
 3. browser_run_code → CDP: go OFFLINE (see Network Emulation section)
 4. browser_evaluate → confirm navigator.onLine === false
 5. browser_navigate → /dashboard/equipment
 6. browser_click → "Add Equipment"
 7. browser_fill_form → new equipment details
 8. browser_click → submit
 9. browser_snapshot → verify offline indicator shown, equipment "queued"
10. browser_navigate → /dashboard/work-orders
11. browser_click → "Create Work Order"
12. browser_fill_form → work order details
13. browser_click → submit
14. browser_snapshot → verify offline indicator shown, work order "queued"
15. browser_evaluate → check localStorage for offline queue items
16. browser_run_code → CDP: go ONLINE (see Network Emulation section)
17. browser_evaluate → confirm navigator.onLine === true
18. browser_wait_for → sync completion indicators / toasts
19. browser_snapshot → verify records now appear as synced
20. browser_console_messages → check for sync errors (level: "error")
21. browser_network_requests → verify POST requests to Supabase succeeded
```

### 6. Responsive / Mobile Layout Test

```plaintext
1. (after auth) browser_navigate → target page
2. browser_resize → { "width": 375, "height": 667 }
3. browser_snapshot → verify mobile layout (sidebar collapsed, hamburger menu)
4. browser_take_screenshot → { "filename": "mobile-view.png", "fullPage": true }
5. browser_click → hamburger menu to open sidebar
6. browser_snapshot → verify sidebar overlay opened
7. browser_resize → { "width": 1920, "height": 1080 }
8. browser_snapshot → verify desktop layout restored
```

### 7. File Upload Test (Equipment Images)

```plaintext
1. (after auth) browser_navigate → /dashboard/equipment/:equipmentId
2. browser_snapshot → find Images tab
3. browser_click → Images tab
4. browser_snapshot → find upload button/area
5. browser_click → upload button (triggers file chooser)
6. browser_file_upload → { "paths": ["C:\\path\\to\\test-image.jpg"] }
7. browser_wait_for → upload to complete
8. browser_snapshot → verify image appears in gallery
```

### 8. Multi-Tab Test

```plaintext
1. (after auth) browser_navigate → /dashboard/equipment
2. browser_tabs → { "action": "new" }
3. browser_navigate → /dashboard/work-orders (in new tab)
4. browser_snapshot → verify work orders page in tab 2
5. browser_tabs → { "action": "select", "index": 0 }
6. browser_snapshot → verify equipment page still in tab 1
7. browser_tabs → { "action": "close", "index": 1 }
```

### 9. Tooltip / Hover State Test

```plaintext
1. browser_snapshot → find element with tooltip
2. browser_hover → target element
3. browser_snapshot → verify tooltip content appeared
```

### 10. Dialog / Confirmation Test

```plaintext
1. browser_handle_dialog → { "accept": true }   ← set BEFORE triggering action
2. browser_click → "Delete" button (triggers confirm dialog)
3. browser_snapshot → verify item was deleted
```

---

## UI Component Patterns

### Common Element Selectors

- **Buttons**: Look for `button` elements with descriptive text
- **Form inputs**: Use `id` attributes (e.g., `signin-email`, `signin-password`)
- **Dropdowns**: Use `browser_select_option` for `<select>` elements, `browser_click` for custom comboboxes
- **Navigation**: Sidebar links, top bar elements
- **Tabs**: `TabsTrigger` elements with tab names
- **Cards**: Equipment cards, stat cards in dashboard
- **Dialogs**: Modal dialogs for forms and confirmations
- **Tooltips**: Hover-triggered via `browser_hover`

### Layout Structure

- **Sidebar**: Left sidebar with navigation links (collapsible on mobile)
- **TopBar**: Header with organization switcher, notifications, user menu
- **Main content**: Central content area
- **Footer**: Legal links footer

---

## Tips for Effective Testing

1. **Always take a snapshot first** to understand the page structure and get element `ref` values
2. **Check console messages** (`browser_console_messages`, `level: "error"`) for JavaScript errors
3. **Monitor network requests** (`browser_network_requests`) for API failures
4. **Use `browser_wait_for`** after actions that trigger navigation or data loading — prefer short incremental waits (1-3s) with snapshot checks over one long wait
5. **Use `browser_evaluate`** to inspect page state (localStorage, navigator.onLine, DOM counts) rather than guessing
6. **Use `browser_resize`** to validate responsive behavior at mobile, tablet, and desktop breakpoints
7. **Use `browser_take_screenshot` with `fullPage: true`** for visual regression checks on long pages
8. **Set up `browser_handle_dialog` before the action** that triggers a native dialog — not after
9. **Close the browser** (`browser_close`) when testing is complete

---

## Test Data Considerations

- The app uses Supabase for backend; test data depends on your local/dev database
- Multi-tenancy means data is scoped to organizations
- Some features require specific user roles (owner, admin, member)

## Error Handling

Common issues to check:

- Authentication failures → check credentials, Supabase connection
- Empty states → no data in database for current organization
- Loading states → Suspense boundaries, skeleton loaders
- RLS errors → Row Level Security policy violations in console
- Offline queue errors → check localStorage for queued items, console for sync failures

---

## Example MCP Tool Calls

### Navigate to Auth Page

```json
{ "url": "http://localhost:8080/auth" }
```

### Resize Viewport to Mobile

```json
{ "width": 375, "height": 667 }
```

### Take Full-Page Screenshot

```json
{ "fullPage": true, "filename": "full-page.png", "type": "png" }
```

### Take Element Screenshot

```json
{ "element": "Equipment card", "ref": "element-ref-from-snapshot", "filename": "equip-card.png", "type": "png" }
```

### Click with Modifiers

```json
{ "element": "Equipment row", "ref": "ref-from-snapshot", "button": "right" }
```

```json
{ "element": "Equipment row", "ref": "ref-from-snapshot", "modifiers": ["Control"] }
```

### Double Click

```json
{ "element": "Editable cell", "ref": "ref-from-snapshot", "doubleClick": true }
```

### Select Dropdown Option

```json
{ "ref": "select-ref-from-snapshot", "values": ["high_priority"], "element": "Priority dropdown" }
```

### Fill Form with Mixed Field Types

```json
{
  "fields": [
    { "name": "Equipment Name", "type": "textbox", "ref": "name-ref", "value": "Excavator 3500" },
    { "name": "Equipment Type", "type": "combobox", "ref": "type-ref", "value": "Heavy Equipment" },
    { "name": "Active", "type": "checkbox", "ref": "active-ref", "value": "true" }
  ]
}
```

### Upload a File

```json
{ "paths": ["C:\\Users\\viral\\test-assets\\equipment-photo.jpg"] }
```

### Handle a Confirmation Dialog (set before triggering action)

```json
{ "accept": true }
```

### Dismiss a Confirmation Dialog

```json
{ "accept": false }
```

### Run Custom Playwright Code

```javascript
async (page) => {
  // Example: get all visible text content on the page
  return await page.evaluate(() => document.body.innerText.slice(0, 500));
}
```

### Evaluate JavaScript in Page

```javascript
() => ({
  url: window.location.href,
  online: navigator.onLine,
  queuedItems: JSON.parse(localStorage.getItem('offlineQueue') || '[]').length
})
```

### Manage Tabs

```json
{ "action": "list" }
```

```json
{ "action": "new" }
```

```json
{ "action": "select", "index": 0 }
```

### Wait for Text to Appear

```json
{ "text": "Equipment saved successfully" }
```

### Wait for Text to Disappear (Loading States)

```json
{ "textGone": "Loading..." }
```

### Console Messages (Errors Only)

```json
{ "level": "error" }
```

### Network Requests (Including Static Assets)

```json
{ "includeStatic": true }
```
