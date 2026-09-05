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
export function makeLoop(xWest = -3.4, xEast = 3.4, zEnd = 62, reverse = false): Waypoint[] {
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
  // cross road (E-W) at z = -36: one auto per lane, wrapping at x ±80
  { waypoints: [[-80, -32.6], [80, -32.6], [80, -39.4], [-80, -39.4]], speed: 6.1, phase: 0.2 },
  { waypoints: [[-80, -39.4], [80, -39.4], [80, -32.6], [-80, -32.6]], speed: 5.6, phase: 0.65 },
];

// Sketchfab car models (see public/models/cars/) used as ambient traffic.
// Each entry = one car on its own loop, same convention as AUTOS.
export type CarModel = 'scorpio' | 'nano' | 'alto' | 'scross' | 'carry';

export interface CarSpec {
  model: CarModel;
  waypoints: Waypoint[];
  /** units per second */
  speed: number;
  /** start offset as a fraction of the loop length (0..1) */
  phase: number;
  /** extra yaw added to the loop heading, to align the model's forward axis */
  baseYaw: number;
  /** desired overall length in world units; model is uniformly scaled to fit */
  targetLength: number;
}

export const CARS: CarSpec[] = [
  // Scorpio: model front faces -z, so flip 180° to face the travel direction.
  { model: 'scorpio', waypoints: makeLoop(-3.2, 3.2, 58, true), speed: 6.2, phase: 0.5, baseYaw: Math.PI, targetLength: 3.6 },
  // Tata Nano: long axis along x, so +90° aligns it with the road direction.
  { model: 'nano', waypoints: [[-80, -32.6], [80, -32.6], [80, -39.4], [-80, -39.4]], speed: 5.4, phase: 0.35, baseYaw: Math.PI / 2, targetLength: 2.9 },
  // Maruti Alto: front faces +z.
  { model: 'alto', waypoints: makeLoop(), speed: 6.0, phase: 0.85, baseYaw: 0, targetLength: 3.4 },
  // Suzuki S-Cross: front faces +z; joins the reverse lane of the main road.
  { model: 'scross', waypoints: makeLoop(-3.2, 3.2, 58, true), speed: 5.6, phase: 0.6, baseYaw: 0, targetLength: 4.4 },
  // Suzuki Carry van: front faces +z; westbound lane of the cross road.
  { model: 'carry', waypoints: [[-80, -39.4], [80, -39.4], [80, -32.6], [-80, -32.6]], speed: 5.2, phase: 0.45, baseYaw: 0, targetLength: 3.4 },
];