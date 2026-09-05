import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { INTERACTABLES } from '../data/interactables';
import { PALETTE } from './cityData';

const RICKSHAW_PATH = '/models/cars/auto_rickshaw.glb';

/**
 * Static world markers for quests whose NPC has no dedicated 3D model yet:
 * an Auto Stand (parked rickshaw + sign) and a City Palace gate. Positions
 * come from the interactables registry so prompts always line up.
 */
export default function QuestAnchors() {
  const autoStand = INTERACTABLES.find((i) => i.id === 'auto-stand');
  const palaceGate = INTERACTABLES.find((i) => i.id === 'city-palace-gate');

  const { scene } = useGLTF(RICKSHAW_PATH);

  const parked = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const factor = 2.7 / Math.max(size.x, size.z);
    clone.scale.setScalar(factor);
    clone.position.y = -box.min.y * factor;
    return clone;
  }, [scene]);

  return (
    <group>
      {autoStand && (
        <group position={[autoStand.x, 0, autoStand.z]}>
          {/* parked auto, facing the road (-x) */}
          <primitive object={parked} rotation={[0, -Math.PI / 2, 0]} />
          {/* stand sign */}
          <mesh position={[1.2, 1.5, -1.6]} castShadow>
            <cylinderGeometry args={[0.06, 0.09, 3, 8]} />
            <meshStandardMaterial color="#33363d" roughness={0.6} metalness={0.4} />
          </mesh>
          <mesh position={[1.2, 3.1, -1.6]} castShadow>
            <boxGeometry args={[0.06, 0.55, 1.2]} />
            <meshStandardMaterial color={PALETTE.awning} roughness={0.7} />
          </mesh>
        </group>
      )}

      {palaceGate && (
        <group position={[palaceGate.x, 0, palaceGate.z]}>
          <mesh position={[0, 2.1, -2.6]} castShadow receiveShadow>
            <boxGeometry args={[1.1, 4.2, 1.1]} />
            <meshStandardMaterial color={PALETTE.sand} roughness={0.9} />
          </mesh>
          <mesh position={[0, 2.1, 2.6]} castShadow receiveShadow>
            <boxGeometry args={[1.1, 4.2, 1.1]} />
            <meshStandardMaterial color={PALETTE.sand} roughness={0.9} />
          </mesh>
          <mesh position={[0, 4.6, 0]} castShadow>
            <boxGeometry args={[1.3, 0.8, 6.4]} />
            <meshStandardMaterial color={PALETTE.terracotta} roughness={0.85} />
          </mesh>
          <mesh position={[0, 5.4, 0]} castShadow>
            <sphereGeometry args={[0.7, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={PALETTE.accentMaroon} roughness={0.9} />
          </mesh>
        </group>
      )}
    </group>
  );
}
