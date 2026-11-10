"use client";

import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, ContactShadows, Environment, Stage, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useRemotionTiming, useInterpolate, useInterpolateVec3, useTimeRange } from "@/hooks/useRemotion";
import { useSceneStore } from "@/store/sceneStore";
import type { Vector3, Euler } from "@/types";
import { useMemo, useRef, useEffect, Suspense } from "react";

extend(THREE);

interface Scene3DProps {
  width: number;
  height: number;
  onFrame?: (frame: number, delta: number) => void;
}

export function Scene3D({ width, height, onFrame }: Scene3DProps) {
  const { frame, fps, progress, time } = useRemotionTiming();
  const { camera: cameraState, lights, environment } = useSceneStore();

  return (
    <Canvas
      camera={{
        position: [cameraState.position.x, cameraState.position.y, cameraState.position.z],
        fov: cameraState.fov,
        near: cameraState.near,
        far: cameraState.far,
      }}
      gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }}
      style={{ width, height }}
      onCreated={({ gl }) => {
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1;
      }}
    >
      <Suspense fallback={null}>
        <Environment
          preset={environment.preset as "studio" | "apartment" | "city" | "dawn" | "forest" | "lobby" | "night" | "park" | "sunset" | "warehouse"}
          background={false}
        />
        <SceneContent frame={frame} time={time} progress={progress} onFrame={onFrame} />
        <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} />
      </Suspense>
    </Canvas>
  );
}

function SceneContent({ frame, time, progress, onFrame }: { frame: number; time: number; progress: number; onFrame?: (frame: number, delta: number) => void }) {
  const { objects } = useSceneStore();
  const objectArray = Array.from(objects.values());

  useFrame((state: any, delta: number) => {
    onFrame?.(frame, delta);
  });

  return (
    <>
      {objectArray.map((obj) => (
        <AnimatedObject key={obj.id} object={obj} frame={frame} time={time} progress={progress} />
      ))}
    </>
  );
}

interface AnimatedObjectProps {
  object: any;
  frame: number;
  time: number;
  progress: number;
}

