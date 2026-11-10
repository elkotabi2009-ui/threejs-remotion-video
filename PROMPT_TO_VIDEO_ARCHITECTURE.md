# Prompt-to-Video Automation System Architecture

## Executive Summary

This document describes a complete **natural language → video production pipeline** built on the existing Three.js + Remotion + Blender stack at `C:/Users/asus/threejs-remotion-video`. The system accepts prompts like *"15s TikTok video: rotating 3D car with neon lights, synthwave music, text 'FAST' appearing at beat drops"* and automatically produces a rendered MP4 file.

---

## 1. System Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PROMPT-TO-VIDEO PIPELINE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐    ┌──────────────┐    ┌────────────────┐    ┌───────────┐   │
│  │ Natural  │───▶│   Semantic   │───▶│   Structured   │───▶│  Remotion │   │
│  │ Language │    │   Parser     │    │   Video Spec   │    │  Generator│   │
│  │ Prompt   │    │  (LLM + Zod) │    │  (JSON Schema) │    │  (TS/React)│   │
│  └──────────┘    └──────────────┘    └────────────────┘    └─────┬───────┘   │
│                                                                    │           │
│  ┌──────────┐    ┌──────────────┐    ┌────────────────┐           │           │
│  │  Final   │◀───│  Render &    │◀───│  Asset         │           │           │
│  │  Video   │    │  Encode      │    │  Resolver      │           │           │
│  │  (MP4)   │    │  (Remotion)  │    │  (Blender/FS)  │◀──────────┘           │
│  └──────────┘    └──────────────┘    └────────────────┘                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Core Components

| Component | Responsibility | Technology |
|-----------|----------------|------------|
| **Prompt Parser** | NLP → structured spec | Zod schemas + LLM function calling |
| **Spec Validator** | Type-safe video spec | Zod runtime validation |
| **Code Generator** | Spec → Remotion TSX | Template engine + AST manipulation |
| **Asset Resolver** | Models, audio, textures | Blender Python API + file system |
| **Build Orchestrator** | Compile, bundle, render | Vite + Remotion CLI + FFmpeg |
| **Job Manager** | Queue, retry, progress | Zustand + async queue |

---

## 2. Data Structures

### 2.1 Natural Language Prompt Input

```typescript
interface PromptInput {
  prompt: string;                    // "15s TikTok: rotating 3D car, neon, synthwave, 'FAST' at beat drops"
  options?: PromptOptions;
}

interface PromptOptions {
  aspectRatio?: "9:16" | "16:9" | "1:1" | "4:5";
  targetPlatform?: "tiktok" | "reels" | "shorts" | "youtube" | "custom";
  quality?: "draft" | "preview" | "production";
  seed?: number;                     // for reproducible generation
  maxDuration?: number;              // seconds
}
```

### 2.2 Structured Video Specification (Core Schema)

```typescript
// Zod schema for type-safe video specification
const VideoSpecSchema = z.object({
  // Metadata
  id: z.string().uuid(),
  version: z.literal("1.0"),
  createdAt: z.string().datetime(),
  prompt: z.string(),

  // Composition settings
  composition: CompositionSettingsSchema,

  // Timeline & Scenes
  scenes: z.array(SceneSchema).min(1),

  // Global assets
  assets: AssetRegistrySchema,

  // Audio
  audio: AudioSpecSchema,

  // Render settings
  render: RenderSettingsSchema,
});

// Composition Settings
const CompositionSettingsSchema = z.object({
  width: z.number().int().positive(),      // 1080, 1920
  height: z.number().int().positive(),     // 1920, 1080
  fps: z.number().int().positive().default(30),
  durationInFrames: z.number().int().positive(),
  backgroundColor: z.string().default("#0a0a0f"),
  pixelAspectRatio: z.number().positive().default(1),
});

// Scene Definition
const SceneSchema = z.object({
  id: z.string(),
  name: z.string(),
  startFrame: z.number().int().nonnegative(),
  durationInFrames: z.number().int().positive(),
  // 3D Scene Configuration
  scene3D: Scene3DSchema.optional(),
  // 2D Overlay Tracks
  tracks: z.array(TrackSchema),
  // Transition to next scene
  transition: TransitionSchema.optional(),
});

// 3D Scene Configuration (maps to SceneManager/Scene3D)
const Scene3DSchema = z.object({
  // Camera
  camera: z.object({
    type: z.enum(["perspective", "orthographic"]).default("perspective"),
    position: Vector3Schema,
    target: Vector3Schema.optional(),
    fov: z.number().positive().default(50),
    animation: CameraAnimationSchema.optional(),
  }),
  // Lighting
  lights: z.array(LightSchema),
  // Environment
  environment: z.object({
    preset: z.enum(["studio", "outdoor", "night", "apartment", "city", "dawn", "forest", "lobby", "sunset", "warehouse"]).default("studio"),
    intensity: z.number().min(0).max(5).default(1),
    rotation: z.number().default(0),
  }),
  // Objects in scene
  objects: z.array(SceneObjectSchema),
  // Post-processing
  postProcessing: PostProcessingSchema.optional(),
});

// Scene Object (3D)
const SceneObjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["mesh", "gltf", "group", "camera", "light", "particles", "text3d"]),
  transform: TransformSchema,
  // For mesh
  geometry: GeometrySchema.optional(),
  material: MaterialSchema.optional(),
  // For GLTF
  gltfUrl: z.string().url().optional(),
  // Animation keyframes
  animation: ObjectAnimationSchema.optional(),
  // Children
  children: z.array(z.lazy(() => SceneObjectSchema)).default([]),
  // Visibility
  visible: z.boolean().default(true),
});

// Animation Keyframes
const ObjectAnimationSchema = z.object({
  position: z.array(KeyframeSchema(Vector3Schema)).optional(),
  rotation: z.array(KeyframeSchema(EulerSchema)).optional(),
  scale: z.array(KeyframeSchema(Vector3Schema)).optional(),
  // Custom properties
  custom: z.record(z.array(KeyframeSchema(z.unknown()))).optional(),
});

const KeyframeSchema = <T extends z.ZodTypeAny>(valueSchema: T) => z.object({
  frame: z.number().int().nonnegative(),
  value: valueSchema,
  easing: EasingFunctionSchema.optional(),
  interpolation: InterpolationTypeSchema.optional(),
});
```

