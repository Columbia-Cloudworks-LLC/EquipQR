/** Fail closed for ordinary builds; Vercel production always overrides dev mode. */
export function animationDebugEnabled(command: string, vercelEnvironment: string | undefined): boolean {
  return vercelEnvironment !== 'production' && (command === 'serve' || vercelEnvironment === 'preview');
}
