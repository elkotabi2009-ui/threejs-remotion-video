/**
 * VIRAL SHORT PROMPT PARSER EXTENSION
 *
 * Extends the base promptParser with viral-short specific schemas
 * Implements Module 1: Script & Narration structure
 * Implements Module 2: Camera & Cinematography parameters
 * Implements Module 3: 3D Asset specifications
 * Implements Module 5: Audio layering specifications
 */

import { z } from "zod";
import {
  defaultViralShortConfig,
  ViralShortConfig,
  ViralShortScriptStyle,
  ViralShortPlatform,
  CameraTransitionType,
  AssetSource,
} from "./viralShortConfig.js";

// Platform schema (defined early for use in other schemas)
export const ViralShortPlatformSchema = z.enum(["tiktok", "reels", "shorts"]);

// ============================================================================
// MODULE 1: SCRIPT & NARRATION SCHEMAS
// ============================================================================

// Hook formula types
export const HookFormulaSchema = z.enum([
  "paradox",
  "shockFact",
  "directAddress",
  "impossibleScale",
  "custom",
]);

export type HookFormula = z.infer<typeof HookFormulaSchema>;

// Script structure phases (frame-accurate for 30fps)
export const ScriptPhaseSchema = z.object({
  name: z.enum(["hook", "setup", "development", "pivot", "payoff"]),
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
  durationFrames: z.number().int().positive(),
  content: z.string(),
  visualCues: z.array(z.string()).optional(),
  audioCues: z.array(z.string()).optional(),
  cameraDirection: z.string().optional(),
});

export type ScriptPhase = z.infer<typeof ScriptPhaseSchema>;

// Complete viral short script
export const ViralShortScriptSchema = z.object({
  style: z.enum(["photorealistic", "comic3D"]),
  platform: ViralShortPlatformSchema,
  hook: z.object({
    formula: HookFormulaSchema,
    customText: z.string().optional(),
    frame: z.number().int().default(0),
  }),
  speechRate: z.number().positive(), // words per second
  phases: z.array(ScriptPhaseSchema).min(5).max(5),
  factChecks: z.array(z.object({
    claim: z.string(),
    source: z.string(),
    verified: z.boolean(),
    citation: z.string().optional(),
  })).optional(),
  totalDurationFrames: z.number().int().positive(),
  totalDurationSeconds: z.number().positive(),
});

export type ViralShortScript = z.infer<typeof ViralShortScriptSchema>;

// ============================================================================
// MODULE 2: CAMERA & CINEMATOGRAPHY SCHEMAS
// ============================================================================

// Camera movement keyframe
export const CameraKeyframeSchema = z.object({
  frame: z.number().int().nonnegative(),
  position: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  }),
  target: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  }),
  fov: z.number().optional(),
  rotation: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  }).optional(),
  // Smooth movement params
  easeIn: z.number().min(0).max(1).default(0.5),
  easeOut: z.number().min(0).max(1).default(0.5),
  // Jerk control
  maxAcceleration: z.number().optional(),
  maxJerk: z.number().optional(),
});

export type CameraKeyframe = z.infer<typeof CameraKeyframeSchema>;

// Transition between scenes
export const CameraTransitionSchema = z.object({
  type: z.enum(["whipPan", "zoomThrough", "slowDolly", "static", "cut"]),
  fromScene: z.string(),
  toScene: z.string(),
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
  durationFrames: z.number().int().positive(),
  // Transition-specific params
  intensity: z.number().min(0).max(1).default(0.5),
  direction: z.enum(["left", "right", "up", "down", "in", "out"]).optional(),
  pivotPoint: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
  // Quality params
  easeIn: z.number().min(0).max(1).default(0.5),
  easeOut: z.number().min(0).max(1).default(0.5),
  minFrames: z.number().int().default(20),
  maxFrames: z.number().int().default(23),
});

export type CameraTransition = z.infer<typeof CameraTransitionSchema>;

