---
name: git-and-deploy
description: Git branching train, PR creation conventions with gh CLI, and deployment stages for EquipQR.
---

# Git and Deploy Workflow

EquipQR uses a single-developer **feat → preview → main** train.

## 1. Branch Strategy

| Branch | Purpose | Base | Deployment |
| :--- | :--- | :--- | :--- |
| `preview` | Integration train | `main` | `preview.equipqr.app` |
| `feat/*`, `fix/*` | Work branches | `preview` | Commit-specific Vercel preview URL |
| `main` | Production source of truth | - | `equipqr.app` (promoted from `preview`) |

## 2. Day-to-Day Development Loop

### Default Work Mode: Local Iteration
Default is **local-iterate** (`docs/ops/git-and-deploy.md`). Stay on the current checkout. Do NOT create a branch, spawn a worktree, push, or open a PR until the user explicitly requests to publish or land the change.

### Publishing (When Explicitly Requested)
When the user explicitly authorizes publishing:

#### Step 1: Create Work Branch
```bash
git fetch origin preview
git switch -c feat/<short-name> origin/preview
```

#### Step 2: Verify Locally
```bash
npx tsc --noEmit
npm run lint:all
npm test
```

#### Step 3: Open Pull Request
Target `preview` by default:
```bash
gh pr create --base preview --title "feat(scope): concise description" --body "Closes #<issue_number>"
```

### Promote to Production
Production promotes happen from `preview` to `main` when ready to release:
1. Open PR `preview` → `main` with version bump in `package.json` and updated `CHANGELOG.md`.
2. Once merged, CI tags and deploys to production.