### 2.3 Track System (2D Overlays)

```typescript
const TrackSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum([
    "video", "audio", "3d", "text", "image", 
    "shape", "effect", "camera", "light", "shader"
  ]),
  // Timing
  startFrame: z.number().int().nonnegative(),
  durationInFrames: z.number().int().positive(),
  // Visual
  blendMode: BlendModeSchema.default("normal"),
  opacity: z.number().min(0).max(1).default(1),
  // Content (varies by type)
  content: z.union([
    // Text track
    z.object({ 
      type: z.literal("text"),
      text: z.string(),
      style: TextStyleSchema,
      animation: TextAnimationSchema.optional(),
    }),
    // Image track
    z.object({ 
      type: z.literal("image"),
      src: z.string().url(),
      fit: z.enum(["cover", "contain", "fill", "none"]).default("cover"),
    }),
    // Shape track
    z.object({ 
      type: z.literal("shape"),
      shape: z.enum(["rect", "circle", "polygon", "path"]),
      style: ShapeStyleSchema,
    }),
    // Effect track
    z.object({ 
      type: z.literal("effect"),
      effect: z.enum(["blur", "glow", "chromaticAberration", "noise", "vignette"]),
      params: z.record(z.number()),
    }),
    // Generic
    z.record(z.unknown()),
  ]),
  // Keyframe animation
  keyframes: z.array(KeyframeSchema(z.record(z.unknown()))).optional(),
});

const TextStyleSchema = z.object({
  fontFamily: z.string().default("Inter, system-ui, sans-serif"),
  fontSize: z.number().positive().default(64),
  fontWeight: z.union([z.number(), z.enum(["thin", "light", "normal", "medium", "bold", "heavy"])]).default("bold"),
  color: z.string().default("#ffffff"),
  stroke: z.object({ color: z.string(), width: z.number() }).optional(),
  shadow: z.object({ color: z.string(), offset: Vector2Schema, blur: z.number() }).optional(),
  alignment: z.enum(["left", "center", "right"]).default("center"),
  lineHeight: z.number().default(1.2),
  letterSpacing: z.number().default(0),
});

const TextAnimationSchema = z.object({
  type: z.enum(["typewriter", "fade", "slide", "scale", "rotate", "perChar"]),
  duration: z.number().positive(),
  delay: z.number().default(0),
  easing: EasingFunctionSchema.default("easeOut"),
  // Per-character
  perCharDelay: z.number().default(0.05),
  direction: z.enum(["forward", "reverse", "random"]).default("forward"),
});
```

### 2.4 Audio Specification

```typescript
const AudioSpecSchema = z.object({
  // Master track
  master: z.object({
    volume: z.number().min(0).max(2).default(1),
    effects: z.array(AudioEffectSchema).default([]),
  }),
  // Tracks
  tracks: z.array(z.object({
    id: z.string(),
    name: z.string(),
    src: z.string().url(),                    // Local or remote
    type: z.enum(["music", "sfx", "voice", "ambient"]),
    volume: z.number().min(0).max(2).default(1),
    pan: z.number().min(-1).max(1).default(0),
    startFrame: z.number().int().nonnegative(),
    endFrame: z.number().int().positive().optional(),
    playbackRate: z.number().positive().default(1),
    // Beat-sync metadata
    beatData: BeatDataSchema.optional(),
    effects: z.array(AudioEffectSchema).default([]),
  })),
  // Global beat grid for synchronization
  beatGrid: BeatGridSchema.optional(),
});

const BeatDataSchema = z.object({
  bpm: z.number().positive(),
  timeSignature: z.tuple([z.number(), z.number()]).default([4, 4]),
  beats: z.array(z.object({
    frame: z.number().int().nonnegative(),
    time: z.number().nonnegative(),
    confidence: z.number().min(0).max(1),
    isDownbeat: z.boolean(),
  })),
});

const BeatGridSchema = z.object({
  bpm: z.number().positive(),
  offsetFrames: z.number().int().default(0),
  divisions: z.number().int().positive().default(4), // subdivisions per beat
});

const AudioEffectSchema = z.object({
  id: z.string(),
  type: z.enum(["gain", "filter", "compressor", "reverb", "delay", "distortion", "chorus", "phaser", "tremolo", "eq"]),
  params: z.record(z.number()),
  enabled: z.boolean().default(true),
});
```

### 2.5 Asset Registry

```typescript
const AssetRegistrySchema = z.object({
  // 3D Models
  models: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(["gltf", "glb", "procedural", "primitive"]),
    source: z.union([
      z.object({ type: z.literal("url"), url: z.string().url() }),
      z.object({ type: z.literal("blender"), blendFile: z.string(), objectName: z.string() }),
      z.object({ type: z.literal("procedural"), generator: z.string(), params: z.record(z.unknown()) }),
      z.object({ type: z.literal("primitive"), primitiveType: z.enum(["box", "sphere", "cylinder", "cone", "torus", "plane"]), params: z.record(z.unknown()) }),
    ]),
    // Optional: pre-processing
    transform: TransformSchema.optional(),
    animations: z.array(z.object({
      name: z.string(),
      startFrame: z.number(),
      endFrame: z.number(),
      loop: z.boolean().default(true),
    })).optional(),
  })),
  // Textures
  textures: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(["image", "video", "canvas", "procedural"]),
    source: z.union([
      z.object({ type: z.literal("url"), url: z.string().url() }),
      z.object({ type: z.literal("procedural"), generator: z.string(), params: z.record(z.unknown()) }),
      z.object({ type: z.literal("canvas"), drawFn: z.string() }), // serialized function
    ]),
    // Texture properties
    mapping: z.enum(["uv", "cube", "equirectangular", "spherical"]).default("uv"),
    wrapS: z.enum(["repeat", "clamp", "mirror"]).default("repeat"),
    wrapT: z.enum(["repeat", "clamp", "mirror"]).default("repeat"),
  })),
  // Audio
  audio: z.array(z.object({
    id: z.string(),
    name: z.string(),
    src: z.string().url(),
    type: z.enum(["music", "sfx", "voice"]),
    duration: z.number().positive().optional(),
    beatData: BeatDataSchema.optional(),
  })),
  // Fonts
  fonts: z.array(z.object({
    id: z.string(),
    family: z.string(),
    weight: z.number().optional(),
    style: z.enum(["normal", "italic"]).optional(),
    src: z.string().url(), // local or Google Fonts
  })),
});
```

