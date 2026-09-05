import { useEffect, useRef } from 'react';

export interface MoveInput {
  /** +1 = right (local), -1 = left (local) */
  x: number;
  /** +1 = forward (local), -1 = back (local) */
  z: number;
}

/**
 * Tracks WASD key state and exposes a read() function that returns the
 * current local movement vector. Called every frame by the Player.
 */
export function useKeyboardMovement() {
  const keys = useRef({ w: false, a: false, s: false, d: false });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w':
          keys.current.w = true;
          break;
        case 'a':
          keys.current.a = true;
          break;
        case 's':
          keys.current.s = true;
          break;
        case 'd':
          keys.current.d = true;
          break;
      }
    };
    const up = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w':
          keys.current.w = false;
          break;
        case 'a':
          keys.current.a = false;
          break;
        case 's':
          keys.current.s = false;
          break;
        case 'd':
          keys.current.d = false;
          break;
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const read = (): MoveInput => ({
    x: (keys.current.d ? 1 : 0) - (keys.current.a ? 1 : 0),
    z: (keys.current.w ? 1 : 0) - (keys.current.s ? 1 : 0),
  });

  return read;
}