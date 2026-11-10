import { registerRoot } from "remotion";
import { extend } from "@react-three/fiber";
import * as THREE from "three";
import { TestVideoComposition, TestVideoSquare, TestVideoLandscape } from "./compositions/TestVideo";
import { HHolmesVideoComposition, HHolmesVideoPreview } from "./compositions/HHolmesVideo";
import { VerificationVideoComposition, VerificationVideoSquare, VerificationVideoLandscape } from "./compositions/VerificationVideo";

// Extend Three.js namespace for R3F - must be done before any components render
extend(THREE);
extend({
  DirectionalLightShadow: THREE.DirectionalLightShadow,
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
  DataTexture3D: THREE.DataTexture3D,
  VideoTexture: THREE.VideoTexture,
  RenderTarget: THREE.RenderTarget,
  WebGLRenderTarget: THREE.WebGLRenderTarget,
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
      <VerificationVideoComposition />
      <VerificationVideoSquare />
      <VerificationVideoLandscape />
    </>
  );
};

registerRoot(Root);

export { TestVideoComposition, TestVideoSquare, TestVideoLandscape, HHolmesVideoComposition, HHolmesVideoPreview, VerificationVideoComposition, VerificationVideoSquare, VerificationVideoLandscape };