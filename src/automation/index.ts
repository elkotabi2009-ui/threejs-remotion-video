/**
 * AUTOMATION LAYER - MAIN EXPORTS
 *
 * Unified exports for both standard and viral short pipelines
 */

// Base automation (standard pipeline)
export {
  parseVideoPrompt,
  parseVideoPromptSafe,
  validateVideoSpec,
  createVideoSpec,
} from "./promptParser.js";

export type {
  VideoSpec,
  SceneSpec,
  Asset,
  Animation,
  Transition,
  AudioSpec,
  StyleSpec,
  Vector3,
  Color,
  VideoSpecSchema,
  SceneSpecSchema,
  AudioSpecSchema,
  StyleSpecSchema,
  AssetSchema,
  AnimationSchema,
  TransitionSchema,
  Vector3Schema,
  ColorSchema,
} from "./promptParser.js";

export {
  generateCode,
  saveGeneratedFiles,
  createCodeGenerator,
} from "./codeGenerator.js";

export type {
  GenerationOptions,
  GeneratedFiles,
  AssetManifest,
  SceneManifest,
  AssetRequirement,
  AnimationManifest,
  TransitionManifest,
  CameraManifest,
  LightingManifest,
  AudioManifest,
  StyleManifest,
} from "./codeGenerator.js";

export {
  BuildOrchestrator,
  createBuildOrchestrator,
  buildVideoFromPrompt,
  buildVideoFromSpecFile,
} from "./buildOrchestrator.js";

export type {
  BuildOrchestratorConfig,
  BuildProgress,
  BuildResult,
  PipelineCallbacks,
} from "./buildOrchestrator.js";

export {
  AssetResolver,
} from "./assetResolver.js";

export type {
  AssetResolutionResult,
  AssetResolverConfig,
} from "./assetResolver.js";

export {
  BlenderRunner,
  createBlenderRunner,
  exportToGLTF,
  bakeAnimations,
  generateBlenderAsset,
} from "./blenderRunner.js";

export type {
  BlenderConfig,
  BlenderResult,
  ExportGLTFOptions,
  BakeAnimationsOptions,
  GenerateAssetsOptions,
  BlenderScriptOptions,
} from "./blenderRunner.js";

export {
  defaultConfig,
  platformPresets,
  loadConfigFromEnv,
  getConfig,
  validateConfig,
} from "./automation.config.js";

export type {
  AutomationConfig,
  LLMConfig,
  BuildConfig,
  RemotionConfig,
  AssetConfig,
  QueueConfig,
} from "./automation.config.js";

// Viral Short Pipeline (ultra-realistic TikTok/Reels/Shorts)
export {
  ViralShortOrchestrator,
  createViralShortOrchestrator,
  buildViralShort,
} from "./viralShortOrchestrator.js";

export type {
  ViralShortOrchestratorConfig,
  ViralShortBuildOptions,
  ViralShortBuildResult,
} from "./viralShortOrchestrator.js";

export {
  defaultViralShortConfig,
} from "./viralShortConfig.js";

export type {
  ViralShortConfig,
  ViralShortPlatformPreset,
} from "./viralShortConfig.js";

export type {
  ViralShortScriptStyle,
  ViralShortPlatform,
  CameraTransitionType,
  AssetSource,
  RenderTarget,
} from "./viralShortConfig.js";

export {
  createViralShortSpec,
  validateViralShortSpec,
  getPlatformConfig,
} from "./viralShortPromptParser.js";

export type {
  ViralShortSpec,
  ViralShortScript,
  ViralShortCameraSpec,
  ViralShortAssetSpec,
  AudioMixSpec,
  HookFormula,
  ScriptPhase,
  CameraKeyframe,
  CameraTransition,
  PostProcessing,
  RealWorldAssetRef,
  CharacterSpec,
  ProceduralGeneratorSpec,
  BlenderJobSpec,
  AudioTrack,
  ViralShortSpecSchema,
  ViralShortScriptSchema,
  ViralShortCameraSpecSchema,
  ViralShortAssetSpecSchema,
  AudioMixSpecSchema,
  ViralShortPlatformSchema,
} from "./viralShortPromptParser.js";

