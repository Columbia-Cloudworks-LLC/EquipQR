import { describe, expect, it } from 'vitest';
import {
  buildDiagnostics,
  buildDiagnosticsPath,
  buildMetadataPath,
  buildRunMetadata
} from '../../../scripts/lib/demoDiagnostics.mjs';

describe('demo diagnostics helpers', () => {
  it('builds deterministic sidecar paths', () => {
    expect(buildMetadataPath('tmp/demos/20260417-120000-demo.webm')).toBe(
      'tmp/demos/20260417-120000-demo.metadata.json'
    );
    expect(buildDiagnosticsPath('tmp/demos/20260417-120000-demo.webm')).toBe(
      'tmp/demos/20260417-120000-demo.diagnostics.json'
    );
  });

  it('builds metadata payload with required fields', () => {
    const metadata = buildRunMetadata({
      command: 'node scripts/demo-record-v2.mjs run',
      baseUrl: 'http://localhost:8080',
      scenarioId: 'executive-overview',
      scenarioTitle: 'Executive Overview',
      flowToken: 'demo-exec-overview',
      runIndex: 2,
      videoRelativePath: 'tmp/demos/20260417-120000-demo-exec-overview-run02.webm',
      status: 'passed',
      startedAtIso: '2026-04-17T12:00:00.000Z',
      finishedAtIso: '2026-04-17T12:00:10.000Z',
      sceneTimings: [],
      activity: {
        actionCount: 3,
        retryCount: 0,
        selectorFallbackCount: 1,
        checkpointPassCount: 1,
        checkpointFailCount: 0
      },
      qualityGate: { passed: true, failures: [] },
      compose: { enabled: false, attempted: false, composed: false },
      env: {}
    });
    expect(metadata.scenarioId).toBe('executive-overview');
    expect(metadata.flowToken).toBe('demo-exec-overview');
    expect(metadata.runIndex).toBe(2);
  });

  it('redacts storage state env in diagnostics', () => {
    const diagnostics = buildDiagnostics({
      command: 'node scripts/demo-record-v2.mjs run',
      scenarioId: 'executive-overview',
      flowToken: 'demo-exec-overview',
      runIndex: null,
      failureTaxonomy: [],
      selectorFallbacks: [],
      retries: [],
      sceneEvents: [],
      qualityGate: { passed: true, failures: [] },
      env: {
        DEMO_STORAGE_STATE: 'tmp/demos/auth.json'
      }
    });
    expect(diagnostics.env.DEMO_STORAGE_STATE).toBe('<redacted-path>');
  });
});