// Post-processing settings per scene
export const PostProcessingSchema = z.object({
  // Lens effects
  lensBlur: z.object({
    enabled: z.boolean().default(true),
    intensity: z.number().min(0).max(1).default(0.15),
    bokehQuality: z.enum(["high", "medium", "low"]).default("high"),
  }).optional(),

  // Highlight protection
  highlightControl: z.object({
    enabled: z.boolean().default(true),
    preventPureWhite: z.boolean().default(true),
    rolloffCurve: z.enum(["film", "linear", "reinhard"]).default("film"),
  }).optional(),

  // Vignette
  vignette: z.object({
    enabled: z.boolean().default(true),
    intensity: z.number().min(0).max(1).default(0.1),
    color: z.enum(["warm", "cool", "neutral", "purple"]).default("warm"),
  }).optional(),

  // Film grain
  filmGrain: z.object({
    enabled: z.boolean().default(true),
    intensity: z.number().min(0).max(1).default(0.03),
    animated: z.boolean().default(true),
    seed: z.number().optional(),
  }).optional(),

  // Motion blur
  motionBlur: z.object({
    enabled: z.boolean().default(true),
    shutterAngle: z.number().min(0).max(360).default(180),
    samples: z.number().int().min(1).max(64).default(16),
    calibratedPerMovement: z.boolean().default(true),
  }).optional(),

  // Color grading
  colorGrading: z.object({
    shadows: z.object({
      neverPureBlack: z.boolean().default(true),
      tint: z.enum(["warm", "cool", "purple", "neutral"]).default("warm"),
      lift: z.number().default(0.02),
    }).optional(),
    highlights: z.object({
      protected: z.boolean().default(true),
      rolloff: z.number().min(0).max(1).default(0.85),
    }).optional(),
    lut: z.string().optional(),
    exposure: z.number().default(0),
    contrast: z.number().default(1),
    saturation: z.number().default(1),
    temperature: z.number().default(0),
    tint: z.number().default(0),
  }).optional(),
});

export type PostProcessing = z.infer<typeof PostProcessingSchema>;

// Complete camera spec for a viral short
export const ViralShortCameraSpecSchema = z.object({
  // Lens characteristics
  lens: z.object({
    focalLength: z.number().default(28),
    aperture: z.number().default(2.0),
    sensorSize: z.enum(["full-frame", "aps-c", "micro-four-thirds"]).default("full-frame"),
    anamorphic: z.boolean().default(false),
    anamorphicSqueeze: z.number().default(1.33),
  }),

  // Keyframes for camera path
  keyframes: z.array(CameraKeyframeSchema).min(2),

  // Transitions between scenes
  transitions: z.array(CameraTransitionSchema),

  // Post-processing per scene (can be overridden per scene)
  defaultPostProcessing: PostProcessingSchema,
  scenePostProcessing: z.record(z.string(), PostProcessingSchema).optional(),

  // Movement constraints (Module 2 rules)
  constraints: z.object({
    maxCutsPerSecond: z.number().default(0.14),
    preferTransitions: z.boolean().default(true),
    maxJerk: z.number().default(0.5),
    preferLinearDolly: z.boolean().default(true),
    avoidLateralRotation: z.boolean().default(true),
    avoidChaoticOrbits: z.boolean().default(true),
    linearDollyPercentage: z.number().min(0).max(1).default(0.65),
  }),
});

export type ViralShortCameraSpec = z.infer<typeof ViralShortCameraSpecSchema>;

// ============================================================================
// MODULE 3: 3D ASSET SPECIFICATIONS
// ============================================================================

// Real-world asset reference
export const RealWorldAssetRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(["anatomical", "architectural", "vegetation", "vehicles", "props", "characters"]),
  sourceUrl: z.string().url(),
  license: z.enum(["CC0", "CC-BY", "CC-BY-SA", "Royalty-Free", "Custom", "Unknown"]),
  format: z.enum(["glb", "gltf", "obj", "fbx", "blend", "usd"]),
  downloadUrl: z.string().url().optional(),
  metadata: z.object({
    polygons: z.number().optional(),
    vertices: z.number().optional(),
    textures: z.number().optional(),
    rigged: z.boolean().default(false),
    animated: z.boolean().default(false),
    blendshapes: z.number().optional(),
  }).optional(),
});

