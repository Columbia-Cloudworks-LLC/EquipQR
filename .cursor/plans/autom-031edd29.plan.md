<!-- 031edd29-f3ff-4263-b556-d0b78a935b87 9f8a08cb-7ac0-4f8c-8eb5-3f3eb921e150 -->
# Fix versioning workflow push from detached HEAD

### Goal

Ensure the version bump commit and tag are successfully pushed when the workflow runs on PR merge by avoiding detached HEAD issues and pushing to the correct base branch.

### Changes to `.github/workflows/versioning.yml`

1) Ensure we operate on the base branch (not detached HEAD)

```yaml
- name: Checkout with full history
  uses: actions/checkout@v4
  with:
    fetch-depth: 0

- name: Switch to base branch
  run: |
    BASE="${{ github.event.pull_request.base.ref }}"
    git fetch origin "$BASE" --prune
    git checkout -B "$BASE" "origin/$BASE"
```

2) Guard against no-op version changes

```yaml
- name: Update package.json version
  run: |
    echo "Updating package.json to version ${{ steps.semver.outputs.next }}"
    npm pkg set version=${{ steps.semver.outputs.next }}
    if git diff --quiet -- package.json; then
      echo "No version change (already at target). Skipping push/tag.";
      exit 0;
    fi
    git add package.json
    git commit -m "chore: bump version to ${{ steps.semver.outputs.next }} [skip ci]"
```

3) Push commit explicitly to the base branch (avoid detached HEAD error)

```yaml
- name: Push commit to base branch
  run: |
    BASE="${{ github.event.pull_request.base.ref }}"
    git push origin HEAD:"refs/heads/$BASE"
```

4) Create tag and push it after commit is on remote

```yaml
- name: Create and push tag
  run: |
    TAG="v${{ steps.semver.outputs.next }}"
    git tag -a "$TAG" -m "Release $TAG"
    git push origin "$TAG"
```

5) Optional hardening (concurrency and retry)

```yaml
concurrency:
  group: versioning-${{ github.event.pull_request.base.ref }}
  cancel-in-progress: false
```

### Notes

- Pushing via `git push origin HEAD:refs/heads/$BASE` works even if HEAD is detached.
- Tagging occurs after the commit is pushed, ensuring the tag points to a commit that exists on remote.
- If branch protection disallows direct pushes by Actions, we can fall back to opening an automated PR; not included here to keep flow simple.

### To-dos

- [ ] Switch to the base branch in workflow before committing
- [ ] Add no-op guard to skip commit/tag if version unchanged
- [ ] Push HEAD explicitly to base branch ref
- [ ] Create and push tag after commit has been pushed
- [ ] Add concurrency group to reduce race conditions