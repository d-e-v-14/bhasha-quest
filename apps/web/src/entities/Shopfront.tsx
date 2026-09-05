import type { ShopfrontSpec } from './cityData';
import { PALETTE } from './cityData';

/**
 * One low-poly bazaar stall: simple box facade with a darker storefront
 * opening, a slanted awning, and a plinth. Facing the road.
 */
export default function Shopfront({ spec }: { spec: ShopfrontSpec }) {
  const { width, height, depth, facade, awning } = spec;

  return (
    <group position={[spec.x, 0, spec.z]} rotation={[0, spec.rotationY, 0]}>
      {/* plinth */}
      <mesh position={[0, 0.3, 0]} receiveShadow>
        <boxGeometry args={[depth + 0.4, 0.6, width + 0.4]} />
        <meshStandardMaterial color={PALETTE.curb} roughness={0.95} />
      </mesh>

      {/* facade block */}
      <mesh position={[0, height / 2 + 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[depth, height, width]} />
        <meshStandardMaterial color={facade} roughness={0.85} />
      </mesh>

      {/* storefront opening (darker inset) */}
      <mesh position={[0.19, 2.1, 0]}>
        <boxGeometry args={[0.15, 3, Math.min(width - 1.2, 3.6)]} />
        <meshStandardMaterial color={PALETTE.accentMaroon} roughness={0.8} />
      </mesh>

      {/* display shelf under awning */}
      <mesh position={[0.5, 0.7, 0]} castShadow>
        <boxGeometry args={[0.5, 1.4, Math.min(width - 1, 3.2)]} />
        <meshStandardMaterial color={PALETTE.sand} roughness={0.9} />
      </mesh>

      {/* slanted awning */}
      <mesh
        position={[0.35, height + 0.55, 0]}
        rotation={[0, 0, -0.18]}
        castShadow
      >
        <boxGeometry args={[2.4, 0.1, width + 0.6]} />
        <meshStandardMaterial color={awning} roughness={0.7} />
      </mesh>
    </group>
  );
}