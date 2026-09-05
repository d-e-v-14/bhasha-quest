import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { AUTOS } from './autoData';
import { loopLength, pointOnLoop } from '../lib/loop';

const RICKSHAW_PATH = '/models/cars/auto_rickshaw.glb';
const RICKSHAW_LENGTH = 2.7;

useGLTF.preload(RICKSHAW_PATH);

/**
 * Ambient background traffic. Each auto is a clone of the Sketchfab
 * auto-rickshaw model walking its own data-driven waypoint loop with
 * constant speed. Purely decorative — autos never collide with or block
 * the player.
 */
export default function AutoManager() {
  const groupRefs = useRef<(THREE.Group | null)[]>([]);

  const { scene } = useGLTF(RICKSHAW_PATH);

  const autos = useMemo(() => {
    const base = scene.clone(true);
    base.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    // Fit to the ground: scale so the longest axis matches the target length,
    // then lift so the lowest vertex rests on y = 0.
    const box = new THREE.Box3().setFromObject(base);
    const size = box.getSize(new THREE.Vector3());
    const factor = RICKSHAW_LENGTH / Math.max(size.x, size.z);
    base.scale.setScalar(factor);
    const yOffset = -box.min.y * factor;
    return AUTOS.map(() => ({ object: base.clone(true), yOffset }));
  }, [scene]);

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

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.05);
    for (let i = 0; i < loops.length; i++) {
      const group = groupRefs.current[i];
      if (!group) continue;
      const l = loops[i];
      l.distance += l.speed * step;
      const p = pointOnLoop(l.waypoints, l.distance);
      group.position.set(p.x, autos[i].yOffset, p.z);
      group.rotation.y = p.yaw;
    }
  });

  return (
    <>
      {autos.map((auto, i) => (
        <group key={i} ref={(el) => (groupRefs.current[i] = el)}>
          <primitive object={auto.object} />
        </group>
      ))}
    </>
  );
}
