import { describe, expect, it } from 'vitest';
import { isAnimationDebugHost } from './animationDebugHost';

describe('animation debug hostname boundary', () => {
  it.each(['equipqr.app', 'www.equipqr.app', 'preview.equipqr.app.example.com'])('refuses %s', (host) => {
    expect(isAnimationDebugHost(host)).toBe(false);
  });
  it.each(['localhost', '127.0.0.1', '[::1]', 'preview.equipqr.app', 'equipqr-commit.vercel.app'])('allows %s', (host) => {
    expect(isAnimationDebugHost(host)).toBe(true);
  });
});
