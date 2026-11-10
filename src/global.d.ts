import * as THREE from "three";
import * as React from "react";

declare module "@react-three/fiber" {
  export interface CanvasProps extends React.HTMLAttributes<HTMLCanvasElement> {
    camera?: { position?: [number, number, number]; fov?: number; near?: number; far?: number };
    gl?: Record<string, any>;
    onCreated?: (ctx: { gl: THREE.WebGLRenderer }) => void;
    children?: React.ReactNode;
  }

  export function Canvas(props: CanvasProps): React.ReactElement | null;
  export function extend(objects: Record<string, any>): void;
  export function useFrame(callback: (state: any, delta: number) => void, renderPriority?: number): void;
  export function useThree(): { camera: THREE.Camera; scene: THREE.Scene; gl: THREE.WebGLRenderer };

  export type ObjectMap = Record<string, THREE.Object3D>;
}

declare module "@react-three/drei" {
  export interface EnvironmentProps {
    preset?: string;
    intensity?: number;
    background?: boolean;
  }
  export function Environment(props: EnvironmentProps): React.ReactElement | null;
  export function OrbitControls(props: any): React.ReactElement | null;
  export function Html(props: any): React.ReactElement | null;
  export function ContactShadows(props: any): React.ReactElement | null;
  export function Stage(props: any): React.ReactElement | null;
  export const useGLTF: (<T extends string | string[]>(path: T, useDraco?: boolean, useMeshopt?: boolean, extendLoader?: (loader: any) => void) => T extends any[] ? (any & { nodes: Record<string, THREE.Object3D>; materials: Record<string, THREE.Material>; animations: THREE.AnimationClip[] })[] : any & { nodes: Record<string, THREE.Object3D>; materials: Record<string, THREE.Material>; animations: THREE.AnimationClip[] }) & { preload: (path: string | string[], useDraco?: boolean, useMeshopt?: boolean, extendLoader?: (loader: any) => void) => void; clear: (path: string | string[]) => void; setDecoderPath: (path: string) => void };
}

declare module "three" {
  interface Object3D {
    nodes?: Record<string, THREE.Object3D>;
    materials?: Record<string, THREE.Material>;
    animations?: THREE.AnimationClip[];
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: React.ThreeIntrinsicElement<THREE.Group>;
      mesh: React.ThreeIntrinsicElement<THREE.Mesh>;
      primitive: React.ThreeIntrinsicElement<THREE.Object3D>;
      directionalLight: React.ThreeIntrinsicElement<THREE.DirectionalLight>;
      directionalLightShadow: React.ThreeIntrinsicElement<THREE.DirectionalLightShadow>;
      ambientLight: React.ThreeIntrinsicElement<THREE.AmbientLight>;
      pointLight: React.ThreeIntrinsicElement<THREE.PointLight>;
      spotLight: React.ThreeIntrinsicElement<THREE.SpotLight>;
      hemisphereLight: React.ThreeIntrinsicElement<THREE.HemisphereLight>;
      rectAreaLight: React.ThreeIntrinsicElement<THREE.RectAreaLight>;
      pointLightShadow: React.ThreeIntrinsicElement<THREE.PointLightShadow>;
      spotLightShadow: React.ThreeIntrinsicElement<THREE.SpotLightShadow>;
      perspectiveCamera: React.ThreeIntrinsicElement<THREE.PerspectiveCamera>;
      orthographicCamera: React.ThreeIntrinsicElement<THREE.OrthographicCamera>;
      camera: React.ThreeIntrinsicElement<THREE.Camera>;
      scene: React.ThreeIntrinsicElement<THREE.Scene>;
      fog: React.ThreeIntrinsicElement<THREE.Fog>;
      fogExp2: React.ThreeIntrinsicElement<THREE.FogExp2>;
      bufferGeometry: React.ThreeIntrinsicElement<THREE.BufferGeometry>;
      geometry: React.ThreeIntrinsicElement<THREE.Geometry>;
      material: React.ThreeIntrinsicElement<THREE.Material>;
      meshBasicMaterial: React.ThreeIntrinsicElement<THREE.MeshBasicMaterial>;
      meshStandardMaterial: React.ThreeIntrinsicElement<THREE.MeshStandardMaterial>;
      meshPhysicalMaterial: React.ThreeIntrinsicElement<THREE.MeshPhysicalMaterial>;
      meshPhongMaterial: React.ThreeIntrinsicElement<THREE.MeshPhongMaterial>;
      meshLambertMaterial: React.ThreeIntrinsicElement<THREE.MeshLambertMaterial>;
      meshToonMaterial: React.ThreeIntrinsicElement<THREE.MeshToonMaterial>;
      meshDepthMaterial: React.ThreeIntrinsicElement<THREE.MeshDepthMaterial>;
      meshNormalMaterial: React.ThreeIntrinsicElement<THREE.MeshNormalMaterial>;
      meshDistanceMaterial: React.ThreeIntrinsicElement<THREE.MeshDistanceMaterial>;
      lineBasicMaterial: React.ThreeIntrinsicElement<THREE.LineBasicMaterial>;
      lineDashedMaterial: React.ThreeIntrinsicElement<THREE.LineDashedMaterial>;
      pointsMaterial: React.ThreeIntrinsicElement<THREE.PointsMaterial>;
      shadowMaterial: React.ThreeIntrinsicElement<THREE.ShadowMaterial>;
      spriteMaterial: React.ThreeIntrinsicElement<THREE.SpriteMaterial>;
      rawShaderMaterial: React.ThreeIntrinsicElement<THREE.RawShaderMaterial>;
      shaderMaterial: React.ThreeIntrinsicElement<THREE.ShaderMaterial>;
      texture: React.ThreeIntrinsicElement<THREE.Texture>;
      canvasTexture: React.ThreeIntrinsicElement<THREE.CanvasTexture>;
      videoTexture: React.ThreeIntrinsicElement<THREE.VideoTexture>;
      dataTexture: React.ThreeIntrinsicElement<THREE.DataTexture>;
      dataTexture3D: React.ThreeIntrinsicElement<THREE.DataTexture3D>;
      cubeTexture: React.ThreeIntrinsicElement<THREE.CubeTexture>;
      compressedTexture: React.ThreeIntrinsicElement<THREE.CompressedTexture>;
    }
  }
}

namespace React {
  interface ThreeIntrinsicElement<T> extends React.DetailedHTMLProps<React.Object3DProps<T>, T> {}
  interface Object3DProps<T> {
    dispose?: any;
    args?: any[];
    [key: string]: any;
  }
}