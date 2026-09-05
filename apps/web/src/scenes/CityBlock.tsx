import Road from '../entities/Road';
import HawaMahal from '../entities/HawaMahal';
import Shopfront from '../entities/Shopfront';
import Streetlight from '../entities/Streetlight';
import AutoManager from '../entities/AutoManager';
import { CHHATRIS, PALETTE, SHOPFRONTS } from '../entities/cityData';

/**
 * Composition root for one Jaipur street block: the road, the Hawa Mahal
 * facade on the west, bazaar stalls on the east, streetlights, background
 * chhatri silhouettes, and ambient auto traffic.
 */
export default function CityBlock() {
  return (
    <group>
      <Road />

      <HawaMahal />

      {SHOPFRONTS.map((spec) => (
        <Shopfront key={`${spec.x}-${spec.z}`} spec={spec} />
      ))}

      <Streetlight />

      {/* background chhatri Pavilion silhouettes */}
      {CHHATRIS.map((c) => (
        <group key={`${c.x}-${c.z}`} position={[c.x, 0, c.z]}>
          <mesh position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[2, 2, 1, 10]} />
            <meshStandardMaterial color={PALETTE.terracotta} roughness={1} />
          </mesh>
          <mesh position={[0, 0.5 + c.r * 0.85, 0]} castShadow>
            <sphereGeometry args={[c.r, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={PALETTE.facadePink} roughness={1} />
          </mesh>
          <mesh position={[0, 0.5 + c.r * 1.7, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.14, 0.8, 6]} />
            <meshStandardMaterial color={PALETTE.accentMaroon} roughness={1} />
          </mesh>
        </group>
      ))}

      <AutoManager />
    </group>
  );
}