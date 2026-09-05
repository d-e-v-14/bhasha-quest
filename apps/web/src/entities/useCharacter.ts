import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { useMemo } from 'react';

export const CHARACTER_URL = '/characters/indian teenager.fbx';
export const WALK_URL = '/characters/animations/Walking.fbx';
export const STAND_URL = '/characters/animations/Standing.fbx';

const STRIDE_METERS = 1.55;
const LOOP_SECONDS = 1.033;
const PLAYER_WALK_SPEED = 5.0;

/**
 * Rebuilds a single, clean Mixamo rig from the skeleton of the first skinned
 * mesh (the FBXLoader produces 12 nested copies of this rig, all with identical
 * name order and bind pose), then rewires every skinned mesh to that one rig.
 * This is required so an AnimationMixer clip can drive all body/clothes meshes
 * at once instead of just the first bone-name match.
 */
function unifySkeleton(group: THREE.Group) {
  const skinned: THREE.SkinnedMesh[] = [];
  group.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned.push(o as THREE.SkinnedMesh);
  });
  if (skinned.length === 0) return group;

  // Union of every bone in the scene (each skinned mesh holds its own copy of
  // the rig, so use whichever copy is present) keyed by name.
  const boneMap = new Map<string, THREE.Bone>();
  group.traverse((o) => {
    if ((o as THREE.Bone).isBone && !boneMap.has(o.name)) boneMap.set(o.name, o as THREE.Bone);
  });

  const srcBones = skinned[0].skeleton.bones;
  const clean = buildCleanRig(srcBones, boneMap);

  for (const mesh of skinned) {
    mesh.skeleton = new THREE.Skeleton(clean.bones);
  }

  // Remove the duplicated skeleton copies so name-based clip binding resolves
  // against exactly one set of bones.
  const rawBones: THREE.Bone[] = [];
  group.traverse((o) => {
    if ((o as THREE.Bone).isBone) rawBones.push(o as THREE.Bone);
  });
  for (const b of rawBones) b.parent?.remove(b);

  const rig = new THREE.Group();
  rig.name = 'CharacterRig';
  rig.add(clean.root);
  group.add(rig);

  group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      const m = o as THREE.Mesh;
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
    }
  });

  return group;
}

function collectBoneNames(rig: THREE.Group): Set<string> {
  const names = new Set<string>();
  rig.traverse((o) => {
    if ((o as THREE.Bone).isBone) names.add(o.name);
  });
  return names;
}

/**
 * Builds a fresh 73-bone Mixamo hierarchy. Each bone's local transform is
 * derived from the original bind pose (world minus the would-be parent's world),
 * so the new rig sits in the exact same posed position as the original model.
 */
function buildCleanRig(srcBones: THREE.Bone[], srcMap: Map<string, THREE.Bone>) {
  const byName = new Map<string, THREE.Bone>();

  const mk = (name: string) => {
    const b = new THREE.Bone();
    b.name = name;
    byName.set(name, b);
    return b;
  };

  const place = (bone: THREE.Bone) => {
    const src = srcMap.get(bone.name)!;
    const local = new THREE.Matrix4()
      .copy(bone.parent!.matrixWorld)
      .invert()
      .multiply(src.matrixWorld);
    bone.position.setFromMatrixPosition(local);
    bone.quaternion.setFromRotationMatrix(local);
    bone.scale.setFromMatrixScale(local);
    bone.updateMatrix();
  };

  const add = (parent: THREE.Bone, name: string) => {
    const b = mk(name);
    parent.add(b);
    place(b);
    b.updateMatrixWorld(true);
    return b;
  };

  const Hips = mk('Hips');
  const rootSrc = srcMap.get('Hips')!;
  Hips.position.setFromMatrixPosition(rootSrc.matrixWorld);
  Hips.quaternion.setFromRotationMatrix(rootSrc.matrixWorld);
  Hips.scale.setFromMatrixScale(rootSrc.matrixWorld);
  Hips.updateMatrix();
  Hips.updateMatrixWorld(true);

  const Spine = add(Hips, 'Spine');
  const Spine1 = add(Spine, 'Spine1');
  const Spine2 = add(Spine1, 'Spine2');
  const Neck = add(Spine2, 'Neck');
  const Neck1 = add(Neck, 'Neck1');
  const Neck2 = add(Neck1, 'Neck2');
  const Head = add(Neck2, 'Head');
  add(Head, 'HeadTop_End');
  add(Head, 'LeftEye');
  add(Head, 'RightEye');

  const arm = (prefix: string, from: THREE.Bone) => {
    const Shoulder = add(from, prefix + 'Shoulder');
    const Arm = add(Shoulder, prefix + 'Arm');
    const ForeArm = add(Arm, prefix + 'ForeArm');
    const ForeArm1 = add(ForeArm, prefix + 'ForeArm1');
    const ForeArm2 = add(ForeArm1, prefix + 'ForeArm2');
    const Hand = add(ForeArm2, prefix + 'Hand');
    void Arm;
    for (const finger of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) {
      let prev = Hand;
      for (let i = 1; i <= 4; i++) {
        prev = add(prev, prefix + 'Hand' + finger + i);
      }
    }
  };
  arm('Left', Spine2);
  arm('Right', Spine2);

  const LeftUpLeg = add(Hips, 'LeftUpLeg');
  const LeftLeg = add(LeftUpLeg, 'LeftLeg');
  const LeftFoot = add(LeftLeg, 'LeftFoot');
  const LeftToe = add(LeftFoot, 'LeftToeBase');
  add(LeftToe, 'LeftToe_End');

  const RightUpLeg = add(Hips, 'RightUpLeg');
  const RightLeg = add(RightUpLeg, 'RightLeg');
  const RightFoot = add(RightLeg, 'RightFoot');
  const RightToe = add(RightFoot, 'RightToeBase');
  add(RightToe, 'RightToe_End');

  // Preserve the original skeleton's array order so skin vertex indices map 1:1.
  const bones = srcBones.map((src) => {
    const b = byName.get(src.name);
    if (!b) throw new Error(`Missing clean bone: ${src.name}`);
    return b;
  });

  return { root: Hips, bones };
}

