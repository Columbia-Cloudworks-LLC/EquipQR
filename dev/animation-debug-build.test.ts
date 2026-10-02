import { describe, expect, it } from 'vitest';
import { animationDebugEnabled } from './animation-debug-build';

describe('animation debug build boundary', () => {
  it.each(['build', 'serve'])('never includes the debugger in Vercel production (%s)', (command) => {
    expect(animationDebugEnabled(command, 'production')).toBe(false);
  });
  it('allows the preview deployment and local server', () => {
    expect(animationDebugEnabled('build', 'preview')).toBe(true);
    expect(animationDebugEnabled('serve', undefined)).toBe(true);
  });
  it('fails closed for ordinary builds and unknown hosted environments', () => {
    expect(animationDebugEnabled('build', undefined)).toBe(false);
    expect(animationDebugEnabled('build', 'staging')).toBe(false);
  });
});