export type RealWorldAssetRef = z.infer<typeof RealWorldAssetRefSchema>;

// Character specification
export const CharacterSpecSchema = z.object({
  id: z.string(),
  style: z.enum(["photorealistic", "comic3D"]),
  // Photorealistic
  useRealScan: z.boolean().default(false),
  scanSource: RealWorldAssetRefSchema.optional(),
  nativeWalkCycle: z.boolean().default(false),
  skinClothDeformation: z.boolean().default(false),
  faceRig: z.object({
    blendshapes: z.number().default(52),
    library: z.enum(["blender-native", "custom", "arkit"]).default("blender-native"),
    localOnly: z.boolean().default(true),
  }).optional(),
  // Comic 3D
  inkLines: z.object({
    enabled: z.boolean().default(true),
    minSides: z.number().int().min(0).max(4).default(3),
    thickness: z.number().default(2),
    color: z.string().default("#000000"),
  }).optional(),
  proportions: z.object({
    roundHeads: z.boolean().default(true),
    proportionalLimbs: z.boolean().default(true),
    headToBodyRatio: z.number().default(0.33), // 1:3 for comic
  }).optional(),
});

export type CharacterSpec = z.infer<typeof CharacterSpecSchema>;

// Procedural generator specification
export const ProceduralGeneratorSpecSchema = z.object({
  type: z.enum([
    "branchingStructures",  // Blood vessels, trees, rivers, neurons
    "particleFields",       // Atmospheric, magic, dust, sparks
    "geometricCities",      // Building footprints -> extruded city
    "organicShapes",        // Noise-based displacement, blobs
    "fractalStructures",    // Mandelbulb, Julia sets
    "cellularAutomata",     // Cave systems, organic growth
    "voronoiStructures",    // Cracked earth, cell structures
  ]),
  parameters: z.record(z.string(), z.any()),
  worldSpaceBounds: z.object({
    min: z.object({ x: z.number(), y: z.number(), z: z.number() }),
    max: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  }).optional(),
  seed: z.number().optional(),
  animated: z.boolean().default(false),
  animationParams: z.object({
    speed: z.number().default(1),
    loop: z.boolean().default(true),
    phaseOffset: z.number().default(0),
  }).optional(),
});

export type ProceduralGeneratorSpec = z.infer<typeof ProceduralGeneratorSpecSchema>;

// Blender headless job specification
export const BlenderJobSpecSchema = z.object({
  id: z.string(),
  type: z.enum([
    "export-gltf",
    "bake-animations",
    "generate-assets",
    "render-frames",
    "composite",
    "light-baking",
    "simulation-bake",
  ]),
  script: z.string(),
  params: z.record(z.string(), z.any()),
  inputFiles: z.array(z.string()).optional(),
  outputFiles: z.array(z.string()),
  gpuRequired: z.boolean().default(true),
  estimatedTimeMinutes: z.number().optional(),
  priority: z.number().default(0),
  dependencies: z.array(z.string()).optional(), // Job IDs
});

export type BlenderJobSpec = z.infer<typeof BlenderJobSpecSchema>;

