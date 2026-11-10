"use client";

import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { EffectComposer as PostprocessingComposer, RenderPass, EffectPass, SMAAEffect } from "postprocessing";
import { useGLTF as useDreiGLTF, useTexture as useDreiTexture } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
import { useMemo, useRef, useEffect, Suspense } from "react";
import type { SceneGraphNode, Transform, Vector3, Euler } from "@/types";
import { useSceneStore } from "@/store/sceneStore";

extend(THREE);

interface SceneManagerProps {
  children: React.ReactNode;
  width: number;
  height: number;
  onFrame?: (frame: number, delta: number) => void;
}

export function SceneManager({ children, width, height, onFrame }: SceneManagerProps) {
  const { scene, camera, gl } = useThree();
  const { objects, camera: cameraState, lights, grid, axes, environment } = useSceneStore();

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.position.set(cameraState.position.x, cameraState.position.y, cameraState.position.z);
      camera.rotation.set(cameraState.rotation.x, cameraState.rotation.y, cameraState.rotation.z);
      camera.fov = cameraState.fov;
      camera.near = cameraState.near;
      camera.far = cameraState.far;
      camera.updateProjectionMatrix();
    }

    gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1;
  }, [camera, gl, cameraState]);

  useFrame((state, delta) => {
    onFrame?.(Math.floor(state.clock.getElapsedTime() * 30), delta);
  });

  return (
    <Canvas
      camera={{ position: [cameraState.position.x, cameraState.position.y, cameraState.position.z] }}
      gl={{ preserveDrawingBuffer: true, alpha: true }}
      style={{ width, height }}
    >
      <Suspense fallback={<LoadingFallback />}>
        <SceneEnvironment preset={environment.preset} intensity={environment.intensity} />
        {grid.visible && <GridHelper size={grid.size} divisions={grid.divisions} color={grid.color} />}
        {axes.visible && <AxesHelper size={axes.size} />}
        <SceneObjects />
        <SceneLights />
        {children}
      </Suspense>
      <PostProcessing />
    </Canvas>
  );
}

function LoadingFallback() {
  return null;
}

function SceneEnvironment({ preset, intensity }: { preset: string; intensity: number }) {
  const { scene } = useThree();
  const envMapRef = useRef<THREE.Texture | null>(null);

  useEffect(() => {
    const pmremGenerator = new THREE.PMREMGenerator(useThree().gl);
    pmremGenerator.compileEquirectangularShader();

    let texture: THREE.Texture;

    switch (preset) {
      case "studio":
        texture = new THREE.TextureLoader().load("https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr");
        break;
      case "outdoor":
        texture = new THREE.TextureLoader().load("https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/venice_sunset_1k.hdr");
        break;
      case "night":
        texture = new THREE.TextureLoader().load("https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/night_city_1k.hdr");
        break;
      default:
        texture = new THREE.TextureLoader().load("https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr");
    }

    texture.mapping = THREE.EquirectangularReflectionMapping;
    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
    envMapRef.current = envMap;
    scene.environment = envMap;
    scene.environmentIntensity = intensity;
    texture.dispose();
    pmremGenerator.dispose();
  }, [preset, intensity, scene]);

  return null;
}

function SceneObjects() {
  const { objects } = useSceneStore();
  const objectArray = Array.from(objects.values());

  return (
    <>
      {objectArray.map((obj) => (
        <SceneObject key={obj.id} object={obj} />
      ))}
    </>
  );
}

interface SceneObjectProps {
  object: SceneGraphNode;
}

function SceneObject({ object }: SceneObjectProps) {
  const { selectedObjectId, hoveredObjectId } = useSceneStore();
  const isSelected = selectedObjectId === object.id;
  const isHovered = hoveredObjectId === object.id;

  const { position, rotation, scale } = object.transform;
  const children = object.children;

  return (
    <group
      position={[position.x, position.y, position.z]}
      rotation={[rotation.x, rotation.y, rotation.z]}
      scale={[scale.x, scale.y, scale.z]}
      onPointerOver={() => useSceneStore.getState().hoverObject(object.id)}
      onPointerOut={() => useSceneStore.getState().hoverObject(null)}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        useSceneStore.getState().selectObject(object.id);
      }}
    >
      {object.type === "mesh" && object.geometry && object.material && (
        <MeshObject geometry={object.geometry} material={object.material} isSelected={isSelected} isHovered={isHovered} />
      )}
      {object.type === "camera" && <CameraHelper />}
      {object.type === "light" && <LightHelper />}
      {children.map((child) => (
        <SceneObject key={child.id} object={child} />
      ))}
    </group>
  );
}

