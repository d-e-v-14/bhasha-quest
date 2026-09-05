// Central city layout + color data for the Jaipur street block.
// Everything geometry-related reads from here so real glTF models can
// drop in per component later without re-architecting the scene.

export const PALETTE = {
  // Jaipur "Pink City" tones
  facadePink: '#e4a092',
  facadeDeep: '#d88a7c',
  terracotta: '#c05b3f',
  accentMaroon: '#7a2f2a',
  awning: '#3f6e5a',
  sand: '#c9a87c',
  curb: '#8a7a6a',
  road: '#4a4246',
  roadEdge: '#d8d0c6',
  laneDash: '#f2c14e',
  shadowWarm: '#5a3a2a',
} as const;

// World axes: X = east/west (west negative), Z = north/south, Y = up.
// Road runs along Z. Hawa Mahal sits on the WEST (-x) side facing +x.
export const ROAD = {
  width: 12, // x from -6..6
  length: 120, // z from -60..60
  sidewalkWidth: 3,
  centerX: 0,
} as const;

export const HAWA = {
  // West facade, front face at x = -14, facing +x toward the road.
  frontX: -14,
  depth: 2.5,
  width: 30, // spans z
  height: 27, // spans y
  zCenter: 0,
  // jharokha lattice grid (instanced)
  cols: 14,
  rows: 16,
  windowW: 1.2,
  windowH: 1.5,
  windowDepth: 0.35,
} as const;

export interface ShopfrontSpec {
  x: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  rotationY: number;
  facade: string;
  awning: string;
}

// Bazaar stalls on the EAST (+x) side, facing -x toward the road.
export const SHOPFRONTS: ShopfrontSpec[] = [
  { x: 14, z: -18, width: 5, height: 5, depth: 4, rotationY: Math.PI, facade: PALETTE.facadePink, awning: PALETTE.awning },
  { x: 14, z: 0, width: 6, height: 6, depth: 5, rotationY: Math.PI, facade: PALETTE.terracotta, awning: PALETTE.accentMaroon },
  { x: 14, z: 18, width: 5, height: 5.5, depth: 4, rotationY: Math.PI, facade: PALETTE.facadeDeep, awning: PALETTE.awning },
];

export interface StreetlightSpec {
  x: number;
  z: number;
  rotationY: number;
}

// Few lampposts lining both sidewalks.
export const STREETLIGHTS: StreetlightSpec[] = [
  { x: -7.5, z: -22, rotationY: 0 },
  { x: -7.5, z: 0, rotationY: 0 },
  { x: -7.5, z: 22, rotationY: 0 },
  { x: 7.5, z: -22, rotationY: Math.PI },
  { x: 7.5, z: 0, rotationY: Math.PI },
  { x: 7.5, z: 22, rotationY: Math.PI },
];

// Background chhatri (small domed pavilion) silhouettes behind Hawa Mahal.
export const CHHATRIS = [
  { x: -26, z: -20, r: 2.4 },
  { x: -24, z: 6, r: 1.8 },
  { x: -27, z: 22, r: 2.6 },
];