// Complete 3D asset spec for viral short
export const ViralShortAssetSpecSchema = z.object({
  // Asset acquisition strategy
  acquisition: z.object({
    preferRealWorld: z.boolean().default(true),
    databases: z.object({
      anatomical: z.array(z.string()).optional(),
      architectural: z.array(z.string()).optional(),
      vegetation: z.array(z.string()).optional(),
      vehicles: z.array(z.string()).optional(),
      props: z.array(z.string()).optional(),
    }).optional(),
    downloadAndImport: z.boolean().default(true),
    fallbackToProcedural: z.boolean().default(true),
  }),

  // Real-world asset references
  realWorldAssets: z.array(RealWorldAssetRefSchema),

  // Characters
  characters: z.array(CharacterSpecSchema),

  // Procedural generators
  proceduralGenerators: z.array(ProceduralGeneratorSpecSchema),

  // Blender jobs
  blenderJobs: z.array(BlenderJobSpecSchema),

  // Blender headless config
  blenderHeadless: z.object({
    parallelInstances: z.number().int().min(1).max(4).default(2),
    gpuAcceleration: z.boolean().default(true),
    tempDir: z.string().default(".blender-temp"),
    scriptsDir: z.string().default("./blender"),
  }),

  // Render optimization (Module 6)
  renderOptimization: z.object({
    lightCulling: z.object({
      particleSystems: z.boolean().default(true),
      flameEffects: z.boolean().default(true),
      distantObjects: z.boolean().default(true),
      staticSceneBaking: z.boolean().default(true),
    }),
    resolutionStrategy: z.object({
      nativeWidth: z.number().default(1080),
      nativeHeight: z.number().default(1920),
      upscaleFactor: z.number().default(2),
      upscaleAlgorithm: z.enum(["lanczos", "bicubic", "ai", "fsr"]).default("lanczos"),
    }),
    parallel: z.object({
      blenderInstances: z.number().default(2),
      remotionConcurrency: z.number().default(4),
    }),
    targets: z.object({
      maxRenderTimeMinutes: z.number().default(60),
      qualityThreshold: z.string().default("visually-indistinguishable-on-mobile"),
    }),
  }),
});

export type ViralShortAssetSpec = z.infer<typeof ViralShortAssetSpecSchema>;

// ============================================================================
// MODULE 5: AUDIO SPECIFICATIONS
// ============================================================================

// Audio track specification
export const AudioTrackSchema = z.object({
  id: z.string(),
  type: z.enum([
    "ambientBed",
    "punctualSFX",
    "musicBed",
    "narrator",
    "foley",
    "riserImpact",
    "custom",
  ]),
  name: z.string(),
  // Source
  source: z.enum(["file", "procedural", "tts", "recorded"]).default("file"),
  filePath: z.string().optional(),
  proceduralGenerator: z.string().optional(),
  // Timing
  startFrame: z.number().int().nonnegative().default(0),
  durationFrames: z.number().int().positive().optional(),
  // Volume & Processing
  volume: z.number().default(0), // dBFS
  pan: z.number().min(-1).max(1).default(0),
  // Processing chain
  processing: z.object({
    compressor: z.object({
      enabled: z.boolean().default(false),
      threshold: z.number().default(-20),
      ratio: z.number().default(4),
      attack: z.number().default(0.003),
      release: z.number().default(0.1),
      targetLUFS: z.number().optional(),
    }).optional(),
    eq: z.object({
      enabled: z.boolean().default(false),
      bands: z.array(z.object({
        frequency: z.number(),
        gain: z.number(),
        q: z.number(),
      })).optional(),
    }).optional(),
    limiter: z.object({
      enabled: z.boolean().default(true),
      ceiling: z.number().default(-1), // dBTP
    }).optional(),
    reverb: z.object({
      enabled: z.boolean().default(false),
      roomSize: z.number().default(0.5),
      wetLevel: z.number().default(-20),
    }).optional(),
  }).optional(),
});

export type AudioTrack = z.infer<typeof AudioTrackSchema>;

// Audio mix specification
export const AudioMixSpecSchema = z.object({
  // Master bus
  master: z.object({
    targetLUFS: z.number().default(-14), // Platform normalization target
    truePeakMax: z.number().default(-1),
    limiterCeiling: z.number().default(-1),
    dither: z.boolean().default(true),
  }),

  // Track levels (pre-fader reference levels in dBFS)
  referenceLevels: z.object({
    musicBed: z.number().default(-24),
    ambientBed: z.number().default(-30),
    narrator: z.number().default(-18),
    punctualSFX: z.number().default(-12),
    foley: z.number().default(-18),
    riserImpact: z.number().default(-6),
  }),

  // Narrator specific (Module 5: -15 LUFS target)
  narrator: z.object({
    targetLUFS: z.number().default(-15),
    compressionRatio: z.number().default(8),
    fastAttack: z.number().default(0.003),
    mediumRelease: z.number().default(0.1),
    maxGainReduction: z.number().default(12),
    highPassHz: z.number().default(80),
    deEsser: z.boolean().default(true),
  }),

  // Sync rules
  sync: z.object({
    rule: z.enum([
      "peaks-aligned-to-visual-changes",
      "beat-synced",
      "manual",
    ]).default("peaks-aligned-to-visual-changes"),
    visualChangeFrames: z.array(z.number().int()).optional(),
    beatFrames: z.array(z.number().int()).optional(),
  }),

  // Tracks
  tracks: z.array(AudioTrackSchema),

  // Procedural audio generators
  proceduralGenerators: z.object({
    ambientDrones: z.boolean().default(true),
    proceduralBeats: z.boolean().default(true),
    syntheticSFX: z.boolean().default(true),
    voiceoverTTS: z.boolean().default(false),
  }).optional(),
});

