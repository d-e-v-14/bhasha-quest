import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function colorize(geometry: THREE.BufferGeometry, hex: number): THREE.BufferGeometry {
  const c = new THREE.Color(hex);
  const n = geometry.attributes.position.count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/**
 * Placeholder low-poly auto-rickshaw built from primitives and merged into a
 * single vertex-colored geometry so all autos share one InstancedMesh.
 * Modeled facing +z, wheels resting on y = 0.
 */
export function createRickshawGeometry(): THREE.BufferGeometry {
  const AXLE_Y = 0.3;
  const WHEEL_R = 0.3;

  const parts: THREE.BufferGeometry[] = [];

  // body
  const body = new THREE.BoxGeometry(1.35, 0.85, 1.7);
  body.translate(0, AXLE_Y + 0.1, 0);
  parts.push(colorize(body, 0xf2b632)); // rickshaw yellow

  // lower chassis / step
  const chassis = new THREE.BoxGeometry(1.0, 0.16, 1.9);
  chassis.translate(0, 0.12, 0);
  parts.push(colorize(chassis, 0x22242a));

  // backrest + canopy (dark, with yellow top band)
  const back = new THREE.BoxGeometry(1.15, 0.7, 0.12);
  back.translate(0, 1.0, -0.75);
  parts.push(colorize(back, 0x9a3a30));
  const canopy = new THREE.BoxGeometry(1.2, 0.12, 1.15);
  canopy.translate(0, 1.35, -0.1);
  parts.push(colorize(canopy, 0x11141a));
  const canopyTop = new THREE.BoxGeometry(1.24, 0.12, 1.19);
  canopyTop.translate(0, 1.5, -0.1);
  parts.push(colorize(canopyTop, 0xf2b632));

  // front visor shield
  const visor = new THREE.BoxGeometry(1.15, 0.55, 0.1);
  visor.translate(0, 0.75, 0.85);
  parts.push(colorize(visor, 0x2c3138));

  // wheels: two rear, one front
  const wheelGeo = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.14, 14);
  wheelGeo.rotateX(Math.PI / 2);
  const wheels: [number, number, number][] = [
    [0.62, AXLE_Y, 0.55],
    [-0.62, AXLE_Y, 0.55],
    [0, AXLE_Y, -0.7],
  ];
  for (const [wx, wy, wz] of wheels) {
    const w = wheelGeo.clone();
    w.translate(wx, wy, wz);
    parts.push(colorize(w, 0x101216));
  }

  // rear mudguard + handlebar hint
  const bar = new THREE.BoxGeometry(0.6, 0.08, 0.08);
  bar.translate(0, 1.05, 0.86);
  parts.push(colorize(bar, 0x3a3f47));

  const merged = mergeGeometries(parts);
  if (!merged) throw new Error('Failed to merge rickshaw geometry');
  return merged;
}