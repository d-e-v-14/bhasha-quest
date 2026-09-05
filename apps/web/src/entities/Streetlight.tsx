import { Instances, Instance } from '@react-three/drei';
import { STREETLIGHTS } from './cityData';

// Arm extends from the pole along local +x; offset rotates with rotationY.
function armOffset(rotationY: number): [number, number] {
  return [0.45 * Math.cos(rotationY), -0.45 * Math.sin(rotationY)];
}

/**
 * Instanced lampposts along both sidewalks: shared pole geometry, a small
 * arm, and a warm emissive lamp head.
 */
export default function Streetlight() {
  return (
    <group>
      <Instances limit={STREETLIGHTS.length}>
        <cylinderGeometry args={[0.07, 0.1, 5, 8]} />
        <meshStandardMaterial color="#33363d" roughness={0.6} metalness={0.4} />
        {STREETLIGHTS.map((s) => (
          <Instance key={`${s.x}-${s.z}`} position={[s.x, 2.5, s.z]} rotation={[0, s.rotationY, 0]} />
        ))}
      </Instances>

      <Instances limit={STREETLIGHTS.length}>
        <boxGeometry args={[0.06, 0.5, 0.9]} />
        <meshStandardMaterial color="#33363d" roughness={0.6} metalness={0.4} />
        {STREETLIGHTS.map((s) => {
          const [ox, oz] = armOffset(s.rotationY);
          return (
            <Instance key={`${s.x}-${s.z}-arm`} position={[s.x + ox, 5.0, s.z + oz]} rotation={[0, s.rotationY, 0]} />
          );
        })}
      </Instances>

      <Instances limit={STREETLIGHTS.length}>
        <boxGeometry args={[0.55, 0.18, 0.35]} />
        <meshStandardMaterial
          color="#ffe9b0"
          emissive="#ffcf7d"
          emissiveIntensity={0.9}
        />
        {STREETLIGHTS.map((s) => {
          const [ox, oz] = armOffset(s.rotationY);
          return (
            <Instance key={`${s.x}-${s.z}-head`} position={[s.x + ox, 5.25, s.z + oz]} rotation={[0, s.rotationY, 0]} />
          );
        })}
      </Instances>
    </group>
  );
}