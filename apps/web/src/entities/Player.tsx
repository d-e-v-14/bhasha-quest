import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useKeyboardMovement } from './PlayerController';
import { useCharacter } from './useCharacter';

const SPEED = 5.0;
const CAM_DIST = 9;
const CAM_HEIGHT = 4.2;
const MOUSE_SENS = 0.0024;
const PITCH_MIN = -0.35;
const PITCH_MAX = 1.15;
const BOUNDS = { minX: -26, maxX: 26, minZ: -54, maxZ: 54 };

/**
 * Third-person player driven by the loaded Indian-teenager character.
 * WASD movement, pointer-locked mouse-look (click the canvas to capture), and a
 * lerp-smoothed over-the-shoulder camera. Idle = Standing clip; moving = the
 * Walking clip (root motion stripped, gait matched to speed).
 */
export default function Player() {
  const { gl, camera } = useThree();
  const group = useRef<THREE.Group>(null);
  const read = useKeyboardMovement();
  const character = useCharacter();

  const yaw = useRef(-Math.PI / 2); // face west (-x) toward the Hawa Mahal
  const pitch = useRef(0.22);
  const pos = useRef(new THREE.Vector3(0, 0, 14));
  const camPos = useRef(new THREE.Vector3(0, CAM_HEIGHT, 0));
  const locked = useRef(false);
  const mode = useRef<'idle' | 'walk' | null>(null);

  const dummyFwd = useMemo(() => new THREE.Vector3(), []);
  const dummyBehind = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const el = gl.domElement;

    const onLockChange = () => {
      locked.current = document.pointerLockElement === el;
    };
    const onClick = () => {
      if (document.pointerLockElement !== el) {
        el.requestPointerLock?.();
      }
    };
    const onMove = (e: MouseEvent) => {
      if (!locked.current) return;
      yaw.current -= e.movementX * MOUSE_SENS;
      pitch.current = THREE.MathUtils.clamp(pitch.current - e.movementY * MOUSE_SENS, PITCH_MIN, PITCH_MAX);
    };

    document.addEventListener('pointerlockchange', onLockChange);
    el.addEventListener('click', onClick);
    document.addEventListener('mousemove', onMove);
    return () => {
      document.removeEventListener('pointerlockchange', onLockChange);
      el.removeEventListener('click', onClick);
      document.removeEventListener('mousemove', onMove);
    };
  }, [gl]);

  useFrame((_, dt) => {
    const input = read();
    const step = Math.min(dt, 0.05);

    const { walkAction, idleAction, mixer } = character;

    // direction vectors from yaw
    dummyFwd.set(Math.sin(yaw.current), 0, Math.cos(yaw.current));
    const rightX = Math.cos(yaw.current);
    const rightZ = -Math.sin(yaw.current);

    const dx = dummyFwd.x * input.z + rightX * input.x;
    const dz = dummyFwd.z * input.z + rightZ * input.x;
    const speed = Math.hypot(dx, dz);
    const moving = speed > 0.001;

    if (moving) {
      const s = (SPEED * step) / speed;
      pos.current.x = THREE.MathUtils.clamp(pos.current.x + dx * s, BOUNDS.minX, BOUNDS.maxX);
      pos.current.z = THREE.MathUtils.clamp(pos.current.z + dz * s, BOUNDS.minZ, BOUNDS.maxZ);
      group.current?.quaternion.setFromEuler(new THREE.Euler(0, Math.atan2(dx, dz), 0));
    }

    // animation state machine: crossfade between standing (idle) and walking
    const nextMode = moving ? 'walk' : 'idle';
    if (mode.current !== nextMode) {
      mode.current = nextMode;
      if (nextMode === 'walk') {
        walkAction.reset().fadeIn(0.2).play();
        idleAction.fadeOut(0.2);
      } else {
        idleAction.reset().fadeIn(0.2).play();
        walkAction.fadeOut(0.2);
      }
    }
    mixer.update(dt);

    group.current?.position.copy(pos.current);

    // smoothed camera behind/above the player
    dummyBehind
      .set(-Math.sin(yaw.current), 0, -Math.cos(yaw.current))
      .multiplyScalar(Math.cos(pitch.current) * CAM_DIST);
    const desired = pos.current
      .clone()
      .add(dummyBehind)
      .add(new THREE.Vector3(0, CAM_HEIGHT + Math.sin(pitch.current) * CAM_DIST, 0));

    camPos.current.lerp(desired, 1 - Math.pow(0.0005, step));
    camera.position.copy(camPos.current);
    camera.lookAt(pos.current.x, pos.current.y + 1.6, pos.current.z);
  });

  return (
    <group ref={group} position={[0, 0, 14]}>
      <primitive object={character.object} />
    </group>
  );
}