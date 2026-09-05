import { Instances, Instance } from '@react-three/drei';
import { INTERSECTION, PALETTE, ROAD } from './cityData';

// Main-road segments that stop at the intersection (cross road z -41..-31).
const SEGMENTS = [
  { from: -ROAD.length / 2, to: INTERSECTION.zStart }, // north: z -60..-41
  { from: INTERSECTION.zEnd, to: ROAD.length / 2 }, // south: z -31..60
];

function dashes() {
  const segments: Array<{ x: number; z: number }> = [];
  const half = ROAD.length / 2;
  const step = 4;
  for (let z = -half + 2; z < half; z += step) {
    if (z > INTERSECTION.zStart && z < INTERSECTION.zEnd) continue;
    segments.push({ x: 0, z });
  }
  return segments;
}

/**
 * Flat road surface, sidewalks + curbs on both sides, and basic lane markings.
 * Sidewalks, curbs and edge lines break around the cross-road intersection.
 */
export default function Road() {
  return (
    <group>
      {/* road surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow>
        <planeGeometry args={[ROAD.width, ROAD.length]} />
        <meshStandardMaterial color={PALETTE.road} roughness={0.95} />
      </mesh>

      {/* sidewalks (two segments per side, broken at the intersection) */}
      {SEGMENTS.map((seg) => (
        <group key={`sidewalk-${seg.from}`}>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[-(ROAD.width / 2 + ROAD.sidewalkWidth / 2), 0.02, (seg.from + seg.to) / 2]}
            receiveShadow
          >
            <planeGeometry args={[ROAD.sidewalkWidth, seg.to - seg.from]} />
            <meshStandardMaterial color={PALETTE.sand} roughness={1} />
          </mesh>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[ROAD.width / 2 + ROAD.sidewalkWidth / 2, 0.02, (seg.from + seg.to) / 2]}
            receiveShadow
          >
            <planeGeometry args={[ROAD.sidewalkWidth, seg.to - seg.from]} />
            <meshStandardMaterial color={PALETTE.sand} roughness={1} />
          </mesh>
        </group>
      ))}

      {/* curbs */}
      {SEGMENTS.map((seg) => (
        <group key={`curb-${seg.from}`}>
          <mesh position={[-(ROAD.width / 2 - 0.05), 0.08, (seg.from + seg.to) / 2]} receiveShadow>
            <boxGeometry args={[0.25, 0.18, seg.to - seg.from]} />
            <meshStandardMaterial color={PALETTE.curb} roughness={0.9} />
          </mesh>
          <mesh position={[ROAD.width / 2 - 0.05, 0.08, (seg.from + seg.to) / 2]} receiveShadow>
            <boxGeometry args={[0.25, 0.18, seg.to - seg.from]} />
            <meshStandardMaterial color={PALETTE.curb} roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* white edge lines */}
      {SEGMENTS.map((seg) => (
        <group key={`edge-${seg.from}`}>
          <mesh position={[-5.6, 0.01, (seg.from + seg.to) / 2]} receiveShadow>
            <boxGeometry args={[0.16, 0.02, seg.to - seg.from - 2]} />
            <meshStandardMaterial color={PALETTE.roadEdge} roughness={0.8} />
          </mesh>
          <mesh position={[5.6, 0.01, (seg.from + seg.to) / 2]} receiveShadow>
            <boxGeometry args={[0.16, 0.02, seg.to - seg.from - 2]} />
            <meshStandardMaterial color={PALETTE.roadEdge} roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* center dashed line (instanced) */}
      <Instances limit={dashes().length}>
        <boxGeometry args={[0.14, 0.02, 1.8]} />
        <meshStandardMaterial color={PALETTE.laneDash} roughness={0.8} />
        {dashes().map((d) => (
          <Instance key={d.z} position={[d.x, 0.015, d.z]} />
        ))}
      </Instances>

      {/* white dashed lane dividers (instanced) */}
      <Instances limit={dashes().length * 2}>
        <boxGeometry args={[0.1, 0.02, 2.4]} />
        <meshStandardMaterial color={PALETTE.roadEdge} roughness={0.85} />
        {dashes().map((d) => (
          <Instance key={`l${d.z}`} position={[-3.2, 0.015, d.z]} />
        ))}
        {dashes().map((d) => (
          <Instance key={`r${d.z}`} position={[3.2, 0.015, d.z]} />
        ))}
      </Instances>
    </group>
  );
}