### 2.6 Render Settings

```typescript
const RenderSettingsSchema = z.object({
  // Output
  output: z.object({
    path: z.string(),
    filename: z.string(),
    format: z.enum(["mp4", "webm", "mov", "gif", "png-sequence"]).default("mp4"),
  }),
  // Video encoding
  video: z.object({
    codec: z.enum(["h264", "h265", "vp8", "vp9", "av1", "prores"]).default("h264"),
    crf: z.number().int().min(0).max(51).default(18),
    preset: z.enum(["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow"]).default("medium"),
    pixelFormat: z.enum(["yuv420p", "yuv422p", "yuv444p", "rgb24"]).default("yuv420p"),
    // Hardware acceleration
    hardwareAcceleration: z.boolean().default(false),
  }),
  // Audio encoding
  audio: z.object({
    codec: z.enum(["aac", "opus", "mp3", "pcm"]).default("aac"),
    bitrate: z.string().default("192k"),
    sampleRate: z.number().int().default(48000),
    channels: z.number().int().default(2),
  }),
  // Remotion settings
  remotion: z.object({
    concurrency: z.number().int().positive().default(4),
    chunkLength: z.number().int().positive().default(100), // frames
    logLevel: z.enum(["verbose", "info", "warn", "error"]).default("info"),
    // Lambda
    lambda: z.object({
      enabled: z.boolean().default(false),
      region: z.string().default("us-east-1"),
      functionName: z.string().optional(),
      memory: z.number().int().default(3008),
      timeout: z.number().int().default(900),
    }).optional(),
  }),
});
```

---

## 3. Component Interfaces

### 3.1 Prompt Parser Interface

```typescript
// src/automation/promptParser.ts

interface PromptParser {
  /** Parse natural language prompt into structured video spec */
  parse(input: PromptInput): Promise<VideoSpec>;
  
  /** Validate and repair a partial spec */
  validate(spec: Partial<VideoSpec>): ValidationResult<VideoSpec>;
  
  /** Get parsing capabilities */
  getCapabilities(): PromptParserCapabilities;
}

interface PromptParserCapabilities {
  supportedPlatforms: string[];
  supportedAspectRatios: string[];
  maxDuration: number;
  supportedObjectTypes: string[];
  supportedAnimations: string[];
  supportedEffects: string[];
}

// Implementation strategy:
// - Use Zod schemas for validation
// - LLM function calling for extraction (OpenAI/Anthropic)
// - Few-shot examples in system prompt
// - Fallback: rule-based extraction for common patterns
```

### 3.2 Code Generator Interface

```typescript
// src/automation/codeGenerator.ts

interface CodeGenerator {
  /** Generate Remotion composition from video spec */
  generate(spec: VideoSpec): GeneratedCode;
  
  /** Generate specific component */
  generateComponent(type: ComponentType, config: ComponentConfig): string;
  
  /** Validate generated code compiles */
  validate(code: string): ValidationResult;
}

interface GeneratedCode {
  // Main composition file
  composition: string;           // MainVideo.tsx content
  // Component files
  components: Record<string, string>;
  // Type definitions
  types: string;
  // Asset imports
  imports: string[];
  // Remotion config
  remotionConfig: RemotionConfig;
}

type ComponentType = 
  | "Scene3D" 
  | "SceneManager" 
  | "CameraRig" 
  | "LightRig" 
  | "ParticleSystem"
  | "ShaderBackground"
  | "TextOverlay"
  | "AudioVisualizer"
  | "CaptionOverlay"
  | "Timeline"
  | "Transition";

interface ComponentConfig {
  // Component-specific props
  [key: string]: unknown;
}

interface RemotionConfig {
  compositions: CompositionConfig[];
  webpackOverrides: string;
}

interface CompositionConfig {
  id: string;
  component: string;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  defaultProps: Record<string, unknown>;
}
```

#### Code Generation Strategy

```typescript
// Template-based with AST manipulation
// Uses: jscodeshift / babel for safe code transformation

class TemplateEngine {
  // Scene3D template with injection points
  private scene3DTemplate = `
    import { Canvas, extend } from "@react-three/fiber";
    import { Environment, OrbitControls } from "@react-three/drei";
    import * as THREE from "three";
    import { useRemotionTiming } from "@/hooks/useRemotion";
    
    {{IMPORTS}}
    
    extend(THREE);
    
    export function Scene3D_{{SCENE_ID}}({ width, height }) {
      const { frame, time, progress } = useRemotionTiming();
      
      return (
        <Canvas camera={{ {{CAMERA_CONFIG}} }} ... >
          <Suspense fallback={null}>
            <Environment preset="{{ENV_PRESET}}" intensity={{ENV_INTENSITY}} />
            {{OBJECTS}}
            <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} />
          </Suspense>
        </Canvas>
      );
    }
  `;
  
  // Object template
  private objectTemplate = `
    <AnimatedObject_{{OBJ_ID}} 
      key="{{OBJ_ID}}"
      object={{{OBJ_CONFIG}}}
      frame={frame}
      time={time}
      progress={progress}
    />
  `;
}
```

### 3.3 Asset Resolver Interface