function AnimatedObject({ object, frame, time, progress }: AnimatedObjectProps) {
  const { position, rotation, scale } = object.transform;
  const children = object.children;

  const animatedPosition = useInterpolateVec3(
    object.keyframes?.position || [],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const animatedRotation = useInterpolateVec3(
    object.keyframes?.rotation || [],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const animatedScale = useInterpolateVec3(
    object.keyframes?.scale || [],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const finalPosition = animatedPosition || position;
  const finalRotation = animatedRotation || rotation;
  const finalScale = animatedScale || scale;

  return (
    <group
      position={[finalPosition.x, finalPosition.y, finalPosition.z]}
      rotation={[finalRotation.x, finalRotation.y, finalRotation.z]}
      scale={[finalScale.x, finalScale.y, finalScale.z]}
    >
      {object.type === "mesh" && object.geometry && object.material && (
        <MeshComponent geometry={object.geometry} material={object.material} />
      )}
      {object.type === "gltf" && object.gltfUrl && (
        <GLTFModel url={object.gltfUrl} />
      )}
      {children.map((child: any) => (
        <AnimatedObject key={child.id} object={child} frame={frame} time={time} progress={progress} />
      ))}
    </group>
  );
}

function MeshComponent({ geometry, material }: { geometry: any; material: any }) {
  return (
    <mesh geometry={geometry} material={material} castShadow receiveShadow />
  );
}

function GLTFModel({ url }: { url: string }) {
  const { nodes, materials, animations } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer>();
  const actionsRef = useRef<Map<string, THREE.AnimationAction>>(new Map());

  useEffect(() => {
    if (!groupRef.current) return;

    const group = groupRef.current;
    const mixer = new THREE.AnimationMixer(group);
    mixerRef.current = mixer;

    animations.forEach((clip: THREE.AnimationClip) => {
      const action = mixer.clipAction(clip);
      action.play();
      actionsRef.current.set(clip.name, action);
    });

    return () => {
      mixer.stopAllAction();
      actionsRef.current.clear();
    };
  }, [animations]);

  useFrame((_: any, delta: number) => {
    mixerRef.current?.update(delta);
  });

  return (
    <group ref={groupRef} dispose={null}>
      {Object.entries(nodes).map(([name, node]) => (
        <primitive key={name} object={node} />
      ))}
    </group>
  );
}

export function CameraRig({ frame, duration }: { frame: number; duration: number }) {
  const { camera } = useThree();
  const progress = frame / duration;

  const position = useInterpolateVec3([
    { frame: 0, value: { x: 0, y: 5, z: 10 } },
    { frame: duration * 0.5, value: { x: 5, y: 8, z: 5 } },
    { frame: duration, value: { x: -5, y: 3, z: 12 } },
  ]);

  const target = useInterpolateVec3([
    { frame: 0, value: { x: 0, y: 0, z: 0 } },
    { frame: duration * 0.5, value: { x: 2, y: 1, z: 0 } },
    { frame: duration, value: { x: -1, y: 2, z: 0 } },
  ]);

  camera.position.set(position.x, position.y, position.z);
  camera.lookAt(target.x, target.y, target.z);

  return null;
}

export function LightRig({ frame, duration }: { frame: number; duration: number }) {
  const intensity = useInterpolate([
    { frame: 0, value: 1 },
    { frame: duration * 0.3, value: 1.5 },
    { frame: duration * 0.7, value: 0.8 },
    { frame: duration, value: 1 },
  ]);

  return (
    <>
      <directionalLight position={[5, 10, 7]} intensity={intensity} castShadow>
        <directionalLightShadow mapSizeWidth={2048} mapSizeHeight={2048} />
      </directionalLight>
      <ambientLight intensity={0.3 * intensity} />
      <pointLight position={[-5, 5, -5]} intensity={0.5 * intensity} />
    </>
  );
}

export function ParticleSystem({ count = 1000, size = 0.1, color = 0xffffff }: { count?: number; size?: number; color?: number }) {
  const positionsRef = useRef<Float32Array>();
  const geometryRef = useRef<THREE.BufferGeometry>();
  const materialRef = useRef<THREE.PointsMaterial>();
  const pointsRef = useRef<THREE.Points>();

  useEffect(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;

      sizes[i] = Math.random() * size;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    pointsRef.current = points;
    geometryRef.current = geometry;
    materialRef.current = material;
    positionsRef.current = positions;

    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [count, size]);

  useFrame((_: any, delta: number) => {
    const positions = positionsRef.current;
    const geometry = geometryRef.current;
    if (!positions || !geometry) return;

    for (let i = 0; i < count; i++) {
      const idx = i * 3 + 1;
      const val = positions[idx]! + delta * 0.5;
      positions[idx] = val > 10 ? -10 : val;
    }
    geometry.attributes.position!.needsUpdate = true;
  });

  return <primitive object={pointsRef.current} />;
}

export function ShaderBackground({ time }: { time: number }) {
  const materialRef = useRef<THREE.ShaderMaterial>();

  useEffect(() => {
    materialRef.current = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2() },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec2 uResolution;
        varying vec2 vUv;

        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
          vec2 uv = vUv * 2.0 - 1.0;
          uv.x *= uResolution.x / uResolution.y;

          float n = noise(uv * 10.0 + uTime * 0.1);
          vec3 col = mix(vec3(0.02, 0.02, 0.05), vec3(0.1, 0.05, 0.15), n);

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      materialRef.current
    );
    plane.renderOrder = -1;

    return () => {
      materialRef.current?.dispose();
    };
  }, []);

  useFrame((_: any, delta: number) => {
    if (materialRef.current && materialRef.current.uniforms.uTime) {
      materialRef.current.uniforms.uTime.value += delta;
    }
  });

  return <primitive object={new THREE.Mesh(new THREE.PlaneGeometry(2, 2), materialRef.current)} />;
}