// Re-export standard types with aliases
export type {
  VideoSpec as StandardVideoSpec,
  SceneSpec as StandardSceneSpec,
} from "./promptParser.js";

export type {
  ViralShortSpec as ViralVideoSpec,
  ViralShortScript as ViralScript,
  ViralShortCameraSpec as ViralCameraSpec,
  ViralShortAssetSpec as ViralAssetSpec,
  AudioMixSpec as ViralAudioSpec,
} from "./viralShortPromptParser.js";

// Value imports for indexExports
import { parseVideoPrompt } from "./promptParser.js";
import { generateCode } from "./codeGenerator.js";
import { BuildOrchestrator } from "./buildOrchestrator.js";
import { AssetResolver } from "./assetResolver.js";
import { BlenderRunner } from "./blenderRunner.js";
import { getConfig } from "./automation.config.js";
import { ViralShortOrchestrator, createViralShortOrchestrator, buildViralShort } from "./viralShortOrchestrator.js";
import { defaultViralShortConfig } from "./viralShortConfig.js";

// ============================================================================
// QUICK START FUNCTIONS
// ============================================================================

/**
 * Quick start: Build a standard video from prompt
 */
export async function quickBuild(prompt: string, options?: {
  platform?: "youtube" | "tiktok" | "reels" | "shorts" | "instagram" | "generic";
  duration?: number;
  render?: boolean;
}) {
  const { createBuildOrchestrator } = await import("./buildOrchestrator.js");
  const { parseVideoPrompt: parse } = await import("./promptParser.js");

  const spec = parse(prompt);
  const orchestrator = createBuildOrchestrator({
    workDir: ".build",
    outputDir: "out",
    verbose: true,
  });

  return orchestrator.buildFromPrompt(spec, { render: options?.render !== false });
}

/**
 * Quick start: Build a viral short from prompt
 */
export async function quickViralBuild(prompt: string, options?: {
  platform?: "tiktok" | "reels" | "shorts";
  style?: "photorealistic" | "comic3D";
  duration?: number;
  render?: boolean;
}) {
  const { createViralShortOrchestrator } = await import("./viralShortOrchestrator.js");

  const orchestrator = createViralShortOrchestrator({
    workDir: ".build-viral",
    outputDir: "out",
    verbose: true,
    defaultPlatform: options?.platform || "tiktok",
    defaultStyle: options?.style || "photorealistic",
  });

  return orchestrator.buildFromPrompt({
    prompt,
    platform: options?.platform,
    style: options?.style,
    durationSeconds: options?.duration,
    render: options?.render !== false,
  });
}

/**
 * Generate spec only (no render) - standard pipeline
 */
export function generateStandardSpec(prompt: string, options?: {
  platform?: "youtube" | "tiktok" | "reels" | "shorts" | "instagram" | "generic";
  duration?: number;
}) {
  // Use dynamic import to avoid circular dependency issues
  const { parseVideoPrompt } = require("./promptParser.js");
  return parseVideoPrompt(prompt);
}

/**
 * Generate spec only (no render) - viral short pipeline
 */
export function generateViralSpec(prompt: string, options?: {
  platform?: "tiktok" | "reels" | "shorts";
  style?: "photorealistic" | "comic3D";
  duration?: number;
}) {
  const { createViralShortSpec } = require("./viralShortPromptParser.js");
  return createViralShortSpec(
    prompt,
    options?.platform || "tiktok",
    options?.style || "photorealistic"
  );
}

// ============================================================================
// PIPELINE COMPARISON HELPER
// ============================================================================

