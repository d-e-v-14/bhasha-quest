import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AUTOS } from './autoData';
import { createRickshawGeometry } from './autoGeometry';
import { loopLength, pointOnLoop } from '../lib/loop';

/**
 * Ambient background traffic. All autos share one InstancedMesh (merged,
 * vertex-colored rickshaw geometry); each instance moves along its own
 * data-driven waypoint loop with constant speed. Purely decorative — autos
 * never collide with or block the player.
 */
export default function AutoManager() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const geometry = useMemo(() => createRickshawGeometry(), []);

  const loops = useMemo(
    () =>
      AUTOS.map((a) => ({
        total: loopLength(a.waypoints),
        waypoints: a.waypoints,
        speed: a.speed,
        distance: a.phase * loopLength(a.waypoints),
      })),
    [],
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < loops.length; i++) {
      const p = pointOnLoop(loops[i].waypoints, loops[i].distance);
      dummy.position.set(p.x, 0, p.z);
      dummy.rotation.set(0, p.yaw, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [dummy, geometry, loops]);

  useFrame((_, dt) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const step = Math.min(dt, 0.05);
    for (let i = 0; i < loops.length; i++) {
      const l = loops[i];
      l.distance += l.speed * step;
      const p = pointOnLoop(l.waypoints, l.distance);
      dummy.position.set(p.x, 0, p.z);
      dummy.rotation.set(0, p.yaw, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, AUTOS.length]} castShadow receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.55} metalness={0.2} />
    </instancedMesh>
  );
}