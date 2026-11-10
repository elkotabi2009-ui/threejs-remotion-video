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
      // Objects
      group: React.ThreeIntrinsicElement<THREE.Group>;
      mesh: React.ThreeIntrinsicElement<THREE.Mesh>;
      primitive: React.ThreeIntrinsicElement<THREE.Object3D>;
      points: React.ThreeIntrinsicElement<THREE.Points>;
      instancedMesh: React.ThreeIntrinsicElement<THREE.InstancedMesh>;
      skinnedMesh: React.ThreeIntrinsicElement<THREE.SkinnedMesh>;
      line: React.ThreeIntrinsicElement<THREE.Line>;
      lineSegments: React.ThreeIntrinsicElement<THREE.LineSegments>;
      sprite: React.ThreeIntrinsicElement<THREE.Sprite>;
      bone: React.ThreeIntrinsicElement<THREE.Bone>;
      lOD: React.ThreeIntrinsicElement<THREE.LOD>;
      // Lights
      directionalLight: React.ThreeIntrinsicElement<THREE.DirectionalLight>;
      directionalLightShadow: React.ThreeIntrinsicElement<THREE.DirectionalLightShadow>;
      pointLightShadow: React.ThreeIntrinsicElement<THREE.PointLightShadow>;
      spotLightShadow: React.ThreeIntrinsicElement<THREE.SpotLightShadow>;
      ambientLight: React.ThreeIntrinsicElement<THREE.AmbientLight>;
      pointLight: React.ThreeIntrinsicElement<THREE.PointLight>;
      spotLight: React.ThreeIntrinsicElement<THREE.SpotLight>;
      hemisphereLight: React.ThreeIntrinsicElement<THREE.HemisphereLight>;
      rectAreaLight: React.ThreeIntrinsicElement<THREE.RectAreaLight>;
      // Cameras
      perspectiveCamera: React.ThreeIntrinsicElement<THREE.PerspectiveCamera>;
      orthographicCamera: React.ThreeIntrinsicElement<THREE.OrthographicCamera>;
      camera: React.ThreeIntrinsicElement<THREE.Camera>;
      // Scene & Environment
      scene: React.ThreeIntrinsicElement<THREE.Scene>;
      fog: React.ThreeIntrinsicElement<THREE.Fog>;
      fogExp2: React.ThreeIntrinsicElement<THREE.FogExp2>;
      // Geometries (as JSX elements via react-three-fiber)
      boxGeometry: React.ThreeIntrinsicElement<THREE.BoxGeometry>;
      cylinderGeometry: React.ThreeIntrinsicElement<THREE.CylinderGeometry>;
      coneGeometry: React.ThreeIntrinsicElement<THREE.ConeGeometry>;
      planeGeometry: React.ThreeIntrinsicElement<THREE.PlaneGeometry>;
      sphereGeometry: React.ThreeIntrinsicElement<THREE.SphereGeometry>;
      torusGeometry: React.ThreeIntrinsicElement<THREE.TorusGeometry>;
      torusKnotGeometry: React.ThreeIntrinsicElement<THREE.TorusKnotGeometry>;
      ringGeometry: React.ThreeIntrinsicElement<THREE.RingGeometry>;
      circleGeometry: React.ThreeIntrinsicElement<THREE.CircleGeometry>;
      shapeGeometry: React.ThreeIntrinsicElement<THREE.ShapeGeometry>;
      extrudeGeometry: React.ThreeIntrinsicElement<THREE.ExtrudeGeometry>;
      latheGeometry: React.ThreeIntrinsicElement<THREE.LatheGeometry>;
      textGeometry: React.ThreeIntrinsicElement<THREE.TextGeometry>;
      edgesGeometry: React.ThreeIntrinsicElement<THREE.EdgesGeometry>;
      wireframeGeometry: React.ThreeIntrinsicElement<THREE.WireframeGeometry>;
      tetrahedronGeometry: React.ThreeIntrinsicElement<THREE.TetrahedronGeometry>;
      octahedronGeometry: React.ThreeIntrinsicElement<THREE.OctahedronGeometry>;
      icosahedronGeometry: React.ThreeIntrinsicElement<THREE.IcosahedronGeometry>;
      dodecahedronGeometry: React.ThreeIntrinsicElement<THREE.DodecahedronGeometry>;
      tubeGeometry: React.ThreeIntrinsicElement<THREE.TubeGeometry>;
      capsuleGeometry: React.ThreeIntrinsicElement<THREE.CapsuleGeometry>;
      bufferGeometry: React.ThreeIntrinsicElement<THREE.BufferGeometry>;
      geometry: React.ThreeIntrinsicElement<THREE.Geometry>;
      // Attributes
      bufferAttribute: React.ThreeIntrinsicElement<THREE.BufferAttribute>;
      interleavedBufferAttribute: React.ThreeIntrinsicElement<THREE.InterleavedBufferAttribute>;
      // Materials
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
      // Textures
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