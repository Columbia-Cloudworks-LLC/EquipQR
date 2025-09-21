### Runner Management Guide

#### Quick switch between runner types

- Switch to self-hosted (Windows):
```powershell
pwsh -File scripts/switch-runner-type.ps1 -RunnerType self-hosted
```

- Switch to GitHub-hosted (Ubuntu):
```powershell
pwsh -File scripts/switch-runner-type.ps1 -RunnerType github-hosted
```

Then commit and push the workflow changes.

#### Notes
- Security scans remain on GitHub-hosted for isolation.
- Windows steps use PowerShell; Unix steps use Bash.
- Toggle by editing `USE_SELF_HOSTED` in workflows or using the script.

