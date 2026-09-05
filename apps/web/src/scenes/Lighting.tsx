import { Sky } from '@react-three/drei';

/**
 * Warm ambient + directional rig with a dusk Sky gradient to match the
 * terracotta "Pink City" palette.
 */
export default function Lighting() {
  return (
    <>
      <ambientLight intensity={0.55} color="#ffcfa0" />
      <hemisphereLight args={['#ffe3be', '#54382a', 0.55]} />
      <directionalLight
        position={[24, 32, 14]}
        intensity={1.7}
        color="#ffdba8"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-camera-far={120}
      />
      <Sky
        distance={500}
        sunPosition={[40, 24, -30]}
        turbidity={6}
        rayleigh={1.6}
        mieCoefficient={0.006}
        mieDirectionalG={0.85}
      />
    </>
  );
}