```typescript
// src/automation/assetResolver.ts

interface AssetResolver {
  /** Resolve all assets referenced in spec */
  resolveAll(spec: VideoSpec): Promise<ResolvedAssets>;
  
  /** Resolve single asset */
  resolve(assetRef: AssetReference): Promise<ResolvedAsset>;
  
  /** Generate procedural asset via Blender */
  generateProcedural(config: ProceduralAssetConfig): Promise<GeneratedAsset>;
  
  /** Export Blender scene to GLTF */
  exportFromBlender(config: BlenderExportConfig): Promise<ExportedAsset>;
  
  /** Download and cache remote asset */
  cacheRemote(url: string, type: AssetType): Promise<string>; // local path
}

interface ResolvedAssets {
  models: Map<string, ResolvedModel>;
  textures: Map<string, ResolvedTexture>;
  audio: Map<string, ResolvedAudio>;
  fonts: Map<string, ResolvedFont>;
}

interface ResolvedModel {
  id: string;
  localPath: string;          // public/assets/models/...
  format: "gltf" | "glb";
  animations: ModelAnimation[];
  boundingBox: BoundingBox;
}

interface ProceduralAssetConfig {
  type: "primitives" | "particles" | "terrain" | "city" | "vehicle" | "character";
  params: Record<string, unknown>;
  outputName: string;
  // Blender script to use
  script?: "generate_assets.py" | "custom";
}

interface BlenderExportConfig {
  inputBlend: string;
  outputDir: string;
  format: "GLTF" | "GLB";
  // Export settings from types/index.ts BlenderExportConfig
  exportSettings: BlenderExportSettings;
  // Optional: specific objects to export
  objects?: string[];
  // Optional: export animations separately
  separateAnimations?: boolean;
}
```

#### Blender Integration

```typescript
// src/automation/blenderRunner.ts

interface BlenderRunner {
  /** Execute Blender Python script headless */
  runScript(scriptPath: string, config: BlenderConfig): Promise<BlenderResult>;
  
  /** Generate assets using generate_assets.py */
  generateAssets(config: GenerateAssetsConfig): Promise<string[]>;
  
  /** Bake animations using bake_animations.py */
  bakeAnimations(config: BakeAnimationsConfig): Promise<BakeResult>;
  
  /** Export GLTF using export_gltf.py */
  exportGLTF(config: ExportGLTFConfig): Promise<string[]>;
}

interface BlenderConfig {
  script: string;
  configJson: string;           // JSON config passed via --config
  args?: string[];              // Additional CLI args
  timeout?: number;             // ms
  workDir?: string;
}

interface BlenderResult {
  success: boolean;
  outputFiles: string[];
  stdout: string;
  stderr: string;
  error?: string;
}
```

### 3.4 Build Orchestrator Interface

```typescript
// src/automation/buildOrchestrator.ts

interface BuildOrchestrator {
  /** Full pipeline: spec → video file */
  build(spec: VideoSpec, options?: BuildOptions): Promise<BuildResult>;
  
  /** Individual stages */
  generateCode(spec: VideoSpec): Promise<GeneratedCode>;
  installDependencies(): Promise<void>;
  bundle(buildDir: string): Promise<BundleResult>;
  render(bundlePath: string, options: RenderOptions): Promise<RenderResult>;
  encode(renderOutput: string, options: EncodeOptions): Promise<string>;
  
  /** Watch mode for development */
  watch(spec: VideoSpec): AsyncIterable<BuildProgress>;
}

interface BuildOptions {
  mode: "development" | "production" | "lambda";
  outputDir?: string;
  cleanup?: boolean;
  onProgress?: (progress: BuildProgress) => void;
}

interface BuildProgress {
  stage: "parsing" | "generating" | "resolving" | "installing" | "bundling" | "rendering" | "encoding" | "complete";
  progress: number; // 0-1
  message: string;
  details?: Record<string, unknown>;
}

interface BuildResult {
  success: boolean;
  videoPath?: string;
  duration: number; // ms
  stages: BuildStageResult[];
  error?: BuildError;
}

interface RenderOptions {
  compositionId: string;
  outputLocation: string;
  codec?: string;
  crf?: number;
  concurrency?: number;
  imageFormat?: "png" | "jpeg";
  quality?: number;
}
```

---

## 4. Data Flow

### 4.1 Complete Pipeline Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           DATA FLOW DIAGRAM                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  USER INPUT                                                                  │
│  ┌─────────────────┐                                                         │
│  │ "15s TikTok:    │                                                         │
│  │  rotating 3D    │                                                         │
│  │  car, neon,     │                                                         │
│  │  synthwave..."  │                                                         │
│  └────────┬────────┘                                                         │
│           │                                                                   │
│           ▼                                                                   │
│  ┌─────────────────────┐                                                     │
│  │ PROMPT PARSER       │  1. LLM function calling                           │
│  │ (promptParser.ts)   │  2. Zod validation                                 │
│  │                     │  3. Defaults & normalization                       │
│  └──────────┬──────────┘                                                     │
│             │                                                                 │
│             ▼                                                                 │
│  ┌─────────────────────┐      ┌──────────────────────────────────┐          │
│  │ VIDEO SPEC (JSON)   │─────▶│ ASSET RESOLVER                   │          │
│  │ (validated)         │      │ (assetResolver.ts)               │          │
│  └─────────────────────┘      │  - Download remote assets        │          │
│                               │  - Generate procedural (Blender) │          │
│             │                 │  - Export GLTF from .blend       │          │
│             │                 │  - Cache locally                 │          │
│             │                 └──────────────┬───────────────────┘          │
│             │                                │                               │
│             ▼                                │                               │
│  ┌─────────────────────┐                     │                               │
│  │ CODE GENERATOR      │◀────────────────────┘                               │
│  │ (codeGenerator.ts)  │  Resolved asset paths                               │
│  │                     │  injected into templates                            │
│  └──────────┬──────────┘                                                     │
│             │                                                                 │
│             ▼                                                                 │
│  ┌─────────────────────┐                                                     │
│  │ BUILD ORCHESTRATOR  │                                                     │
│  │ (buildOrchestrator) │                                                     │
│  │                     │  1. Write generated code to temp dir               │
│  │  Stage 1: Generate  │  2. npm install (if needed)                        │
│  └──────────┬──────────┘  3. Vite bundle (Remotion)                         │
│             │          4. Remotion render (Puppeteer/Chrome)               │
│             │          5. FFmpeg encode                                     │
│             ▼                                                                  │
│  ┌─────────────────────┐                                                     │
│  │ OUTPUT              │                                                     │
│  │ out/video.mp4       │                                                     │
│  └─────────────────────┘                                                     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Asset Resolution Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          ASSET RESOLUTION FLOW                                │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  spec.assets.models[]                                                        │
│  spec.assets.textures[]                                                      │
│  spec.assets.audio[]                                                         │
│           │                                                                   │
│           ▼                                                                   │
│  ┌─────────────────────┐                                                     │
│  │ FOR EACH ASSET      │                                                     │
│  └──────────┬──────────┘                                                     │
│             │                                                                 │
│     ┌───────┼────────┬─────────────┬─────────────┐                          │
│     ▼       ▼        ▼             ▼             ▼                          │
│  ┌─────┐ ┌──────┐ ┌────────┐  ┌──────────┐ ┌─────────┐                      │
│  │ URL │ │Proc. │ │Blender │  │Primitive │ │ Cached  │                      │
│  │Type │ │Type  │ │Type    │  │Type      │ │Local    │                      │
│  └──┬──┘ └──┬───┘ └────┬───┘  └────┬─────┘ └────┬────┘                      │
│     │       │         │           │             │                            │
│     ▼       ▼         ▼           ▼             ▼                            │
│  ┌─────────────────────────────────────────────────────────┐                 │
│  │ HANDLERS                                                │                 │
│  │                                                         │                 │
│  │ downloadAndCache(url) ──▶ public/assets/remote/...     │                 │
│  │                                                         │                 │
│  │ generateProcedural(config) ──▶ Blender Runner          │                 │
│  │   generate_assets.py ──▶ public/assets/generated/...   │                 │
│  │                                                         │                 │
│  │ exportFromBlender(config) ──▶ Blender Runner           │                 │
│  │   export_gltf.py ──▶ public/assets/blender/...         │                 │
│  │                                                         │                 │
│  │ createPrimitive(type, params) ──▶ Three.js geometry    │                 │
│  │                                                         │                 │
│  │ loadLocal(path) ──▶ verify exists, return path         │                 │
│  └──────────────────────┬─────────────────────────────────┘                 │
│                         │                                                    │
│                         ▼                                                    │
│              ┌─────────────────┐                                            │
│              │ RESOLVED ASSET  │                                            │
│              │ MAP             │                                            │
│              │ {id → localPath}│                                            │
│              └─────────────────┘                                            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. File Structure (New Automation Layer)

