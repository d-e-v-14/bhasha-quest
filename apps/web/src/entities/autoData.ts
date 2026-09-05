// Data-driven ambient autos. Each entry = one auto on its own loop path.
// Adding more traffic is just appending to this array.

export type Waypoint = [x: number, z: number];

export interface AutoSpec {
  waypoints: Waypoint[];
  /** units per second */
  speed: number;
  /** start offset as a fraction of the loop length (0..1) */
  phase: number;
}

// Build a rectangular loop down the east lane and up the west lane,
// wrapping around at both ends (off the visible block) so driving is continuous.
function makeLoop(xWest = -3.4, xEast = 3.4, zEnd = 62, reverse = false): Waypoint[] {
  const loop: Waypoint[] = [
    [xWest, zEnd],
    [xEast, zEnd],
    [xEast, -zEnd],
    [xWest, -zEnd],
  ];
  return reverse ? [...loop].reverse() : loop;
}

export const AUTOS: AutoSpec[] = [
  { waypoints: makeLoop(), speed: 6.5, phase: 0 },
  { waypoints: makeLoop(), speed: 5.4, phase: 0.28 },
  { waypoints: makeLoop(-3.2, 3.2, 58, true), speed: 7.2, phase: 0.14 },
  { waypoints: makeLoop(), speed: 4.8, phase: 0.55 },
  { waypoints: makeLoop(-3.2, 3.2, 58, true), speed: 5.9, phase: 0.72 },
];