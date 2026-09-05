import type { Waypoint } from '../entities/autoData';

export interface LoopPoint {
  x: number;
  z: number;
  /** heading (radians) matching rotation.y for an object modeled facing +z */
  yaw: number;
}

/** Total arclength of the closed loop (segment-wise, wrapping at the end). */
export function loopLength(waypoints: Waypoint[]): number {
  let total = 0;
  for (let i = 0; i < waypoints.length; i++) {
    const a = waypoints[i];
    const b = waypoints[(i + 1) % waypoints.length];
    total += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return total;
}

/**
 * Sample the loop at a given arclength `distance` (already wrapped into [0, total)).
 * Returns position + heading for a constant-speed traversal.
 */
export function pointOnLoop(waypoints: Waypoint[], distance: number): LoopPoint {
  const total = loopLength(waypoints);
  let d = ((distance % total) + total) % total;

  for (let i = 0; i < waypoints.length; i++) {
    const a = waypoints[i];
    const b = waypoints[(i + 1) % waypoints.length];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d <= seg || seg === 0) {
      const t = seg === 0 ? 0 : d / seg;
      return {
        x: a[0] + (b[0] - a[0]) * t,
        z: a[1] + (b[1] - a[1]) * t,
        yaw: Math.atan2(b[0] - a[0], b[1] - a[1]),
      };
    }
    d -= seg;
  }

  const last = waypoints[waypoints.length - 1];
  return { x: last[0], z: last[1], yaw: 0 };
}