```
threejs-remotion-video/
├── src/
│   ├── automation/                    # NEW: Prompt-to-video automation
│   │   ├── index.ts                   # Main exports
│   │   ├── types.ts                   # All Zod schemas & TypeScript types
│   │   ├── promptParser.ts            # NLP → VideoSpec
│   │   ├── codeGenerator.ts           # VideoSpec → Remotion TSX
│   │   ├── assetResolver.ts           # Asset resolution & Blender integration
│   │   ├── blenderRunner.ts           # Headless Blender execution
│   │   ├── buildOrchestrator.ts       # Full pipeline orchestration
│   │   ├── jobQueue.ts                # Async job queue with persistence
│   │   ├── templates/                 # Code generation templates
│   │   │   ├── composition.hbs        # MainVideo.tsx template
│   │   │   ├── scene3d.hbs            # Scene3D component template
│   │   │   ├── cameraRig.hbs          # Camera animation template
│   │   │   ├── lightRig.hbs           # Light animation template
│   │   │   ├── textOverlay.hbs        # Text track template
│   │   │   ├── audioVisualizer.hbs    # Audio viz template
│   │   │   └── transitions.hbs        # Transition templates
│   │   ├── generators/                # Specialized generators
│   │   │   ├── scene3DGenerator.ts    # Scene3D from Scene3DSchema
│   │   │   ├── trackGenerator.ts      # 2D tracks from TrackSchema
│   │   │   ├── audioGenerator.ts      # Audio tracks from AudioSpec
│   │   │   └── transitionGenerator.ts # Scene transitions
│   │   └── utils/
│   │       ├── zodHelpers.ts          # Zod schema utilities
│   │       ├── templateEngine.ts      # Handlebars/JS template engine
│   │       ├── fileUtils.ts           # File system helpers
│   │       └── llmClient.ts           # LLM API client (OpenAI/Anthropic)
│   │
│   ├── scenes/
│   │   ├── objects/                   # Existing 3D objects
│   │   ├── postprocessing/            # Post-processing effects
│   │   └── shaders/                   # Custom shaders
│   │
│   ├── compositions/
│   │   └── MainVideo.tsx              # Generated (overwritten each build)
│   │
│   ├── store/
│   │   ├── jobStore.ts                # NEW: Job queue persistence
│   │   └── ...existing stores...
│   │
│   └── hooks/
│       └── useJobQueue.ts             # NEW: Job queue React hook
│
├── blender/
│   ├── configs/
│   │   ├── generate_example.json
│   │   ├── export_example.json
│   │   └── bake_example.json
│   ├── generate_assets.py
│   ├── export_gltf.py
│   ├── bake_animations.py
│   └── automation/                    # NEW: Blender automation configs
│       ├── vehicle_generation.json    # Car, bike, etc.
│       ├── character_rig.json         # Humanoid rig
│       ├── environment_sets.json      # Studio, city, nature
│       └── effect_presets.json        # Neon, glow, particle configs
│
├── public/
│   └── assets/
│       ├── models/
│       │   ├── generated/             # Procedural Blender output
│       │   ├── blender/               # Exported from .blend files
│       │   └── remote/                # Downloaded from URLs
│       ├── textures/
│       ├── audio/
│       └── fonts/
│
├── scripts/
│   ├── blender-export.js
│   ├── blender-bake.js
│   ├── blender-generate.js
│   ├── automation-build.js            # NEW: CLI entry point
│   ├── automation-dev.js              # NEW: Dev mode with watch
│   └── automation-test.js             # NEW: Test pipeline
│
├── automation.config.ts               # NEW: Automation configuration
├── PROMPT_TO_VIDEO_ARCHITECTURE.md    # This document
└── package.json                       # Updated with new scripts
```

---

## 6. Configuration

### 6.1 Automation Config (`automation.config.ts`)

