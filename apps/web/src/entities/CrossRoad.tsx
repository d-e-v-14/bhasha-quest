import { Instances, Instance } from '@react-three/drei';
import { CROSS_ROAD, PALETTE } from './cityData';

// Cross road runs along X; two segments on either side of the main road
// (surface x -80..-6 and 6..80). Sidewalks break a bit wider (|x| 9) so they
// never overlap the main road's sidewalks.
const SURFACE_SEGMENTS = [
  { from: -CROSS_ROAD.length / 2, to: -6 },
  { from: 6, to: CROSS_ROAD.length / 2 },
];
const SIDEWALK_SEGMENTS = [
  { from: -CROSS_ROAD.length / 2, to: -9 },
  { from: 9, to: CROSS_ROAD.length / 2 },
];

// Lanes: road center z = CROSS_ROAD.zCenter, half-width 5 (z -41..-31).
// Lane dividers mirror the main road: center ± 3.2, edge lines center ± 4.6.
const LANE_OFFSETS = [-3.2, 3.2];

function dashes() {
  const segments: Array<{ x: number; z: number }> = [];
  const step = 4;
  for (const seg of SURFACE_SEGMENTS) {
    for (let x = seg.from + 2; x < seg.to - 2; x += step) {
      if (x > -9 && x < 9) continue;
      segments.push({ x, z: 0 });
    }
  }
  return segments;
}

/**
 * East-west cross road intersecting the main road at z = CROSS_ROAD.zCenter.
 * Same treatment as the main road: surface, sidewalks, curbs, edge lines and
 * two-way lane markings, all built from PALETTE colors.
 */
export default function CrossRoad() {
  const z = CROSS_ROAD.zCenter;
  const half = CROSS_ROAD.width / 2;
  const mid = (seg: { from: number; to: number }) => (seg.from + seg.to) / 2;
  const len = (seg: { from: number; to: number }) => seg.to - seg.from;

  return (
    <group>
      {/* road surface (both sides of the main road) */}
      {SURFACE_SEGMENTS.map((seg) => (
        <mesh
          key={`surf-${seg.from}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[mid(seg), -0.06, z]}
          receiveShadow
        >
          <planeGeometry args={[len(seg), CROSS_ROAD.width]} />
          <meshStandardMaterial color={PALETTE.road} roughness={0.95} />
        </mesh>
      ))}

      {/* sidewalks (north + south, broken around the main road) */}
      {SIDEWALK_SEGMENTS.map((seg) => (
        <group key={`walk-${seg.from}`}>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[mid(seg), 0.02, z - half - CROSS_ROAD.sidewalkWidth / 2]}
            receiveShadow
          >
            <planeGeometry args={[len(seg), CROSS_ROAD.sidewalkWidth]} />
            <meshStandardMaterial color={PALETTE.sand} roughness={1} />
          </mesh>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[mid(seg), 0.02, z + half + CROSS_ROAD.sidewalkWidth / 2]}
            receiveShadow
          >
            <planeGeometry args={[len(seg), CROSS_ROAD.sidewalkWidth]} />
            <meshStandardMaterial color={PALETTE.sand} roughness={1} />
          </mesh>
        </group>
      ))}

      {/* curbs */}
      {SURFACE_SEGMENTS.map((seg) => (
        <group key={`curb-${seg.from}`}>
          <mesh position={[mid(seg), 0.08, z - half + 0.05]} receiveShadow>
            <boxGeometry args={[len(seg), 0.18, 0.25]} />
            <meshStandardMaterial color={PALETTE.curb} roughness={0.9} />
          </mesh>
          <mesh position={[mid(seg), 0.08, z + half - 0.05]} receiveShadow>
            <boxGeometry args={[len(seg), 0.18, 0.25]} />
            <meshStandardMaterial color={PALETTE.curb} roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* white edge lines */}
      {SURFACE_SEGMENTS.map((seg) => (
        <group key={`edge-${seg.from}`}>
          <mesh position={[mid(seg), 0.01, z - 4.6]} receiveShadow>
            <boxGeometry args={[len(seg) - 2, 0.02, 0.16]} />
            <meshStandardMaterial color={PALETTE.roadEdge} roughness={0.8} />
          </mesh>
          <mesh position={[mid(seg), 0.01, z + 4.6]} receiveShadow>
            <boxGeometry args={[len(seg) - 2, 0.02, 0.16]} />
            <meshStandardMaterial color={PALETTE.roadEdge} roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* center dashed line (instanced) */}
      <Instances limit={dashes().length}>
        <boxGeometry args={[1.8, 0.02, 0.14]} />
        <meshStandardMaterial color={PALETTE.laneDash} roughness={0.8} />
        {dashes().map((d) => (
          <Instance key={d.x} position={[d.x, 0.015, z + d.z]} />
        ))}
      </Instances>

      {/* white dashed lane dividers (instanced) */}
      <Instances limit={dashes().length * 2}>
        <boxGeometry args={[2.4, 0.02, 0.1]} />
        <meshStandardMaterial color={PALETTE.roadEdge} roughness={0.85} />
        {dashes().map((d) => (
          <Instance key={`a${d.x}`} position={[d.x, 0.015, z + LANE_OFFSETS[0] + d.z]} />
        ))}
        {dashes().map((d) => (
          <Instance key={`b${d.x}`} position={[d.x, 0.015, z + LANE_OFFSETS[1] + d.z]} />
        ))}
      </Instances>
    </group>
  );
}
