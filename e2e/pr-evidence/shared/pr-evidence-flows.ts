/** Playwright spec fragment that requires the local VitePress docs dev server. */
export const OPERATOR_CHECKIN_DOCS_DISCOVERY_SPEC = 'daily-operator-check-in-docs-discovery.spec.ts';

export function prEvidenceRequiresDocsServer(
  env: { PR_EVIDENCE_SPEC?: string } = process.env,
): boolean {
  return (env.PR_EVIDENCE_SPEC ?? '').includes(OPERATOR_CHECKIN_DOCS_DISCOVERY_SPEC);
}
