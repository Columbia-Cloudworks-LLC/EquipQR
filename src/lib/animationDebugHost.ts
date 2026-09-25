/** A preview artifact must still refuse the production hostname if re-aliased. */
export function isAnimationDebugHost(hostname: string): boolean {
  return ['localhost', '127.0.0.1', '[::1]', 'preview.equipqr.app'].includes(hostname)
    || hostname.endsWith('.vercel.app');
}
