import { PALETTE } from '../entities/cityData';

/**
 * Large flat ground plane beneath everything (sidewalks / surroundings).
 * Terrain is flat, so the player keeps a fixed foot height.
 */
export default function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
      <planeGeometry args={[600, 600]} />
      <meshStandardMaterial color={PALETTE.sand} roughness={1} />
    </mesh>
  );
}