export const PIPELINE_INFO = {
  standard: {
    name: "Standard Video Pipeline",
    description: "General-purpose video generation for YouTube, generic, horizontal formats",
    targetPlatforms: ["youtube", "generic", "twitch", "linkedin"],
    aspectRatios: ["16:9", "4:3", "21:9", "1:1"],
    features: [
      "Natural language prompt parsing",
      "Template-based code generation",
      "Asset resolution with Blender integration",
      "Multi-scene compositions",
      "Audio with beat sync",
      "Post-processing effects",
    ],
    useCases: [
      "YouTube intros/outros",
      "Product demos",
      "Educational videos",
      "Corporate presentations",
      "Twitch overlays",
    ],
  },
  viralShort: {
    name: "Ultra-Realistic Viral Short Pipeline",
    description: "Specialized for TikTok/Reels/Shorts with zero AI slop, professional cinematography",
    targetPlatforms: ["tiktok", "reels", "shorts"],
    aspectRatios: ["9:16"],
    features: [
      "Module 1: Viral script structure (hook → setup → development → pivot → payoff)",
      "Module 2: Cinematic camera (0.14 cuts/sec, jerk minimization, smooth transitions)",
      "Module 3: Real-world assets (anatomical, architectural, vegetation databases)",
      "Module 4: Multi-agent architecture (isolated file copies, quality gates)",
      "Module 5: Professional audio (19 tracks, -15 LUFS narrator, millisecond sync)",
      "Module 6: Render optimization (<1hr, 1080p native + intelligent upscale)",
      "Fact-checking with verified sources",
      "Frame-by-frame quality gates",
    ],
    useCases: [
      "Viral educational shorts (science, history, facts)",
      "Storytelling with data visualization",
      "Anatomical/medical visualizations",
      "Architectural/city flythroughs",
      "Character-driven narratives",
    ],
    styles: {
      photorealistic: {
        speechRate: "2.77 wps",
        assets: "Real human 3D scans, 52 blendshapes, native walk cycles",
        rendering: "Film grain, cinematic color grading, lens blur, motion blur",
      },
      comic3D: {
        speechRate: "4.0 wps",
        assets: "2D-in-3D characters, ink lines (3/4 sides), round heads",
        rendering: "Cel-shaded, outlined, proportional limbs",
      },
    },
  },
};

/**
 * Print pipeline comparison
 */
export function printPipelineInfo() {
  console.log("\n📊 PIPELINE COMPARISON");
  console.log("=".repeat(60));

  for (const [key, info] of Object.entries(PIPELINE_INFO)) {
    console.log(`\n${info.name.toUpperCase()}`);
    console.log(`  ${info.description}`);
    console.log(`  Platforms: ${info.targetPlatforms.join(", ")}`);
    console.log(`  Aspect Ratios: ${info.aspectRatios.join(", ")}`);
    console.log(`  Features: ${info.features.length} modules`);
    console.log(`  Use Cases: ${info.useCases.join(", ")}`);

    if (key === "viralShort" && "styles" in info) {
      const viralInfo = info as typeof PIPELINE_INFO.viralShort;
      console.log("  Styles:");
      for (const [style, details] of Object.entries(viralInfo.styles)) {
        console.log(`    ${style}: ${details.speechRate}, ${details.assets}`);
      }
    }
  }

  console.log("\n🚀 QUICK START COMMANDS:");
  console.log("  Standard:  npm run automation:prompt \"15s YouTube: spinning cube\"");
  console.log("  Viral:     npm run viral:prompt \"Paradosso: 100km vasi sanguigni\" --platform tiktok --style photorealistic");
  console.log("");
}

const indexExports = {
  // Standard
  parseVideoPrompt,
  generateCode,
  BuildOrchestrator,
  AssetResolver,
  BlenderRunner,
  getConfig,
  // Viral Short
  ViralShortOrchestrator,
  createViralShortOrchestrator,
  buildViralShort,
  defaultViralShortConfig,
  // Quick start
  quickBuild,
  quickViralBuild,
  generateStandardSpec,
  generateViralSpec,
  printPipelineInfo,
  PIPELINE_INFO,
};

export default indexExports;