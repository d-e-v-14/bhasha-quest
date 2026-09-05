import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import CityScene from './scenes/CityScene';

export default function App() {
  return (
    <>
      <Canvas shadows dpr={[1, 2]} camera={{ position: [10, 8, 22], fov: 60, near: 0.1, far: 500 }}>
        <Suspense fallback={null}>
          <CityScene />
        </Suspense>
      </Canvas>
      <div className="hud">
        <span className="keys">WASD</span> move &nbsp;·&nbsp; <span className="keys">&nbsp;Mouse&nbsp;</span> look
        &nbsp;·&nbsp; click to capture pointer
      </div>
    </>
  );
}