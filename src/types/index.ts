export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Euler {
  x: number;
  y: number;
  z: number;
  order?: "XYZ" | "YXZ" | "ZXY" | "ZYX" | "YZX" | "XZY";
}

export interface Color {
  r: number;
  g: number;
  b: number;
}

export interface Transform {
  position: Vector3;
  rotation: Euler;
  scale: Vector3;
}

export interface Keyframe<T = unknown> {
  frame: number;
  value: T;
  easing?: EasingFunction;
  interpolation?: InterpolationType;
}

export type EasingFunction =
  | "linear"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | "easeInSine"
  | "easeOutSine"
  | "easeInOutSine"
  | "easeInQuad"
  | "easeOutQuad"
  | "easeInOutQuad"
  | "easeInCubic"
  | "easeOutCubic"
  | "easeInOutCubic"
  | "easeInQuart"
  | "easeOutQuart"
  | "easeInOutQuart"
  | "easeInQuint"
  | "easeOutQuint"
  | "easeInOutQuint"
  | "easeInExpo"
  | "easeOutExpo"
  | "easeInOutExpo"
  | "easeInCirc"
  | "easeOutCirc"
  | "easeInOutCirc"
  | "easeInBack"
  | "easeOutBack"
  | "easeInOutBack"
  | "easeInElastic"
  | "easeOutElastic"
  | "easeInOutElastic"
  | "easeInBounce"
  | "easeOutBounce"
  | "easeInOutBounce"
  | string;

export type InterpolationType =
  | "linear"
  | "step"
  | "bezier"
  | "catmullRom"
  | "cubicSpline";

export interface Track<T = unknown> {
  id: string;
  name: string;
  type: TrackType;
  keyframes: Keyframe<T>[];
  enabled: boolean;
  muted: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  content?: React.ReactNode;
}

export type TrackType =
  | "video"
  | "audio"
  | "3d"
  | "text"
  | "image"
  | "shape"
  | "effect"
  | "camera"
  | "light"
  | "shader";

export type BlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "colorDodge"
  | "colorBurn"
  | "hardLight"
  | "softLight"
  | "difference"
  | "exclusion"
  | "hue"
  | "saturation"
  | "color"
  | "luminosity";

export interface CompositionSettings {
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  backgroundColor?: string;
  pixelAspectRatio?: number;
}

export interface AudioTrack {
  id: string;
  src: string;
  name: string;
  volume: number;
  pan: number;
  startFrame: number;
  endFrame: number;
  playbackRate: number;
  effects: AudioEffect[];
}

export interface AudioEffect {
  id: string;
  type: AudioEffectType;
  params: Record<string, number>;
  enabled: boolean;
}

export type AudioEffectType =
  | "gain"
  | "filter"
  | "compressor"
  | "reverb"
  | "delay"
  | "distortion"
  | "chorus"
  | "phaser"
  | "tremolo"
  | "eq";

export interface VideoExportSettings {
  codec: "h264" | "h265" | "vp8" | "vp9" | "av1" | "prores";
  crf: number;
  preset: "ultrafast" | "superfast" | "veryfast" | "faster" | "fast" | "medium" | "slow" | "slower" | "veryslow";
  pixelFormat: "yuv420p" | "yuv422p" | "yuv444p" | "rgb24";
  audioCodec: "aac" | "opus" | "mp3" | "pcm";
  audioBitrate: string;
  threads: number;
}

export interface LambdaRenderConfig {
  functionName: string;
  region: string;
  memory: number;
  timeout: number;
  concurrency: number;
  storage: {
    bucket: string;
    prefix: string;
  };
}

export interface BlenderExportConfig {
  inputBlend: string;
  outputDir: string;
  format: "GLTF" | "GLB";
  exportSettings: {
    selectedOnly: boolean;
    applyModifiers: boolean;
    exportAnimations: boolean;
    exportShapeKeys: boolean;
    exportSkins: boolean;
    exportNlaStrips: boolean;
    exportCurrentFrame: boolean;
    exportFrameRange: boolean;
    exportFrameStep: number;
    exportForceSampling: boolean;
    exportDefBones: boolean;
    exportOptimizeAnimationSize: boolean;
    exportAnimationMode: "ACTIONS" | "NLA_TRACKS" | "SINGLE_FRAME";
    textureDirectory: string;
    copyTextures: boolean;
    exportTangents: boolean;
    exportMeshData: "MESH" | "POINTS" | "CURVES";
    exportAttributes: string[];
    exportImageFormat: "AUTO" | "JPEG" | "PNG" | "WEBP";
    exportImageQuality: number;
    exportMaterial: "PLACEHOLDER" | "EXPORT" | "NONE";
    exportColors: boolean;
    exportCameras: boolean;
    exportLights: boolean;
    exportExtras: boolean;
    exportYup: boolean;
    exportRelativePaths: boolean;
  };
}

export interface SceneGraphNode {
  id: string;
  name: string;
  type: "object3d" | "mesh" | "group" | "camera" | "light" | "sprite" | "points" | "line";
  transform: Transform;
  visible: boolean;
  children: SceneGraphNode[];
  userData: Record<string, unknown>;
  geometry?: GeometryData;
  material?: MaterialData;
}

export interface GeometryData {
  type: string;
  attributes: Record<string, { array: number[]; itemSize: number }>;
  index?: { array: number[]; itemSize: 1 };
  boundingSphere?: { center: Vector3; radius: number };
  boundingBox?: { min: Vector3; max: Vector3 };
}

export interface MaterialData {
  type: string;
  uuid: string;
  name: string;
  color?: Color;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  transparent?: boolean;
  map?: TextureData;
  normalMap?: TextureData;
  roughnessMap?: TextureData;
  metalnessMap?: TextureData;
  aoMap?: TextureData;
  emissiveMap?: TextureData;
  envMap?: TextureData;
  side?: number;
  depthWrite?: boolean;
  depthTest?: boolean;
  blending?: number;
  blendSrc?: number;
  blendDst?: number;
  blendEquation?: number;
  vertexColors?: boolean;
  flatShading?: boolean;
}

export interface TextureData {
  uuid: string;
  name: string;
  image: { url: string };
  mapping?: number;
  wrapS?: number;
  wrapT?: number;
  magFilter?: number;
  minFilter?: number;
  anisotropy?: number;
  format?: number;
  type?: number;
  encoding?: number;
  colorSpace?: string;
  flipY?: boolean;
  premultiplyAlpha?: boolean;
  unpackAlignment?: number;
}

export interface TimelineState {
  currentFrame: number;
  playbackRate: number;
  isPlaying: boolean;
  loop: boolean;
  inPoint: number;
  outPoint: number;
  tracks: Track[];
  selection: string[];
  clipboard: Track[] | null;
}

export interface RenderJob {
  id: string;
  compositionId: string;
  inputProps: Record<string, unknown>;
  outputLocation: string;
  status: "pending" | "rendering" | "completed" | "failed" | "cancelled";
  progress: number;
  startTime?: number;
  endTime?: number;
  error?: string;
  lambdaFunction?: string;
}