```typescript
// automation.config.ts
import type { AutomationConfig } from "./src/automation/types";

export const automationConfig: AutomationConfig = {
  // LLM Provider
  llm: {
    provider: "anthropic", // or "openai"
    model: "claude-3-5-sonnet-20241022",
    apiKey: process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY,
    temperature: 0.3,
    maxTokens: 8000,
  },

  // Blender
  blender: {
    executablePath: "blender", // or full path
    scriptsDir: "./blender",
    outputDir: "./public/assets/models/generated",
    timeout: 300000, // 5 min
  },

  // Build
  build: {
    tempDir: "./.automation-temp",
    outputDir: "./out",
    cleanupTemp: true,
    nodeVersion: ">=20.0.0",
    packageManager: "pnpm",
  },

  // Remotion
  remotion: {
    concurrency: 4,
    chunkLength: 100,
    logLevel: "info",
    lambda: {
      enabled: false,
      region: "us-east-1",
      functionName: "remotion-render",
      memory: 3008,
      timeout: 900,
    },
  },

  // Asset defaults
  assets: {
    modelsDir: "./public/assets/models",
    texturesDir: "./public/assets/textures",
    audioDir: "./public/assets/audio",
    fontsDir: "./public/assets/fonts",
    cacheRemote: true,
    cacheTtl: 7 * 24 * 60 * 60 * 1000, // 7 days
  },

  // Job queue
  queue: {
    maxConcurrent: 2,
    retryAttempts: 3,
    retryDelay: 5000,
    persistence: "./.automation-jobs.json",
  },

  // Platform presets
  platforms: {
    tiktok: { width: 1080, height: 1920, fps: 30, maxDuration: 60 },
    reels: { width: 1080, height: 1920, fps: 30, maxDuration: 90 },
    shorts: { width: 1080, height: 1920, fps: 30, maxDuration: 60 },
    youtube: { width: 1920, height: 1080, fps: 30, maxDuration: 3600 },
  },
};
```

### 6.2 Package.json Scripts (Additions)

```json
{
  "scripts": {
    "automation:build": "node scripts/automation-build.js",
    "automation:dev": "node scripts/automation-dev.js",
    "automation:test": "node scripts/automation-test.js",
    "automation:prompt": "node scripts/automation-build.js --prompt",
    "automation:queue": "node scripts/automation-build.js --queue",
    "automation:clean": "rm -rf .automation-temp .automation-jobs.json out/*",
    "blender:generate:vehicle": "blender -b -P blender/generate_assets.py -- --config blender/automation/vehicle_generation.json",
    "blender:export:scene": "blender -b -P blender/export_gltf.py -- --config blender/automation/scene_export.json"
  }
}
```

---

## 7. CLI Interface

### 7.1 Main Entry Point (`scripts/automation-build.js`)

```javascript
#!/usr/bin/env node

import { BuildOrchestrator } from "../src/automation/buildOrchestrator.js";
import { PromptParser } from "../src/automation/promptParser.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const orchestrator = new BuildOrchestrator();
  const parser = new PromptParser();

  switch (command) {
    case "--prompt": {
      const prompt = args[1] || readFileSync(0, "utf-8").trim();
      const options = parseOptions(args.slice(2));
      
      console.log("🎬 Parsing prompt...");
      const spec = await parser.parse({ prompt, options });
      
      console.log("🏗️  Building video...");
      const result = await orchestrator.build(spec, { 
        mode: "production",
        onProgress: (p) => console.log(`  [${p.stage}] ${Math.round(p.progress * 100)}% - ${p.message}`)
      });
      
      if (result.success) {
        console.log(`✅ Video created: ${result.videoPath}`);
        console.log(`⏱️  Duration: ${result.duration}ms`);
      } else {
        console.error(`❌ Build failed: ${result.error?.message}`);
        process.exit(1);
      }
      break;
    }

    case "--spec": {
      const specPath = args[1];
      const spec = JSON.parse(readFileSync(specPath, "utf-8"));
      
      const result = await orchestrator.build(spec, { mode: "production" });
      // ... same as above
      break;
    }

    case "--queue": {
      // Process job queue
      await orchestrator.processQueue();
      break;
    }

    default:
      console.log(`
Usage:
  npm run automation:prompt "15s TikTok: rotating 3D car, neon lights, synthwave"
  npm run automation:spec ./spec.json
  npm run automation:queue
  npm run automation:dev        # Watch mode
      `);
  }
}

function parseOptions(args) {
  // Parse --key=value pairs
  const options = {};
  for (const arg of args) {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      options[key] = value || true;
    }
  }
  return options;
}

main().catch(console.error);
```

---

## 8. Example Usage

### 8.1 Basic Prompt

```bash
npm run automation:prompt "15s TikTok video: rotating 3D car with neon lights, synthwave music, text 'FAST' appearing at beat drops" --aspectRatio=9:16 --quality=production
```

### 8.2 Programmatic Usage

```typescript
import { BuildOrchestrator } from "./src/automation/buildOrchestrator";
import { PromptParser } from "./src/automation/promptParser";

const parser = new PromptParser();
const orchestrator = new BuildOrchestrator();

// Parse prompt
const spec = await parser.parse({
  prompt: "30s YouTube intro: flying through neon city, cyberpunk style, glitch text 'WELCOME', bass-heavy electronic",
  options: { aspectRatio: "16:9", targetPlatform: "youtube", quality: "production" }
});

// Build
const result = await orchestrator.build(spec, {
  mode: "production",
  onProgress: (p) => console.log(`${p.stage}: ${Math.round(p.progress * 100)}%`)
});

console.log("Video:", result.videoPath);
```

