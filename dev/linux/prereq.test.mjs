import { describe, expect, it } from 'vitest';
import { evaluateDocker, evaluateNode, evaluateNpm, requiredNodeMajor } from './prereq.mjs';

describe('Linux prerequisite checks', () => {
  it('reads the Node major from engines.node', () => {
    expect(requiredNodeMajor('24.x')).toBe(24);
  });

  it('accepts the repository Node major', () => {
    expect(evaluateNode({ enginesNode: '24.x', actualVersion: 'v24.11.0' }).ok).toBe(true);
  });

  it('explains how to fix an older Node', () => {
    const result = evaluateNode({ enginesNode: '24.x', actualVersion: 'v22.14.0' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('engines.node "24.x"');
      expect(result.message).toContain('https://nodejs.org/');
      expect(result.message).toContain('Do not change the repository Node policy');
    }
  });

  it('explains a missing Docker daemon', () => {
    const result = evaluateDocker({ ok: false, detail: 'Cannot connect to the Docker daemon' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('https://docs.docker.com/engine/install/ubuntu/');
      expect(result.message).toContain('rebuild the dev container');
      expect(result.message).toContain('Cannot connect to the Docker daemon');
    }
  });

  it('accepts a working Docker daemon', () => {
    expect(evaluateDocker({ ok: true }).ok).toBe(true);
  });

  it('explains a missing npm', () => {
    const result = evaluateNpm({ ok: false });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('npm ci');
    }
  });
});
