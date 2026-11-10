import { registerRoot } from "remotion";
import { extend } from "@react-three/fiber";
import * as THREE from "three";
import { TestVideoComposition, TestVideoSquare, TestVideoLandscape } from "./compositions/TestVideo";
import { HHolmesVideoComposition, HHolmesVideoPreview } from "./compositions/HHolmesVideo";
import { HHolmesVideoLiteComposition, HHolmesVideoLitePreview } from "./compositions/HHolmesVideoLite";
import { VerificationVideoComposition, VerificationVideoSquare, VerificationVideoLandscape } from "./compositions/VerificationVideo";

// Extend Three.js namespace for R3F - must be done before any components render
extend(THREE);
extend({
  // Core Three.js classes
  Vector2: THREE.Vector2,
  Vector3: THREE.Vector3,
  Vector4: THREE.Vector4,
  Euler: THREE.Euler,
  Quaternion: THREE.Quaternion,
  Matrix3: THREE.Matrix3,
  Matrix4: THREE.Matrix4,
  Color: THREE.Color,
  Texture: THREE.Texture,
  CanvasTexture: THREE.CanvasTexture,
  CubeTexture: THREE.CubeTexture,
  DataTexture: THREE.DataTexture,
  VideoTexture: THREE.VideoTexture,
  RenderTarget: THREE.RenderTarget,
  WebGLRenderTarget: THREE.WebGLRenderTarget,
  // Geometries
  BoxGeometry: THREE.BoxGeometry,
  CylinderGeometry: THREE.CylinderGeometry,
  ConeGeometry: THREE.ConeGeometry,
  PlaneGeometry: THREE.PlaneGeometry,
  SphereGeometry: THREE.SphereGeometry,
  BufferGeometry: THREE.BufferGeometry,
  // Materials
  MeshStandardMaterial: THREE.MeshStandardMaterial,
  MeshBasicMaterial: THREE.MeshBasicMaterial,
  MeshPhysicalMaterial: THREE.MeshPhysicalMaterial,
  PointsMaterial: THREE.PointsMaterial,
  // Objects
  InstancedMesh: THREE.InstancedMesh,
  Points: THREE.Points,
  // Attributes
  BufferAttribute: THREE.BufferAttribute,
  Float32BufferAttribute: THREE.Float32BufferAttribute,
});

// Root component that registers all compositions
const Root = () => {
  return (
    <>
      <TestVideoComposition />
      <TestVideoSquare />
      <TestVideoLandscape />
      <HHolmesVideoComposition />
      <HHolmesVideoPreview />
      <HHolmesVideoLiteComposition />
      <HHolmesVideoLitePreview />
      <VerificationVideoComposition />
      <VerificationVideoSquare />
      <VerificationVideoLandscape />
    </>
  );
};

registerRoot(Root);

export { TestVideoComposition, TestVideoSquare, TestVideoLandscape, HHolmesVideoComposition, HHolmesVideoPreview, HHolmesVideoLiteComposition, HHolmesVideoLitePreview, VerificationVideoComposition, VerificationVideoSquare, VerificationVideoLandscape };