### 8.3 Custom Video Spec (JSON)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "version": "1.0",
  "createdAt": "2026-11-08T12:00:00.000Z",
  "prompt": "Custom spec example",
  "composition": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "durationInFrames": 900,
    "backgroundColor": "#0a0a0f"
  },
  "scenes": [{
    "id": "scene-1",
    "name": "Main Scene",
    "startFrame": 0,
    "durationInFrames": 900,
    "scene3D": {
      "camera": {
        "type": "perspective",
        "position": { "x": 0, "y": 5, "z": 15 },
        "target": { "x": 0, "y": 0, "z": 0 },
        "fov": 50,
        "animation": {
          "position": [
            { "frame": 0, "value": { "x": 0, "y": 5, "z": 15 } },
            { "frame": 450, "value": { "x": 10, "y": 8, "z": 5 } },
            { "frame": 900, "value": { "x": -10, "y": 3, "z": 12 } }
          ]
        }
      },
      "lights": [
        { "type": "directional", "color": { "r": 1, "g": 0.9, "b": 0.8 }, "intensity": 2, "position": { "x": 10, "y": 20, "z": 10 }, "target": { "x": 0, "y": 0, "z": 0 } },
        { "type": "point", "color": { "r": 1, "g": 0, "b": 1 }, "intensity": 50, "position": { "x": 0, "y": 5, "z": 0 } }
      ],
      "environment": { "preset": "night", "intensity": 1.5 },
      "objects": [{
        "id": "car-1",
        "name": "Neon Car",
        "type": "gltf",
        "transform": { "position": { "x": 0, "y": 0, "z": 0 }, "rotation": { "x": 0, "y": 0, "z": 0 }, "scale": { "x": 1, "y": 1, "z": 1 } },
        "gltfUrl": "/assets/models/generated/sports_car.glb",
        "animation": {
          "rotation": [
            { "frame": 0, "value": { "x": 0, "y": 0, "z": 0 } },
            { "frame": 900, "value": { "x": 0, "y": 6.28, "z": 0 }, "easing": "linear" }
          ]
        }
      }]
    },
    "tracks": [{
      "id": "text-fast",
      "name": "FAST Text",
      "type": "text",
      "startFrame": 150,
      "durationInFrames": 300,
      "blendMode": "screen",
      "opacity": 1,
      "content": {
        "type": "text",
        "text": "FAST",
        "style": {
          "fontFamily": "Rajdhani, sans-serif",
          "fontSize": 180,
          "fontWeight": "bold",
          "color": "#ff00ff",
          "stroke": { "color": "#00ffff", "width": 4 },
          "shadow": { "color": "#ff00ff", "offset": { "x": 0, "y": 0 }, "blur": 20 },
          "alignment": "center"
        },
        "animation": {
          "type": "scale",
          "duration": 30,
          "easing": "easeOutBack"
        }
      }
    }],
    "transition": { "type": "fade", "duration": 30 }
  }],
  "assets": {
    "models": [{
      "id": "car-model",
      "name": "Sports Car",
      "type": "gltf",
      "source": { "type": "blender", "blendFile": "vehicles/sports_car.blend", "objectName": "CarBody" }
    }],
    "audio": [{
      "id": "music-1",
      "name": "Synthwave Track",
      "src": "/assets/audio/synthwave_bass.mp3",
      "type": "music",
      "duration": 30
    }]
  },
  "audio": {
    "master": { "volume": 1, "effects": [] },
    "tracks": [{
      "id": "music-1",
      "name": "Synthwave",
      "src": "/assets/audio/synthwave_bass.mp3",
      "type": "music",
      "volume": 0.8,
      "startFrame": 0,
      "beatData": { "bpm": 120, "timeSignature": [4, 4], "beats": [] }
    }],
    "beatGrid": { "bpm": 120, "offsetFrames": 0, "divisions": 4 }
  },
  "render": {
    "output": { "path": "./out", "filename": "neon_car_video.mp4", "format": "mp4" },
    "video": { "codec": "h264", "crf": 18, "preset": "medium", "pixelFormat": "yuv420p" },
    "audio": { "codec": "aac", "bitrate": "192k" },
    "remotion": { "concurrency": 4 }
  }
}
```

---

## 9. Error Handling & Resilience

### 9.1 Error Types

```typescript
// src/automation/errors.ts

class AutomationError extends Error {
  constructor(
    message: string,
    public code: string,
    public stage: PipelineStage,
    public recoverable: boolean,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AutomationError";
  }
}

type PipelineStage = 
  | "parsing" 
  | "validation" 
  | "asset_resolution" 
  | "code_generation" 
  | "dependency_install" 
  | "bundling" 
  | "rendering" 
  | "encoding" 
  | "cleanup";

const ErrorCodes = {
  // Parsing
  PROMPT_PARSE_FAILED: "PROMPT_PARSE_FAILED",
  SPEC_VALIDATION_FAILED: "SPEC_VALIDATION_FAILED",
  
  // Assets
  ASSET_DOWNLOAD_FAILED: "ASSET_DOWNLOAD_FAILED",
  BLENDER_GENERATION_FAILED: "BLENDER_GENERATION_FAILED",
  BLENDER_EXPORT_FAILED: "BLENDER_EXPORT_FAILED",
  ASSET_NOT_FOUND: "ASSET_NOT_FOUND",
  
  // Code Gen
  TEMPLATE_RENDER_FAILED: "TEMPLATE_RENDER_FAILED",
  TYPE_CHECK_FAILED: "TYPE_CHECK_FAILED",
  
  // Build
  DEPENDENCY_INSTALL_FAILED: "DEPENDENCY_INSTALL_FAILED",
  BUNDLE_FAILED: "BUNDLE_FAILED",
  RENDER_FAILED: "RENDER_FAILED",
  ENCODE_FAILED: "ENCODE_FAILED",
  
  // System
  TIMEOUT: "TIMEOUT",
  OUT_OF_MEMORY: "OUT_OF_MEMORY",
  DISK_FULL: "DISK_FULL",
} as const;
```

### 9.2 Retry Strategy

```typescript
// src/automation/retry.ts

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableCodes: string[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 5000,
  maxDelay: 60000,
  backoffMultiplier: 2,
  retryableCodes: [
    "ASSET_DOWNLOAD_FAILED",
    "BLENDER_GENERATION_FAILED",
    "BLENDER_EXPORT_FAILED",
    "DEPENDENCY_INSTALL_FAILED",
    "RENDER_FAILED",
    "TIMEOUT",
  ],
};