function MeshObject({
  geometry,
  material,
  isSelected,
  isHovered,
}: {
  geometry: any;
  material: any;
  isSelected: boolean;
  isHovered: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!meshRef.current) return;

    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (isSelected) {
      mat.emissive.setHex(0x4444ff);
      mat.emissiveIntensity = 0.3;
    } else if (isHovered) {
      mat.emissive.setHex(0x44ff44);
      mat.emissiveIntensity = 0.2;
    } else {
      mat.emissiveIntensity = 0;
    }
  }, [isSelected, isHovered]);

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} castShadow receiveShadow />
  );
}

function CameraHelper() {
  return (
    <group>
      <primitive object={new THREE.CameraHelper(new THREE.PerspectiveCamera())} />
    </group>
  );
}

function LightHelper() {
  return (
    <group>
      <primitive object={new THREE.Box3Helper(new THREE.Box3())} />
    </group>
  );
}

function GridHelper({ size, divisions, color }: { size: number; divisions: number; color: any }) {
  const helperRef = useRef<THREE.GridHelper>();

  useEffect(() => {
    helperRef.current = new THREE.GridHelper(size, divisions, `rgb(${color.r * 255}, ${color.g * 255}, ${color.b * 255})`, "gray");
  }, [size, divisions, color]);

  return <primitive object={helperRef.current} dispose={null} />;
}

function AxesHelper({ size }: { size: number }) {
  const helperRef = useRef<THREE.AxesHelper>();

  useEffect(() => {
    helperRef.current = new THREE.AxesHelper(size);
  }, [size]);

  return <primitive object={helperRef.current} dispose={null} />;
}

function SceneLights() {
  const { lights } = useSceneStore();

  return (
    <>
      {Array.from(lights.values()).map((light, index) => (
        <Light key={index} light={light} />
      ))}
      <ambientLight intensity={0.3} />
    </>
  );
}

interface LightProps {
  light: { type: string; color: any; intensity: number; position: Vector3; target: Vector3 };
}

function Light({ light }: LightProps) {
  const lightRef = useRef<THREE.Light>(null);

  useEffect(() => {
    if (!lightRef.current) return;

    const l = lightRef.current;
    l.color.setRGB(light.color.r, light.color.g, light.color.b);
    l.intensity = light.intensity;
    l.position.set(light.position.x, light.position.y, light.position.z);

    if (l instanceof THREE.DirectionalLight || l instanceof THREE.SpotLight) {
      l.target.position.set(light.target.x, light.target.y, light.target.z);
    }
  }, [light]);

  switch (light.type) {
    case "directional":
      return <directionalLight ref={lightRef} castShadow />;
    case "point":
      return <pointLight ref={lightRef} />;
    case "spot":
      return <spotLight ref={lightRef} castShadow />;
    case "hemisphere":
      return <hemisphereLight ref={lightRef} groundColor="black" />;
    case "rect":
      return <rectAreaLight ref={lightRef} />;
    default:
      return <directionalLight ref={lightRef} castShadow />;
  }
}

function PostProcessing() {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    const composer = new PostprocessingComposer(gl);
    const renderPass = new RenderPass(scene, camera);

    composer.addPass(renderPass);

    const smaaEffect = new SMAAEffect();
    const effectPass = new EffectPass(camera, smaaEffect);

    composer.addPass(effectPass);

    const animate = () => {
      composer.render();
      requestAnimationFrame(animate);
    };
    const frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      composer.dispose();
    };
  }, [gl, scene, camera]);

  return null;
}

export function useGLTF(url: string) {
  return useDreiGLTF(url);
}

export function useTexture(url: string) {
  return useDreiTexture(url);
}

export function useCubeTexture(urls: string[]) {
  // CubeTextureLoader not directly available, return empty for now
  return { nodes: {}, materials: {}, animations: [] };
}