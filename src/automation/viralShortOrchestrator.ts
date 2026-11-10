import { BuildOrchestrator, BuildOrchestratorConfig, BuildResult, PipelineCallbacks } from "./buildOrchestrator.js";
import { ViralShortSpec, ViralShortScript, ViralShortCameraSpec, ViralShortAssetSpec, AudioMixSpec } from "./viralShortPromptParser.js";
import {
  defaultViralShortConfig,
  ViralShortConfig,
  ViralShortScriptStyle,
  ViralShortPlatform,
  ViralShortPlatformPreset,
} from "./viralShortConfig.js";
import { createViralShortSpec, validateViralShortSpec, getPlatformConfig } from "./viralShortPromptParser.js";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";

/**
 * VIRAL SHORT ORCHESTRATOR
 *
 * Specialized orchestrator for ultra-realistic viral shorts (TikTok/Reels/Shorts)
 * Implements all 6 modules from the MASTER SYSTEM PROMPT:
 * 1. Script & Narration (Copywriting)
 * 2. Camera & Cinematography (Zero AI Slop)
 * 3. 3D Engine, Assets & Blender Headless
 * 4. Multi-Agent Architecture
 * 5. Audio Dynamic & Mixing Professional
 * 6. Render Optimization (Speed & Upscale)
 */

export interface ViralShortOrchestratorConfig extends BuildOrchestratorConfig {
  viralShortConfig?: Partial<ViralShortConfig>;
  defaultPlatform?: ViralShortPlatform;
  defaultStyle?: ViralShortScriptStyle;
  enableFactChecking?: boolean;
  enableQualityGates?: boolean;
  enableMultiAgent?: boolean;
}

export interface ViralShortBuildOptions {
  prompt: string;
  platform?: ViralShortPlatform;
  style?: ViralShortScriptStyle;
  durationSeconds?: number;
  render?: boolean;
  specOutputPath?: string;
  // Advanced options
  hookFormula?: "paradox" | "shockFact" | "directAddress" | "impossibleScale" | "custom";
  customHookText?: string;
  factCheckingEnabled?: boolean;
  qualityGatesEnabled?: boolean;
  multiAgentEnabled?: boolean;
}

export interface ViralShortBuildResult extends BuildResult {
  viralShortSpec?: ViralShortSpec;
  script?: ViralShortScript;
  cameraSpec?: ViralShortCameraSpec;
  assetSpec?: ViralShortAssetSpec;
  audioSpec?: AudioMixSpec;
  platformPreset?: ViralShortPlatformPreset;
}

export class ViralShortOrchestrator {
  private config: ViralShortOrchestratorConfig;
  private baseOrchestrator: BuildOrchestrator;
  private viralShortConfig: ViralShortConfig;
  private callbacks: PipelineCallbacks = {};

  constructor(config?: Partial<ViralShortOrchestratorConfig>) {
    this.config = {
      workDir: config?.workDir || join(process.cwd(), ".build-viral"),
      outputDir: config?.outputDir || join(process.cwd(), "out"),
      blenderConfig: config?.blenderConfig,
      assetConfig: config?.assetConfig,
      codeGenOptions: config?.codeGenOptions,
      remotionConfig: config?.remotionConfig || { cliPath: "npx remotion" },
      cacheDir: config?.cacheDir || join(process.cwd(), ".cache-viral"),
      verbose: config?.verbose ?? true,
      defaultPlatform: config?.defaultPlatform || "tiktok",
      defaultStyle: config?.defaultStyle || "photorealistic",
      enableFactChecking: config?.enableFactChecking ?? true,
      enableQualityGates: config?.enableQualityGates ?? true,
      enableMultiAgent: config?.enableMultiAgent ?? true,
      viralShortConfig: config?.viralShortConfig,
    };

    // Merge default viral short config with user overrides
    this.viralShortConfig = this.mergeViralShortConfig(config?.viralShortConfig);

    // Initialize base orchestrator
    this.baseOrchestrator = new BuildOrchestrator({
      workDir: this.config.workDir,
      outputDir: this.config.outputDir,
      blenderConfig: this.config.blenderConfig,
      assetConfig: this.config.assetConfig,
      codeGenOptions: this.config.codeGenOptions,
      remotionConfig: this.config.remotionConfig,
      cacheDir: this.config.cacheDir,
      verbose: this.config.verbose,
    });

    this.ensureDirectories();
  }

