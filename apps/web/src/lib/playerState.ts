import * as THREE from 'three';

/**
 * Shared, mutable player position. The Player writes to this every frame;
 * interaction systems read it without coupling to the Player component.
 */
export const playerPosition = new THREE.Vector3(0, 0, 14);