async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === config.maxAttempts) break;
      
      const automationError = error as AutomationError;
      if (!config.retryableCodes.includes(automationError.code)) {
        throw error; // Non-retryable
      }
      
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelay
      );
      
      console.log(`Attempt ${attempt} failed: ${error.message}. Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  
  throw lastError;
}
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

```typescript
// src/automation/__tests__/promptParser.test.ts

import { PromptParser } from "../promptParser";
import { VideoSpecSchema } from "../types";

describe("PromptParser", () => {
  let parser: PromptParser;
  
  beforeEach(() => {
    parser = new PromptParser();
  });
  
  test("parses basic TikTok prompt", async () => {
    const spec = await parser.parse({
      prompt: "15s TikTok: rotating 3D cube, red color, upbeat music"
    });
    
    expect(spec).toBeDefined();
    expect(spec.composition.width).toBe(1080);
    expect(spec.composition.height).toBe(1920);
    expect(spec.scenes).toHaveLength(1);
    expect(spec.scenes[0].scene3D?.objects).toHaveLength(1);
  });
  
  test("validates spec against schema", () => {
    const result = VideoSpecSchema.safeParse(validSpec);
    expect(result.success).toBe(true);
  });
});
```

### 10.2 Integration Tests

```typescript
// src/automation/__tests__/integration.test.ts

import { BuildOrchestrator } from "../buildOrchestrator";
import { PromptParser } from "../promptParser";

describe("Full Pipeline Integration", () => {
  let orchestrator: BuildOrchestrator;
  let parser: PromptParser;
  
  beforeAll(() => {
    orchestrator = new BuildOrchestrator();
    parser = new PromptParser();
  });
  
  test("end-to-end: simple prompt to video", async () => {
    const spec = await parser.parse({
      prompt: "5s test: rotating red cube, no audio",
      options: { quality: "draft" }
    });
    
    const result = await orchestrator.build(spec, { 
      mode: "development",
      outputDir: "./test-out"
    });
    
    expect(result.success).toBe(true);
    expect(result.videoPath).toContain(".mp4");
    // Verify file exists and has reasonable size
    const stats = await fs.stat(result.videoPath!);
    expect(stats.size).toBeGreaterThan(1000);
  }, 120000); // 2 min timeout
});
```

---

## 11. Performance Considerations

### 11.1 Optimization Strategies

| Stage | Optimization |
|-------|--------------|
| **Asset Resolution** | Parallel downloads, local cache, CDN for Blender outputs |
| **Code Generation** | Template caching, incremental generation |
| **Bundling** | Vite cache, esbuild for fast transpilation |
| **Rendering** | Remotion Lambda for parallel frames, frame chunking |
| **Encoding** | Hardware acceleration (NVENC/QuickSync), CRF tuning |

### 11.2 Expected Performance

| Video Type | Duration | Resolution | Est. Render Time (Local) | Est. Render Time (Lambda) |
|------------|----------|------------|-------------------------|---------------------------|
| TikTok Draft | 15s | 1080×1920 | 30-60s | 10-20s |
| TikTok Production | 15s | 1080×1920 | 60-120s | 15-30s |
| YouTube Draft | 60s | 1920×1080 | 2-4min | 30-60s |
| YouTube Production | 60s | 1920×1080 | 4-8min | 60-120s |

---

## 12. Security Considerations

1. **Prompt Injection**: Sanitize LLM inputs, use structured function calling
2. **Path Traversal**: Validate all file paths, use `path.resolve()` with base dir
3. **Blender Execution**: Run in isolated containers/VMs, resource limits
4. **Remote Assets**: Validate URLs, size limits, MIME type checking
5. **Code Generation**: No `eval()`, use AST manipulation only
6. **Temp Files**: Automatic cleanup, secure temp directories

---

## 13. Future Extensions

### 13.1 Phase 2 Features

- **Multi-shot editing**: Auto-cut between camera angles
- **AI-generated textures**: Stable Diffusion integration for custom textures
- **Voice synthesis**: TTS for voiceover tracks
- **Auto-captioning**: Whisper integration for subtitles
- **Style transfer**: Apply visual styles from reference images

### 13.2 Phase 3 Features

- **Real-time preview**: WebRTC stream of render progress
- **Collaborative editing**: Multi-user spec editing
- **Template marketplace**: Community prompt templates
- **Analytics**: Render metrics, quality scoring
- **Auto-scaling**: Kubernetes-based render farm

---

## 14. Implementation Priority

| Priority | Component | Effort | Dependencies |
|----------|-----------|--------|--------------|
| **P0** | Prompt Parser + Zod Schemas | 2 days | LLM API key |
| **P0** | Video Spec Types | 1 day | - |
| **P0** | Asset Resolver (basic) | 2 days | Blender installed |
| **P0** | Code Generator (templates) | 3 days | - |
| **P0** | Build Orchestrator | 2 days | Remotion CLI |
| **P1** | Blender Integration (full) | 3 days | Blender configs |
| **P1** | Job Queue & Persistence | 1 day | - |
| **P1** | CLI & Dev Mode | 1 day | - |
| **P2** | Lambda Rendering | 2 days | AWS credentials |
| **P2** | Advanced Templates | 2 days | - |
| **P2** | Testing Suite | 2 days | - |

**Total estimated: ~21 days for MVP**

---

## 15. Appendix: Quick Reference

### 15.1 Key Types Summary

```typescript
// Core types you'll work with
VideoSpec           // Complete video specification
SceneSchema         // Single scene with 3D + tracks
Scene3DSchema       // 3D scene configuration
TrackSchema         // 2D overlay track (text, image, etc.)
AudioSpecSchema     // Audio tracks + beat sync
AssetRegistrySchema // Models, textures, audio, fonts
RenderSettingsSchema // Output, encoding, Remotion config
```

### 15.2 Key Functions

```typescript
// Main entry points
promptParser.parse(input)           // string → VideoSpec
assetResolver.resolveAll(spec)      // VideoSpec → ResolvedAssets
codeGenerator.generate(spec)        // VideoSpec → GeneratedCode
buildOrchestrator.build(spec)       // VideoSpec → video file path
```

### 15.3 File Locations

```
Configuration:     automation.config.ts
Types:             src/automation/types.ts
Parser:            src/automation/promptParser.ts
Generator:         src/automation/codeGenerator.ts
Assets:            src/automation/assetResolver.ts
Blender:           src/automation/blenderRunner.ts
Orchestrator:      src/automation/buildOrchestrator.ts
Templates:         src/automation/templates/
CLI:               scripts/automation-build.js
Blender Scripts:   blender/*.py
Blender Configs:   blender/configs/ & blender/automation/
```

---

*Document Version: 1.0*
*Last Updated: 2026-11-08*
*Project: threejs-remotion-video*