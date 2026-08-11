import { describe, expect, it } from 'vitest';
import {
  EVIDENCE_FRAME_PADDING_PX,
  evaluateFrameReadiness,
  isBottomChromeBand,
  isFullBleedChromeEdge,
} from './evidence-frame-helpers';

describe('evaluateFrameReadiness', () => {
  const viewport = { width: 390, height: 844 };

  it('passes when there is no overflow and the target fits with padding', () => {
    const result = evaluateFrameReadiness(viewport, 390, {
      top: 16,
      left: 16,
      bottom: 80,
      right: 200,
      width: 184,
      height: 64,
    });

    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('flags horizontal overflow', () => {
    const result = evaluateFrameReadiness(viewport, 420);

    expect(result.ok).toBe(false);
    expect(result.violations[0]).toMatch(/horizontal overflow/);
  });

  it('flags targets clipped by the viewport edges', () => {
    const result = evaluateFrameReadiness(
      viewport,
      viewport.width,
      {
        top: 2,
        left: 20,
        bottom: 120,
        right: 220,
        width: 200,
        height: 118,
      },
      EVIDENCE_FRAME_PADDING_PX,
    );

    expect(result.ok).toBe(false);
    expect(result.violations.join(' ')).toMatch(/clipped at top/);
  });

  it('flags zero-size targets', () => {
    const result = evaluateFrameReadiness(viewport, viewport.width, {
      top: 40,
      left: 40,
      bottom: 40,
      right: 40,
      width: 0,
      height: 0,
    });

    expect(result.ok).toBe(false);
    expect(result.violations.join(' ')).toMatch(/zero rendered size/);
  });

  it('allows intentional full-bleed bottom navigation chrome', () => {
    const bottomNav = {
      top: 780,
      left: 0,
      bottom: 844,
      right: 390,
      width: 390,
      height: 64,
    };

    expect(isFullBleedChromeEdge(bottomNav, viewport, 'bottom')).toBe(true);
    expect(isBottomChromeBand(bottomNav, viewport)).toBe(true);

    const result = evaluateFrameReadiness(viewport, viewport.width, bottomNav);
    expect(result.ok).toBe(true);
  });

  it('allows bottom tab items inside the mobile chrome band', () => {
    const equipmentTab = {
      top: 792,
      left: 48,
      bottom: 844,
      right: 126,
      width: 78,
      height: 52,
    };

    const result = evaluateFrameReadiness(viewport, viewport.width, equipmentTab);
    expect(result.ok).toBe(true);
  });
});
