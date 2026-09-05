import { Instances, Instance } from '@react-three/drei';
import { useMemo } from 'react';
import { HAWA, PALETTE } from './cityData';

/**
 * Large flat Hawa Mahal facade on the west side of the road, facing +x.
 * The honeycomb lattice of jharokha (arched window) slots is an instanced
 * grid of small boxes across the facade face — reads as a single mesh,
 * trivially swappable for a glTF + useGLTF later.
 */
export default function HawaMahal() {
  const { frontX, depth, width, height, zCenter } = HAWA;
  const halfW = width / 2;
  const baseY = 0;
  const centerX = frontX - depth / 2;

  const windows = useMemo(() => {
    const pts: Array<[number, number, number]> = [];
    const margin = 1.4;
    const inner = width - margin * 2;
    const innerY = height - margin * 2;
for (let c = 0; c < HAWA.cols; c++) {
        for (let r = 0; r < HAWA.rows; r++) {
          const tz = c / Math.max(HAWA.cols - 1, 1);
          const ty = r / Math.max(HAWA.rows - 1, 1);
          const z = zCenter - halfW + margin + inner * tz;
          const y = baseY + margin + innerY * ty;
          pts.push([frontX - HAWA.windowDepth - 0.02, y, z]);
        }
      }
    return pts;
  }, [frontX, zCenter, halfW]);

  const ledges = useMemo(() => {
    const l: Array<number> = [];
    for (let y = 8; y < height - 2; y += 6) l.push(y);
    return l;
  }, [height]);

  return (
    <group position={[0, 0, 0]}>
      {/* plinth */}
      <mesh position={[centerX, 0.4, zCenter]} receiveShadow>
        <boxGeometry args={[depth + 1, 0.8, width + 1]} />
        <meshStandardMaterial color={PALETTE.facadeDeep} roughness={0.9} />
      </mesh>

      {/* main facade block */}
      <mesh position={[centerX, height / 2, zCenter]} castShadow receiveShadow>
        <boxGeometry args={[depth, height, width]} />
        <meshStandardMaterial color={PALETTE.facadePink} roughness={0.85} />
      </mesh>

      {/* tier ledges across the facade */}
      {ledges.map((y) => (
        <mesh key={y} position={[frontX - 0.05, y, zCenter]} castShadow>
          <boxGeometry args={[0.45, 0.35, width + 0.2]} />
          <meshStandardMaterial color={PALETTE.facadeDeep} roughness={0.9} />
        </mesh>
      ))}

      {/* instanced jharokha lattice windows */}
      <Instances limit={windows.length}>
        <boxGeometry args={[HAWA.windowDepth, HAWA.windowH, HAWA.windowW]} />
        <meshStandardMaterial color={PALETTE.accentMaroon} roughness={0.7} />
        {windows.map((w) => (
          <Instance key={`${w[1]}-${w[2]}`} position={[w[0], w[1], w[2]]} />
        ))}
      </Instances>

      {/* central entrance arch */}
      <mesh position={[frontX - 0.35, 3, zCenter]} castShadow>
        <boxGeometry args={[0.8, 6, 4]} />
        <meshStandardMaterial color={PALETTE.accentMaroon} roughness={0.8} />
      </mesh>

      {/* chhatri dome + finial on top center */}
      <mesh position={[frontX - 0.4, height + 0.9, zCenter]} castShadow>
        <sphereGeometry args={[1.7, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={PALETTE.facadeDeep} roughness={0.8} />
      </mesh>
      <mesh position={[frontX - 0.4, height + 2.9, zCenter]} castShadow>
        <cylinderGeometry args={[0.15, 0.3, 1.4, 8]} />
        <meshStandardMaterial color={PALETTE.terracotta} roughness={0.7} />
      </mesh>

      {/* small domes along the roofline */}
      <group>
        {(Array.from({ length: 5 }) as number[]).map((_, i) => {
          const t = (i + 0.5) / 5;
          const z = zCenter - halfW + 2 + (width - 4) * t;
          return (
            <mesh key={i} position={[frontX - 0.35, height + 0.7, z]} castShadow>
              <sphereGeometry args={[0.9, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color={PALETTE.facadePink} roughness={0.85} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}