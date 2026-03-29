## Learned User Preferences

- After substantive feature or compliance work, the user often asks to update `CHANGELOG.md` (commonly under `[Unreleased]` unless they name a version).
- For privacy and compliance flows, ship obvious in-UI success and failure feedback; the user validates with the browser console and network responses, not only copy.

## Learned Workspace Facts

- Treat `/` as the canonical marketing URL; keep `/landing` as compatibility only and normalize visitors to `/` while preserving hash and query string.
- Privacy posture work in this codebase includes CCPA/CPRA-oriented gaps: California-specific policy language, a `/privacy-request` intake path backed by the `submit-privacy-request` edge function, and user-level limits on sensitive personal information enforced in scan UX and the database layer.