/**
 * Walking clips carry root motion on the Hips bone (+Z translation). Our Player
 * already moves the model itself, so strip all translation tracks to avoid the
 * character sliding on top of its own motion. Tracks targeting unknown bones are
 * dropped too, keeping clipAction binding clean.
 */
function prepClip(clip: THREE.AnimationClip, allowedBones: Set<string>) {
  const objectName = (name: string) =>
    name.includes('.') ? name.slice(0, name.lastIndexOf('.')) : name;
  const tracks = clip.tracks.filter(
    (t) =>
      !t.name.endsWith('.position') &&
      !objectName(t.name).startsWith('AvatarRoot') &&
      allowedBones.has(objectName(t.name)),
  );
  return new THREE.AnimationClip(clip.name, clip.duration, tracks);
}

export interface Character {
  object: THREE.Group;
  mixer: THREE.AnimationMixer;
  walkAction: THREE.AnimationAction;
  idleAction: THREE.AnimationAction;
  walkTimeScale: number;
}

/**
 * Loads the Indian-teenager character plus its Walking and Standing clips,
 * collapses the duplicated skeletons into one animatable rig, and exposes the
 * mixer/actions for the Player to drive (standing when idle, walking on move).
 */
export function useCharacter(): Character {
  const rawModel = useLoader(FBXLoader, CHARACTER_URL) as THREE.Group;
  const rawWalk = useLoader(FBXLoader, WALK_URL) as THREE.Group;
  const rawStand = useLoader(FBXLoader, STAND_URL) as THREE.Group;

  return useMemo(() => {
    const object = unifySkeleton(rawModel);
    const rig = object.getObjectByName('CharacterRig') as THREE.Group;
    const allowedBones = collectBoneNames(rig);

    const mixer = new THREE.AnimationMixer(object);

    const walkClipRaw = rawWalk.animations[0];
    const standClipRaw = rawStand.animations[0];
    if (!walkClipRaw || !standClipRaw) throw new Error('Walking/Standing FBX contained no clips');

    const walkAction = mixer.clipAction(prepClip(walkClipRaw, allowedBones));
    walkAction.setLoop(THREE.LoopRepeat, Infinity);

    const idleAction = mixer.clipAction(prepClip(standClipRaw, allowedBones));
    idleAction.setLoop(THREE.LoopRepeat, Infinity);
    idleAction.timeScale = 1;

    // Scale gait speed so the legs roughly keep up with the player's travel speed.
    const walkTimeScale = PLAYER_WALK_SPEED / (STRIDE_METERS / LOOP_SECONDS);
    walkAction.timeScale = walkTimeScale;

    return { object, mixer, walkAction, idleAction, walkTimeScale };
  }, [rawModel, rawWalk, rawStand]);
}