export type AudioMixSpec = z.infer<typeof AudioMixSpecSchema>;

// ============================================================================
// COMPLETE VIRAL SHORT SPEC (Integrates all modules)
// ============================================================================

export const ViralShortSpecSchema = z.object({
  // Base metadata
  id: z.string().uuid().optional(),
  title: z.string(),
  platform: ViralShortPlatformSchema,
  style: z.enum(["photorealistic", "comic3D", "hybrid"]),

  // Duration
  durationSeconds: z.number().positive().max(180),
  durationFrames: z.number().int().positive(),
  fps: z.number().int().default(30),

  // Resolution
  width: z.number().int().default(1080),
  height: z.number().int().default(1920),
  aspectRatio: z.literal("9:16"),

  // Module 1: Script & Narration
  script: ViralShortScriptSchema,

  // Module 2: Camera & Cinematography
  camera: ViralShortCameraSpecSchema,

  // Module 3: 3D Assets
  assets: ViralShortAssetSpecSchema,

  // Module 5: Audio
  audio: AudioMixSpecSchema,

  // Module 6: Render targets
  render: z.object({
    targetPlatform: ViralShortPlatformSchema,
    encoding: z.object({
      codec: z.enum(["h264", "hevc", "vp9"]).default("h264"),
      bitrate: z.number().default(16), // Mbps
      profile: z.enum(["high", "main", "baseline"]).default("high"),
      level: z.string().default("5.1"),
      preset: z.enum(["slow", "medium", "fast", "veryfast"]).default("medium"),
    }),
    output: z.object({
      container: z.enum(["mp4", "mov", "webm"]).default("mp4"),
      audioCodec: z.enum(["aac", "opus", "mp3"]).default("aac"),
      audioBitrate: z.number().default(128), // kbps
    }),
    optimization: z.object({
      maxRenderTimeMinutes: z.number().default(60),
      parallelJobs: z.number().default(4),
      qualityVsSpeed: z.enum(["quality", "balanced", "speed"]).default("balanced"),
    }).optional(),
  }),

  // Quality gates
  qualityGates: z.object({
    frameByFrameCheck: z.boolean().default(true),
    checkLighting: z.boolean().default(true),
    checkInkLines: z.boolean().default(true),
    checkClipping: z.boolean().default(true),
    checkContrast: z.boolean().default(true),
    checkAudioSync: z.boolean().default(true),
    checkLUFS: z.boolean().default(true),
  }).optional(),

  // Metadata
  metadata: z.object({
    author: z.string().optional(),
    tags: z.array(z.string()).optional(),
    description: z.string().optional(),
    createdAt: z.string().datetime().optional(),
    version: z.string().default("1.0"),
    viralShortConfigVersion: z.string().default("1.0"),
  }).optional(),
});

export type ViralShortSpec = z.infer<typeof ViralShortSpecSchema>;

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a default viral short spec from a basic prompt
 */
