/**
 * Expire first-party cookies by name on the current host and every parent
 * domain. Analytics tags scope cookies to the registrable domain, which the
 * browser does not expose, so each candidate domain is tried.
 */
export function clearCookiesOnParentDomains(names: readonly string[]): void {
  if (typeof document === 'undefined' || names.length === 0) return;
  const host = globalThis.location?.hostname ?? '';
  const parts = host.split('.');
  const domains = new Set<string>(['']);
  for (let i = 0; i < parts.length - 1; i += 1) {
    domains.add(`; domain=.${parts.slice(i).join('.')}`);
  }
  for (const name of names) {
    for (const domain of domains) {
      try {
        document.cookie = `${name}=; path=/; max-age=0${domain}`;
      } catch {
        // ignore
      }
    }
  }
}
