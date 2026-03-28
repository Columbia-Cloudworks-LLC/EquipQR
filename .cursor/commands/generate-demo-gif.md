# Generate Demo GIF

## Overview

Generate a browser-recorded GIF demo for an EquipQR feature flow using the local
dev app, `playwright-cli`, and the reusable scenario runner script.

## Steps

### 1. Resolve scenario argument

- If the command was invoked with an argument, treat it as the scenario name.
- If no scenario argument was provided:
  - Read `scripts/demo-scenarios.json`.
  - List available scenario names and descriptions.
  - Ask the user to choose one scenario before continuing.

### 2. Verify dev server is running on port 8080

Run this exact check:

```powershell
Test-NetConnection -ComputerName localhost -Port 8080 -InformationLevel Quiet
```

If the result is `False`, stop immediately with this exact message:

`Dev server is not running on port 8080. Start it with .\dev-start.bat and try again.`

Do not start the server automatically.

### 3. Run the selected demo scenario

Run:

```powershell
node scripts/demo-gif.mjs <scenario>
```

Replace `<scenario>` with the selected scenario name.

### 4. Report output path

- On success, report the generated GIF file path returned by the script.
- If the run fails, report the failure details from the script output.

---

## Checklist

- [ ] Scenario argument resolved or user selected one from the manifest
- [ ] Dev server check ran with `Test-NetConnection`
- [ ] If server check failed, process stopped with exact required message
- [ ] `node scripts/demo-gif.mjs <scenario>` executed
- [ ] Final GIF path reported back to the user