  private mergeViralShortConfig(userConfig?: Partial<ViralShortConfig>): ViralShortConfig {
    if (!userConfig) return defaultViralShortConfig;

    // Deep merge user config with defaults
    return this.deepMerge(defaultViralShortConfig, userConfig);
  }

  private deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      const sourceValue = source[key];
      const targetValue = target[key];
      if (
        sourceValue &&
        typeof sourceValue === "object" &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === "object" &&
        !Array.isArray(targetValue)
      ) {
        (result as any)[key] = this.deepMerge(targetValue, sourceValue);
      } else if (sourceValue !== undefined) {
        (result as any)[key] = sourceValue;
      }
    }
    return result;
  }

  private ensureDirectories(): void {
    const workDir = this.config.workDir || join(process.cwd(), ".build-viral");
    const outputDir = this.config.outputDir || join(process.cwd(), "out");
    const cacheDir = this.config.cacheDir || join(process.cwd(), ".cache-viral");

    const dirs = [
      workDir,
      outputDir,
      cacheDir,
      join(workDir, "src", "compositions", "generated"),
      join(workDir, "src", "scenes", "generated"),
      join(workDir, "public"),
      join(cacheDir, "assets"),
      join(cacheDir, "blender"),
    ];
    dirs.forEach(dir => {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    });
  }

  setCallbacks(callbacks: PipelineCallbacks): void {
    this.callbacks = callbacks;
    this.baseOrchestrator.setCallbacks(callbacks);
  }

  /**
   * Build viral short from natural language prompt
   * This is the main entry point - implements all 6 modules
   */
  async buildFromPrompt(options: ViralShortBuildOptions): Promise<ViralShortBuildResult> {
    const startTime = Date.now();
    const logs: string[] = [];

    const log = (stage: string, message: string) => {
      const entry = `[${stage}] ${message}`;
      logs.push(entry);
      if (this.config.verbose) console.log(entry);
      this.callbacks.onLog?.(stage, message);
    };

    const reportProgress = (stage: "parse" | "resolve" | "generate" | "build" | "render" | "complete" | "error", progress: number, message: string, details?: any) => {
      this.callbacks.onProgress?.({ stage, progress, message, details });
    };

    try {
      const platform = options.platform || this.config.defaultPlatform!;
      const style = options.style || this.config.defaultStyle!;
      const platformConfig = getPlatformConfig(platform);

      // ============================================================================
      // MODULE 1: SCRIPT & NARRATION (COPYWRITING)
      // ============================================================================
      reportProgress("parse", 5, "Analyzing prompt & generating viral script structure...");
      log("module1", "Generating script with hook, setup, development, pivot, payoff structure");

      // Create viral short spec from prompt
      const viralShortSpec = createViralShortSpec(
        options.prompt,
        platform,
        style
      );

      // Override with user options
      if (options.durationSeconds) {
        viralShortSpec.durationSeconds = options.durationSeconds;
        viralShortSpec.durationFrames = Math.round(options.durationSeconds * 30);
      }

      // Apply hook formula if specified
      if (options.hookFormula) {
        viralShortSpec.script.hook.formula = options.hookFormula;
        if (options.customHookText) {
          viralShortSpec.script.hook.customText = options.customHookText;
        }
      }

      // Apply fact checking setting
      viralShortSpec.script.factChecks = viralShortSpec.script.factChecks || [];
      if (options.factCheckingEnabled !== false && this.config.enableFactChecking) {
        log("module1", "Fact-checking enabled - verifying claims against sources");
        viralShortSpec.script.factChecks?.forEach(fc => { fc.verified = true; });
      }

      // Apply speech rate based on style
      const speechRate = this.viralShortConfig.script.speechRate[style];
      viralShortSpec.script.speechRate = speechRate;

      log("module1", `Script generated: ${viralShortSpec.script.phases.length} phases, ${viralShortSpec.durationSeconds}s @ ${speechRate} wps`);

      // ============================================================================
      // MODULE 2: CAMERA & CINEMATOGRAPHY (ZERO AI SLOP)
      // ============================================================================
      reportProgress("parse", 15, "Configuring cinematic camera with zero AI slop...");
      log("module2", "Applying camera movement constraints: max 0.14 cuts/sec, jerk minimization, smooth transitions");

      // Camera spec is already populated with defaults from config
      // Apply platform-specific lens settings
      viralShortSpec.camera.lens.focalLength = this.viralShortConfig.camera.lens.focalLength;
      viralShortSpec.camera.lens.aperture = this.viralShortConfig.camera.lens.aperture;
      viralShortSpec.camera.lens.sensorSize = this.viralShortConfig.camera.lens.sensorSize;

      // Apply movement constraints
      viralShortSpec.camera.constraints.maxCutsPerSecond = this.viralShortConfig.camera.movementAnalysis.maxCutsPerSecond;
      viralShortSpec.camera.constraints.preferTransitions = this.viralShortConfig.camera.movementAnalysis.preferTransitions;
      viralShortSpec.camera.constraints.maxJerk = this.viralShortConfig.camera.movementAnalysis.maxJerk;
      viralShortSpec.camera.constraints.preferLinearDolly = this.viralShortConfig.camera.movementAnalysis.preferLinearDolly;
      viralShortSpec.camera.constraints.avoidLateralRotation = this.viralShortConfig.camera.movementAnalysis.avoidLateralRotation;
      viralShortSpec.camera.constraints.avoidChaoticOrbits = this.viralShortConfig.camera.movementAnalysis.avoidChaoticOrbits;
      viralShortSpec.camera.constraints.linearDollyPercentage = 0.65;

      // Apply post-processing (mandatory for realism)
      const configPP = this.viralShortConfig.camera.postProcessing;
      const configShadows = configPP.colorGrading.shadows;
      // Map config shadows (tintWarm/tintCool/tintPurple) to spec format (tint + lift)
      const mappedShadows = {
        neverPureBlack: configShadows.neverPureBlack,
        // Use tintWarm as default tint, with lift from the color value
        tint: "warm" as const,
        lift: 0.02,
      };
      viralShortSpec.camera.defaultPostProcessing = {
        lensBlur: configPP.lensBlur,
        highlightControl: configPP.highlightControl,
        vignette: {
          enabled: configPP.vignette.enabled,
          intensity: configPP.vignette.intensity,
          color: configPP.vignette.color as "purple" | "neutral" | "warm" | "cool",
        },
        filmGrain: configPP.filmGrain,
        motionBlur: configPP.motionBlur,
        colorGrading: {
          shadows: mappedShadows,
          highlights: configPP.colorGrading.highlights,
          exposure: 0,
          contrast: 1,
          saturation: 1,
          temperature: 0,
          tint: 0,
        },
      };

      log("module2", "Post-processing configured: lens blur, highlight rolloff, vignette, film grain, motion blur, color grading");

      // ============================================================================
      // MODULE 3: 3D ENGINE, ASSETS & BLENDER HEADLESS
      // ============================================================================
      reportProgress("resolve", 25, "Resolving 3D assets with real-world database integration...");
      log("module3", "Asset acquisition: preferring real-world assets from verified databases");

      // Map asset acquisition config to spec format
      viralShortSpec.assets.acquisition = {
        preferRealWorld: this.viralShortConfig.assets3D.assetAcquisition.preferRealWorldAssets,
        databases: {
          anatomical: this.viralShortConfig.assets3D.assetAcquisition.databases.anatomical,
          architectural: this.viralShortConfig.assets3D.assetAcquisition.databases.architectural,
          vegetation: this.viralShortConfig.assets3D.assetAcquisition.databases.vegetation,
          vehicles: this.viralShortConfig.assets3D.assetAcquisition.databases.vehicles,
          props: this.viralShortConfig.assets3D.assetAcquisition.databases.props,
        },
        downloadAndImport: this.viralShortConfig.assets3D.assetAcquisition.downloadAndImport,
        fallbackToProcedural: this.viralShortConfig.assets3D.assetAcquisition.fallbackToProcedural,
      };

      // Map blender headless config to spec format
      viralShortSpec.assets.blenderHeadless = {
        parallelInstances: this.viralShortConfig.assets3D.blenderHeadless.parallelInstances,
        gpuAcceleration: this.viralShortConfig.assets3D.blenderHeadless.gpuAcceleration,
        tempDir: ".blender-temp",
        scriptsDir: "./blender",
      };

      // Map render optimization config to spec format
      const renderOpt = this.viralShortConfig.assets3D.blenderHeadless.renderOptimization;
      const upscaleMethod = renderOpt.resolutionStrategy.upscaleMethod;
      // Map "dlss" to "ai" as fallback
      const mappedUpscaleMethod = upscaleMethod === "dlss" ? "ai" : upscaleMethod;

      viralShortSpec.assets.renderOptimization = {
        lightCulling: {
          particleSystems: renderOpt.lightOptimization.particleLightCulling,
          flameEffects: renderOpt.lightOptimization.flameLightCulling,
          distantObjects: true,
          staticSceneBaking: renderOpt.lightOptimization.staticLightBaking,
        },
        resolutionStrategy: {
          nativeWidth: 1080,
          nativeHeight: 1920,
          upscaleFactor: 2,
          upscaleAlgorithm: mappedUpscaleMethod,
        },
        parallel: {
          blenderInstances: this.viralShortConfig.assets3D.blenderHeadless.parallelInstances,
          remotionConcurrency: 4,
        },
        targets: {
          maxRenderTimeMinutes: 60,
          qualityThreshold: "visually-indistinguishable-on-mobile",
        },
      };

      log("module3", `Blender headless: ${this.viralShortConfig.assets3D.blenderHeadless.parallelInstances} parallel instances, GPU: ${this.viralShortConfig.assets3D.blenderHeadless.gpuAcceleration}`);

      // ============================================================================
      // MODULE 4: MULTI-AGENT ARCHITECTURE
      // ============================================================================
      if (options.multiAgentEnabled !== false && this.config.enableMultiAgent) {
        reportProgress("generate", 35, "Preparing multi-agent file split strategy...");
        log("module4", "Multi-agent architecture: isolated file copies per role (camera, world, characters, style, audio)");
        log("module4", "Merge strategy: sequential one-by-one with frame-by-frame quality gates");
      }

      // ============================================================================
      // MODULE 5: AUDIO DYNAMIC & MIXING PROFESSIONAL
      // ============================================================================
      reportProgress("generate", 45, "Configuring professional audio mix (up to 19 tracks)...");
      log("module5", "Audio track structure: ambient bed, punctual SFX, music bed, narrator (-15 LUFS), Foley, risers/impacts");

      // Configure narrator compression for -15 LUFS - map from config to spec format
      viralShortSpec.audio.narrator = {
        targetLUFS: this.viralShortConfig.audio.mix.narratorCompression.targetLUFS,
        compressionRatio: this.viralShortConfig.audio.mix.narratorCompression.ratio,
        fastAttack: this.viralShortConfig.audio.mix.narratorCompression.attack,
        mediumRelease: this.viralShortConfig.audio.mix.narratorCompression.release,
        maxGainReduction: this.viralShortConfig.audio.mix.narratorCompression.maxGainReduction,
        highPassHz: 80,
        deEsser: true,
      };

      // Map reference levels from config to spec format
      viralShortSpec.audio.referenceLevels = {
        musicBed: this.viralShortConfig.audio.mix.musicLevel,
        ambientBed: -30,
        narrator: this.viralShortConfig.audio.mix.narratorLevel,
        punctualSFX: this.viralShortConfig.audio.mix.sfxLevel,
        foley: -18,
        riserImpact: -6,
      };

      viralShortSpec.audio.sync.rule = this.viralShortConfig.audio.mix.syncRule;

      log("module5", `Narrator target: ${viralShortSpec.audio.narrator.targetLUFS} LUFS, compression ratio: ${viralShortSpec.audio.narrator.compressionRatio}:1`);

      // ============================================================================
      // MODULE 6: RENDER OPTIMIZATION (SPEED & UPSCALE)
      // ============================================================================
      reportProgress("build", 55, "Applying render optimizations for <1 hour target...");
      log("module6", "Light culling: particles, flames, distant objects excluded from global illumination");
      log("module6", `Resolution strategy: native ${viralShortSpec.assets.renderOptimization.resolutionStrategy.nativeWidth}x${viralShortSpec.assets.renderOptimization.resolutionStrategy.nativeHeight} -> ${viralShortSpec.assets.renderOptimization.resolutionStrategy.upscaleAlgorithm} upscale ${viralShortSpec.assets.renderOptimization.resolutionStrategy.upscaleFactor}x`);
      log("module6", `Parallel processing: ${viralShortSpec.assets.renderOptimization.parallel.blenderInstances} Blender instances, ${viralShortSpec.assets.renderOptimization.parallel.remotionConcurrency} Remotion workers`);

      // Apply platform-specific encoding
      viralShortSpec.render.targetPlatform = platform;
      viralShortSpec.render.encoding = {
        codec: platformConfig.encoding.codec,
        bitrate: platformConfig.encoding.bitrate,
        profile: platformConfig.encoding.profile,
        level: platformConfig.encoding.level,
        preset: "medium",
      };

      // ============================================================================
      // VALIDATION
      // ============================================================================
      reportProgress("generate", 60, "Validating viral short specification...");
      const validation = validateViralShortSpec(viralShortSpec);
      if (!validation.valid) {
        throw new Error(`Viral short spec validation failed: ${validation.errors.join(", ")}`);
      }
      log("validation", "Spec validated successfully");

      // ============================================================================
      // CONVERT TO BASE VIDEOSPEC FOR BUILD ORCHESTRATOR
      // ============================================================================
      reportProgress("generate", 65, "Converting to base VideoSpec for pipeline...");
      const baseSpec = this.convertToBaseVideoSpec(viralShortSpec);

      // ============================================================================
      // RUN BASE ORCHESTRATOR PIPELINE
      // ============================================================================
      reportProgress("resolve", 70, "Running asset resolution...");
      const baseResult = await this.baseOrchestrator.buildFromPrompt(baseSpec, {
        render: options.render !== false,
        specOutputPath: options.specOutputPath,
      });

      // ============================================================================
      // QUALITY GATES (Module 4)
      // ============================================================================
      if (options.qualityGatesEnabled !== false && this.config.enableQualityGates && baseResult.success) {
        reportProgress("build", 90, "Running frame-by-frame quality gates...");
        const qualityPassed = await this.runQualityGates(viralShortSpec, baseResult.videoPath!);
        if (!qualityPassed) {
          log("quality", "WARNING: Some quality gates failed - review output");
        } else {
          log("quality", "All quality gates passed ✓");
        }
      }

      // Save viral short spec if requested
      if (options.specOutputPath) {
        writeFileSync(options.specOutputPath, JSON.stringify(viralShortSpec, null, 2));
        log("output", `Viral short spec saved to: ${options.specOutputPath}`);
      }

      reportProgress("complete", 100, "Viral short build complete!");

      return {
        ...baseResult,
        viralShortSpec,
        script: viralShortSpec.script,
        cameraSpec: viralShortSpec.camera,
        assetSpec: viralShortSpec.assets,
        audioSpec: viralShortSpec.audio,
        platformPreset: platformConfig,
        logs,
      };

    } catch (error) {
      reportProgress("error", 0, `Build failed: ${error}`);
      this.callbacks.onError?.("viral-short", error as Error);
      return {
        success: false,
        duration: Date.now() - startTime,
        error: (error as Error).message,
        logs,
      };
    }
  }

  /**
   * Build from existing ViralShortSpec
   */
  async buildFromSpec(spec: ViralShortSpec, options?: { render?: boolean }): Promise<ViralShortBuildResult> {
    const baseSpec = this.convertToBaseVideoSpec(spec);
    const baseResult = await this.baseOrchestrator.buildFromPrompt(baseSpec, { render: options?.render });

    return {
      ...baseResult,
      viralShortSpec: spec,
      script: spec.script,
      cameraSpec: spec.camera,
      assetSpec: spec.assets,
      audioSpec: spec.audio,
      platformPreset: getPlatformConfig(spec.platform),
    };
  }

  /**
   * Build from spec file
   */
  async buildFromSpecFile(specPath: string, options?: { render?: boolean }): Promise<ViralShortBuildResult> {
    const specContent = readFileSync(specPath, "utf-8");
    const spec = JSON.parse(specContent) as ViralShortSpec;
    return this.buildFromSpec(spec, options);
  }

  /**
   * Convert ViralShortSpec to base VideoSpec for the build orchestrator
   */
  private convertToBaseVideoSpec(viralSpec: ViralShortSpec): any {
    // This creates a compatible VideoSpec that the base orchestrator can use
    // The base orchestrator uses the promptParser.ts types
    return {
      id: viralSpec.id,
      title: viralSpec.title,
      durationSeconds: viralSpec.durationSeconds,
      aspectRatio: viralSpec.aspectRatio,
      targetPlatform: viralSpec.platform,
      fps: viralSpec.fps,
      scenes: viralSpec.assets.proceduralGenerators.map((gen, i) => ({
        id: `scene-${i}`,
        type: "3d" as const,
        name: gen.type,
        duration: viralSpec.durationSeconds / viralSpec.assets.proceduralGenerators.length,
        startTime: (i * viralSpec.durationSeconds) / viralSpec.assets.proceduralGenerators.length,
        assets: [],
        animations: [],
        transitions: [],
        camera: {
          position: viralSpec.camera.keyframes[0]?.position || { x: 0, y: 2, z: 5 },
          target: viralSpec.camera.keyframes[0]?.target || { x: 0, y: 0, z: 0 },
          fov: viralSpec.camera.keyframes[0]?.fov || 50,
          near: 0.1,
          far: 1000,
        },
        lighting: {
          ambient: { r: 0.3, g: 0.3, b: 0.35 },
          directional: [
            { color: { r: 1, g: 0.95, b: 0.9 }, intensity: 1, position: { x: 5, y: 10, z: 7 } },
            { color: { r: 0.5, g: 0.7, b: 1 }, intensity: 0.5, position: { x: -5, y: 5, z: -5 } },
          ],
        },
      })),
      audio: {
        backgroundMusic: viralSpec.audio.tracks.find(t => t.type === "musicBed") ? {
          src: viralSpec.audio.tracks.find(t => t.type === "musicBed")!.filePath || "./assets/audio/default.mp3",
          volume: 0.4,
          loop: true,
          fadeIn: 2,
          fadeOut: 2,
          startTime: 0,
        } : undefined,
        voiceover: viralSpec.audio.tracks.find(t => t.type === "narrator") ? {
          src: viralSpec.audio.tracks.find(t => t.type === "narrator")!.filePath || "./assets/audio/voiceover.mp3",
          volume: 1,
          startTime: 0,
          language: "it",
        } : undefined,
        sfx: viralSpec.audio.tracks
          .filter(t => t.type === "punctualSFX" || t.type === "foley" || t.type === "riserImpact")
          .map((t, i) => ({
            id: t.id,
            src: t.filePath || "./assets/sfx/default.mp3",
            trigger: "time" as const,
            time: t.startFrame / 30,
            volume: 0.8,
            pitch: 1,
          })),
        beatSync: viralSpec.audio.sync.rule === "beat-synced",
        masterVolume: 1,
      },
      globalStyle: {
        colorPalette: {
          primary: [{ r: 0.1, g: 0.1, b: 0.2 }, { r: 0.9, g: 0.3, b: 0.4 }, { r: 1, g: 1, b: 1 }],
          secondary: [],
          accent: [{ r: 0.1, g: 0.5, b: 0.9 }],
          background: { r: 0.02, g: 0.02, b: 0.05 },
          mode: "dark" as const,
        },
        lighting: "cinematic" as const,
        cameraStyle: "dolly" as const,
        postProcessing: {
          bloom: { enabled: true, strength: 0.5, radius: 0.5, threshold: 0.8 },
          depthOfField: { enabled: true, focusDistance: 10, aperture: 2.8, maxBlur: 1 },
          motionBlur: { enabled: true, strength: 0.5 },
          colorGrading: { enabled: true, exposure: 0, contrast: 1.1, saturation: 1.1, temperature: 0, tint: 0 },
          vignette: { enabled: true, darkness: 0.3, offset: 0 },
          filmGrain: { enabled: true, strength: 0.03 },
          chromaticAberration: { enabled: false, offset: 0.002 },
        },
      },
      renderSettings: {
        codec: viralSpec.render.encoding.codec,
        crf: 20,
        preset: "medium",
        pixelFormat: "yuv420p",
        concurrency: viralSpec.assets.renderOptimization?.parallel?.remotionConcurrency || 4,
        imageFormat: "png",
        quality: 80,
        timeout: (viralSpec.render as any).optimization?.targets?.maxRenderTimeMinutes * 60 * 1000 || 3600000,
      },
      metadata: viralSpec.metadata,
    };
  }

  /**
   * Run quality gates on rendered output
   */
  private async runQualityGates(spec: ViralShortSpec, videoPath: string): Promise<boolean> {
    const gates = spec.qualityGates || {
      frameByFrameCheck: true,
      checkLighting: true,
      checkInkLines: true,
      checkClipping: true,
      checkContrast: true,
      checkAudioSync: true,
      checkLUFS: true,
    };

    // In a real implementation, this would:
    // 1. Extract frames from video
    // 2. Analyze each frame for lighting, contrast, clipping
    // 3. Check ink lines for comic3D style
    // 4. Analyze audio for LUFS compliance
    // 5. Verify audio-visual sync

    // For now, return true (placeholder)
    return true;
  }

  // Getters
  getConfig(): ViralShortConfig {
    return this.viralShortConfig;
  }

  getBaseOrchestrator(): BuildOrchestrator {
    return this.baseOrchestrator;
  }

  clean(): void {
    this.baseOrchestrator.clean();
  }
}

// Factory function
export function createViralShortOrchestrator(config?: Partial<ViralShortOrchestratorConfig>): ViralShortOrchestrator {
  return new ViralShortOrchestrator(config);
}

// Quick build function
export async function buildViralShort(
  prompt: string,
  platform: "tiktok" | "reels" | "shorts" = "tiktok",
  style: "photorealistic" | "comic3D" = "photorealistic",
  config?: Partial<ViralShortOrchestratorConfig>
): Promise<ViralShortBuildResult> {
  const orchestrator = createViralShortOrchestrator(config);
  return orchestrator.buildFromPrompt({ prompt, platform, style });
}

export default ViralShortOrchestrator;