export function createViralShortSpec(
  prompt: string,
  platform: "tiktok" | "reels" | "shorts" = "tiktok",
  style: "photorealistic" | "comic3D" = "photorealistic"
): ViralShortSpec {
  const config = defaultViralShortConfig;
  const platformConfig = config.platforms[platform];
  const speechRate = config.script.speechRate[style];

  // Estimate duration from prompt complexity (rough heuristic)
  const wordCount = prompt.split(/\s+/).length;
  const estimatedSeconds = Math.max(15, Math.min(180, wordCount / speechRate));
  const durationFrames = Math.round(estimatedSeconds * 30);

  // Generate hook from prompt
  const hookText = prompt.split(".")[0] || prompt;
  const hookFormula: HookFormula =
    hookText.includes("paradosso") || hookText.includes("paradox") ? "paradox" :
    hookText.includes("non crederai") || hookText.includes("shocking") ? "shockFact" :
    hookText.startsWith("se sei") || hookText.startsWith("if you") ? "directAddress" :
    "impossibleScale";

  return {
    id: crypto.randomUUID(),
    title: prompt.substring(0, 80),
    platform,
    style,
    durationSeconds: estimatedSeconds,
    durationFrames,
    fps: 30,
    width: 1080,
    height: 1920,
    aspectRatio: "9:16",

    // Script
    script: {
      style,
      platform,
      hook: {
        formula: hookFormula,
        frame: 0,
      },
      speechRate,
      phases: [
        {
          name: "hook",
          startFrame: 0,
          endFrame: config.script.structure.hookFrames,
          durationFrames: config.script.structure.hookFrames,
          content: hookText,
        },
        {
          name: "setup",
          startFrame: config.script.structure.hookFrames,
          endFrame: config.script.structure.hookFrames + config.script.structure.setupFrames,
          durationFrames: config.script.structure.setupFrames,
          content: "Setup della scena e contesto",
        },
        {
          name: "development",
          startFrame: config.script.structure.hookFrames + config.script.structure.setupFrames,
          endFrame: config.script.structure.hookFrames + config.script.structure.setupFrames + config.script.structure.developmentFrames,
          durationFrames: config.script.structure.developmentFrames,
          content: "Sviluppo progressivo dei dati e narrazione",
        },
        {
          name: "pivot",
          startFrame: durationFrames - config.script.structure.pivotFrames - config.script.structure.payoffFrames,
          endFrame: durationFrames - config.script.structure.payoffFrames,
          durationFrames: config.script.structure.pivotFrames,
          content: "Il pivot - cambio di prospettiva",
        },
        {
          name: "payoff",
          startFrame: durationFrames - config.script.structure.payoffFrames,
          endFrame: durationFrames,
          durationFrames: config.script.structure.payoffFrames,
          content: "Payoff finale con twist",
        },
      ],
      totalDurationFrames: durationFrames,
      totalDurationSeconds: estimatedSeconds,
    },

    // Camera (minimal default)
    camera: {
      lens: {
        focalLength: 28,
        aperture: 2.0,
        sensorSize: "full-frame",
        anamorphic: false,
        anamorphicSqueeze: 1.33,
      },
      keyframes: [
        {
          frame: 0,
          position: { x: 0, y: 2, z: 5 },
          target: { x: 0, y: 0, z: 0 },
          fov: 50,
          easeIn: 0.5,
          easeOut: 0.5,
        },
        {
          frame: durationFrames,
          position: { x: 3, y: 1.5, z: 3 },
          target: { x: 0, y: 0, z: 0 },
          fov: 35,
          easeIn: 0.5,
          easeOut: 0.5,
        },
      ],
      transitions: [],
      defaultPostProcessing: {
        lensBlur: { enabled: true, intensity: 0.15, bokehQuality: "high" },
        highlightControl: { enabled: true, preventPureWhite: true, rolloffCurve: "film" },
        vignette: { enabled: true, intensity: 0.1, color: "warm" },
        filmGrain: { enabled: true, intensity: 0.03, animated: true },
        motionBlur: { enabled: true, shutterAngle: 180, samples: 16, calibratedPerMovement: true },
        colorGrading: {
          shadows: { neverPureBlack: true, tint: "warm", lift: 0.02 },
          highlights: { protected: true, rolloff: 0.85 },
          exposure: 0,
          contrast: 1,
          saturation: 1,
          temperature: 0,
          tint: 0,
        },
      },
      constraints: {
        maxCutsPerSecond: 0.14,
        preferTransitions: true,
        maxJerk: 0.5,
        preferLinearDolly: true,
        avoidLateralRotation: true,
        avoidChaoticOrbits: true,
        linearDollyPercentage: 0.65,
      },
    },

    // Assets (minimal)
    assets: {
      acquisition: {
        preferRealWorld: true,
        downloadAndImport: true,
        fallbackToProcedural: true,
      },
      realWorldAssets: [],
      characters: [],
      proceduralGenerators: [],
      blenderJobs: [],
      blenderHeadless: {
        parallelInstances: 2,
        gpuAcceleration: true,
        tempDir: ".blender-temp",
        scriptsDir: "./blender",
      },
      renderOptimization: {
        lightCulling: {
          particleSystems: true,
          flameEffects: true,
          distantObjects: true,
          staticSceneBaking: true,
        },
        resolutionStrategy: {
          nativeWidth: 1080,
          nativeHeight: 1920,
          upscaleFactor: 2,
          upscaleAlgorithm: "lanczos",
        },
        parallel: {
          blenderInstances: 2,
          remotionConcurrency: 4,
        },
        targets: {
          maxRenderTimeMinutes: 60,
          qualityThreshold: "visually-indistinguishable-on-mobile",
        },
      },
    },

    // Audio (minimal)
    audio: {
      master: {
        targetLUFS: -14,
        truePeakMax: -1,
        limiterCeiling: -1,
        dither: true,
      },
      referenceLevels: {
        musicBed: -24,
        ambientBed: -30,
        narrator: -18,
        punctualSFX: -12,
        foley: -18,
        riserImpact: -6,
      },
      narrator: {
        targetLUFS: -15,
        compressionRatio: 8,
        fastAttack: 0.003,
        mediumRelease: 0.1,
        maxGainReduction: 12,
        highPassHz: 80,
        deEsser: true,
      },
      sync: {
        rule: "peaks-aligned-to-visual-changes",
      },
      tracks: [],
      proceduralGenerators: {
        ambientDrones: true,
        proceduralBeats: true,
        syntheticSFX: true,
        voiceoverTTS: false,
      },
    },

    // Render
    render: {
      targetPlatform: platform,
      encoding: {
        codec: "h264",
        bitrate: platformConfig.encoding.bitrate,
        profile: "high",
        level: platformConfig.encoding.level,
        preset: "medium",
      },
      output: {
        container: "mp4",
        audioCodec: "aac",
        audioBitrate: platformConfig.audioSpec.bitrate,
      },
      optimization: {
        maxRenderTimeMinutes: 60,
        parallelJobs: 4,
        qualityVsSpeed: "balanced",
      },
    },

    qualityGates: {
      frameByFrameCheck: true,
      checkLighting: true,
      checkInkLines: style === "comic3D",
      checkClipping: true,
      checkContrast: true,
      checkAudioSync: true,
      checkLUFS: true,
    },

    metadata: {
      createdAt: new Date().toISOString(),
      version: "1.0",
      viralShortConfigVersion: "1.0",
    },
  };
}

/**
 * Validate a viral short spec
 */
export function validateViralShortSpec(spec: unknown): { valid: boolean; errors: string[]; spec?: ViralShortSpec } {
  const result = ViralShortSpecSchema.safeParse(spec);
  if (result.success) {
    return { valid: true, errors: [], spec: result.data };
  }
  return {
    valid: false,
    errors: result.error.issues.map(e => `${e.path.join(".")}: ${e.message}`),
  };
}

/**
 * Get platform-specific config
 */
export function getPlatformConfig(platform: "tiktok" | "reels" | "shorts") {
  return defaultViralShortConfig.platforms[platform];
}

export default {
  createViralShortSpec,
  validateViralShortSpec,
  getPlatformConfig,
  ViralShortSpecSchema,
  ViralShortScriptSchema,
  ViralShortCameraSpecSchema,
  ViralShortAssetSpecSchema,
  AudioMixSpecSchema,
};