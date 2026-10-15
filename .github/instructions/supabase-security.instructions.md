---
applyTo: "supabase/**"
---
When reviewing changes under `supabase/`, load and follow the `.agents/skills/code-review/SKILL.md` skill.
- Verify every new table enables RLS and enforces `organization_id` tenant isolation.
- Verify every `SECURITY DEFINER` function sets `search_path`, validates `auth.uid()` tenant membership, and stays in sync with `dev/security-definer-rpc-allowlists.json`.
- Verify Edge Functions validate `Authorization` tokens and map any new `Deno.env.get()` keys in `.github/secrets-map.yml`.
