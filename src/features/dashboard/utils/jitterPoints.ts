import type { FleetEfficiencyPoint } from '@/features/teams/services/teamFleetEfficiencyService';

/**
 * A fleet efficiency point augmented with jittered coordinates for chart display.
 * The original data values are preserved; `jitteredX` and `jitteredY` are used
 * for rendering only.
 */
export interface JitteredPoint extends FleetEfficiencyPoint {
  /** Display X coordinate (may be offset from equipmentCount) */
  jitteredX: number;
  /** Display Y coordinate (may be offset from activeWorkOrdersCount) */
  jitteredY: number;
  /** Number of points sharing the same original coordinate */
  clusterSize: number;
  /** Index within the cluster (0-based) */
  clusterIndex: number;
  /** Unique key combining original coordinates for cluster grouping */
  clusterKey: string;
}

/**
 * Groups points by their integer coordinates.
 * Returns a Map where keys are "x,y" strings and values are arrays of points at that coordinate.
 */
function groupByCoordinate(points: FleetEfficiencyPoint[]): Map<string, FleetEfficiencyPoint[]> {
  const groups = new Map<string, FleetEfficiencyPoint[]>();
  for (const point of points) {
    const key = `${point.equipmentCount},${point.activeWorkOrdersCount}`;
    const group = groups.get(key);
    if (group) {
      group.push(point);
    } else {
      groups.set(key, [point]);
    }
  }
  return groups;
}

/**
 * Calculates the jitter radius as a percentage of the axis range.
 * For axes with very small ranges, applies a minimum radius to ensure
 * overlapping points are still visually separable.
 */
function calculateJitterRadius(
  points: FleetEfficiencyPoint[],
  radiusFraction: number = 0.05
): { rx: number; ry: number } {
  if (points.length <= 1) {
    return { rx: 0, ry: 0 };
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const p of points) {
    if (p.equipmentCount < minX) minX = p.equipmentCount;
    if (p.equipmentCount > maxX) maxX = p.equipmentCount;
    if (p.activeWorkOrdersCount < minY) minY = p.activeWorkOrdersCount;
    if (p.activeWorkOrdersCount > maxY) maxY = p.activeWorkOrdersCount;
  }

  const rangeX = maxX - minX;
  const rangeY = maxY - minY;

  // Minimum jitter radius of 0.3 for axes where all values are the same
  const rx = Math.max(rangeX * radiusFraction, 0.3);
  const ry = Math.max(rangeY * radiusFraction, 0.3);

  return { rx, ry };
}

/**
 * Applies deterministic spiral jitter to overlapping scatter plot points.
 *
 * Points sharing the same integer (equipmentCount, activeWorkOrdersCount) coordinate
 * are spread into a spiral pattern around their original position. The algorithm is
 * deterministic: the same input always produces the same output (points are sorted
 * by teamId within each cluster for stability).
 *
 * Single points (no overlap) pass through unchanged. Each returned point includes
 * cluster metadata (`clusterSize`, `clusterIndex`, `clusterKey`) for rendering
 * cluster badges when appropriate.
 *
 * @param points - The raw fleet efficiency data points
 * @param radiusFraction - Jitter radius as a fraction of axis range (default 0.05 = 5%)
 * @returns Points augmented with jittered coordinates and cluster metadata
 */
export function jitterPoints(
  points: FleetEfficiencyPoint[],
  radiusFraction: number = 0.05
): JitteredPoint[] {
  if (points.length === 0) {
    return [];
  }

  const { rx, ry } = calculateJitterRadius(points, radiusFraction);
  const groups = groupByCoordinate(points);
  const result: JitteredPoint[] = [];

  for (const [key, group] of groups) {
    // Sort by teamId for deterministic output
    const sorted = [...group].sort((a, b) => a.teamId.localeCompare(b.teamId));
    const size = sorted.length;

    for (let i = 0; i < size; i++) {
      const point = sorted[i];

      if (size === 1) {
        // Single point — no jitter needed
        result.push({
          ...point,
          jitteredX: point.equipmentCount,
          jitteredY: point.activeWorkOrdersCount,
          clusterSize: 1,
          clusterIndex: 0,
          clusterKey: key,
        });
      } else {
        // Spiral placement: evenly distribute around original position
        const theta = (2 * Math.PI * i) / size;
        // Scale radius slightly by cluster size for larger clusters
        const scaleFactor = Math.min(1 + (size - 2) * 0.15, 2.0);
        const offsetX = rx * scaleFactor * Math.cos(theta);
        const offsetY = ry * scaleFactor * Math.sin(theta);

        result.push({
          ...point,
          jitteredX: point.equipmentCount + offsetX,
          jitteredY: point.activeWorkOrdersCount + offsetY,
          clusterSize: size,
          clusterIndex: i,
          clusterKey: key,
        });
      }
    }
  }

  return result;
}

/**
 * Returns all original points that share the same cluster key.
 * Useful for displaying a popover with all teams at an overlapping coordinate.
 */
export function getClusterMembers(
  jitteredPoints: JitteredPoint[],
  clusterKey: string
): JitteredPoint[] {
  return jitteredPoints.filter((p) => p.clusterKey === clusterKey);
}
