# GitHub shortcut (`github.equipqr.app`)

Memorable HTTPS route to the canonical EquipQR repository. Visiting
[github.equipqr.app](https://github.equipqr.app) must redirect to
[github.com/Columbia-Cloudworks-LLC/EquipQR](https://github.com/Columbia-Cloudworks-LLC/EquipQR)
with no landing page and no redirect loop.

## Ownership

| Piece | Owner |
| --- | --- |
| Hostname | `github.equipqr.app` on the **equipqr.app** zone |
| DNS | **Vercel DNS** for `equipqr.app` (`ns1.vercel-dns.com` / `ns2.vercel-dns.com`) |
| TLS and edge redirect | Vercel project **equipqr** (Columbia Cloudworks team) |
| Redirect rule | Host-conditioned permanent redirect in the app project's routing config to the GitHub repository URL |
| Domain assignment | Vercel project domain `github.equipqr.app` (production), no git-branch pin |

Do not point this hostname at GitHub with a CNAME. GitHub cannot terminate `github.equipqr.app`. The hostname must stay on Vercel so HTTPS and the 308 are issued there.

## How the redirect works

1. Vercel DNS serves `github` as a CNAME on the `equipqr.app` zone (created when the project domain is attached).
2. The EquipQR Vercel project answers HTTPS for that hostname.
3. A host match in the project routing config returns a **permanent** (308) redirect to `https://github.com/Columbia-Cloudworks-LLC/EquipQR`.
4. The SPA fallback rewrite must not run for this host. Keep the GitHub host rule first among redirects.

## Add or repair the domain

1. Confirm the routing config still contains the host rule (see verification below).
2. In the Vercel project **equipqr**, add domain `github.equipqr.app` with **no** git-branch pin and **no** domain-level redirect (the host rule owns the destination, including the repository path).
3. Because `equipqr.app` uses Vercel nameservers, attaching the project domain creates the DNS record. Do not add a second CNAME by hand unless the automatic record is missing.
4. Wait for the domain to show **verified**.
5. Run the live check.

## Verify

Config (always, including CI):

```powershell
npm run verify:docs-index
```

That check asserts the host redirect exists in routing config and that every `AGENTS.md` documentation link resolves in the checkout.

Live (after DNS is attached; optional `--live`):

```powershell
npm run verify:docs-index -- --live
```

Manual:

```powershell
curl.exe -sI --max-redirs 0 "https://github.equipqr.app/"
```

Expect:

- Status **308** (or **301**)
- `Location: https://github.com/Columbia-Cloudworks-LLC/EquipQR`
- `strict-transport-security` present
- No HTML body and no hop through `equipqr.app`

A 200 from the EquipQR SPA means the host rule is missing or the domain is assigned without the redirect config. A CNAME to `github.com` means DNS ownership is wrong.

## Related

- Hostnames: [git-and-deploy.md](./git-and-deploy.md)
- Agent index: [AGENTS.md](../../AGENTS.md)
