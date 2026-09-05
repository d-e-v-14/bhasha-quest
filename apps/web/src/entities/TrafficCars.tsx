import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CARS, type CarModel } from './autoData';
import { loopLength, pointOnLoop } from '../lib/loop';

const MODEL_PATHS: Record<CarModel, string> = {
  scorpio: '/models/cars/scorpio.glb',
  nano: '/models/cars/tata_nano.glb',
  alto: '/models/cars/alto.glb',
  scross: '/models/cars/scross.glb',
  carry: '/models/cars/carry.glb',
};

Object.values(MODEL_PATHS).forEach((p) => useGLTF.preload(p));

/**
 * Ambient traffic cars (Sketchfab GLBs) sharing the same data-driven loop
 * system as the rickshaws. Each car is one cloned scene walking its loop;
 * purely decorative, never colliding with the player.
 */
export default function TrafficCars() {
  const groupRefs = useRef<(THREE.Group | null)[]>([]);

  const scorpio = useGLTF(MODEL_PATHS.scorpio);
  const nano = useGLTF(MODEL_PATHS.nano);
  const alto = useGLTF(MODEL_PATHS.alto);
  const scross = useGLTF(MODEL_PATHS.scross);
  const carry = useGLTF(MODEL_PATHS.carry);

  const models = useMemo<Record<CarModel, { object: THREE.Group; yOffset: number }>>(() => {
    const sources: Record<CarModel, THREE.Group> = {
      scorpio: scorpio.scene,
      nano: nano.scene,
      alto: alto.scene,
      scross: scross.scene,
      carry: carry.scene,
    };
    const prepared = {} as Record<CarModel, { object: THREE.Group; yOffset: number }>;
    for (const car of CARS) {
      const clone = sources[car.model].clone(true);
      clone.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      // Fit to the ground: scale so the longest axis matches targetLength,
      // then lift so the lowest vertex rests on y = 0.
      const box = new THREE.Box3().setFromObject(clone);
      const size = box.getSize(new THREE.Vector3());
      const factor = car.targetLength / Math.max(size.x, size.z);
      clone.scale.setScalar(factor);
      prepared[car.model] = { object: clone, yOffset: -box.min.y * factor };
    }
    return prepared;
  }, [scorpio.scene, nano.scene, alto.scene, scross.scene, carry.scene]);

  const loops = useMemo(
    () =>
      CARS.map((car) => ({
        total: loopLength(car.waypoints),
        waypoints: car.waypoints,
        speed: car.speed,
        baseYaw: car.baseYaw,
        distance: car.phase * loopLength(car.waypoints),
        yOffset: models[car.model].yOffset,
      })),
    [models],
  );

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.05);
    for (let i = 0; i < loops.length; i++) {
      const group = groupRefs.current[i];
      if (!group) continue;
      const l = loops[i];
      l.distance += l.speed * step;
      const p = pointOnLoop(l.waypoints, l.distance);
      group.position.set(p.x, l.yOffset, p.z);
      group.rotation.y = p.yaw + l.baseYaw;
    }
  });

  return (
    <>
      {CARS.map((car, i) => (
        <group key={car.model} ref={(el) => (groupRefs.current[i] = el)}>
          <primitive object={models[car.model].object} />
        </group>
      ))}
    </>
  );
}
