import { VideoSpec } from "./promptParser.js";
import { AssetResolver, AssetResolutionResult } from "./assetResolver.js";
import { generateCode, GeneratedFiles, GenerationOptions, createCodeGenerator } from "./codeGenerator.js";
import { BlenderRunner, BlenderConfig } from "./blenderRunner.js";
import { existsSync, mkdirSync, writeFileSync, readFileSync, copyFileSync } from "fs";
import { join, dirname, resolve } from "path";
import { execSync } from "child_process";

// ============================================================================
// Types
// ============================================================================

export interface BuildOrchestratorConfig {
  workDir: string;
  outputDir: string;
  blenderConfig?: Partial<BlenderConfig>;
  assetConfig?: Partial<import("./assetResolver.js").AssetResolverConfig>;
  codeGenOptions?: Partial<GenerationOptions>;
  remotionConfig?: {
    cliPath: string;
    composition?: string;
    chromiumPath?: string;
  };
  cacheDir?: string;
  verbose?: boolean;
}

export interface BuildProgress {
  stage: "parse" | "resolve" | "generate" | "build" | "render" | "complete" | "error";
  progress: number; // 0-100
  message: string;
  details?: any;
}

export interface BuildResult {
  success: boolean;
  videoPath?: string;
  specPath?: string;
  generatedFiles?: GeneratedFiles;
  resolvedAssets?: AssetResolutionResult[];
  duration: number;
  error?: string;
  logs: string[];
}

export interface PipelineCallbacks {
  onProgress?: (progress: BuildProgress) => void;
  onLog?: (stage: string, message: string) => void;
  onError?: (stage: string, error: Error) => void;
}

// ============================================================================
// Build Orchestrator Class
// ============================================================================

export class BuildOrchestrator {
  private config: BuildOrchestratorConfig;
  private blenderRunner: BlenderRunner;
  private assetResolver: AssetResolver;
  private spec: VideoSpec | null = null;
  private callbacks: PipelineCallbacks = {};
  private logs: string[] = [];
  private startTime: number = 0;

  constructor(config?: Partial<BuildOrchestratorConfig>) {
    this.config = {
      workDir: config?.workDir || join(process.cwd(), ".build"),
      outputDir: config?.outputDir || join(process.cwd(), "out"),
      blenderConfig: config?.blenderConfig,
      assetConfig: config?.assetConfig,
      codeGenOptions: config?.codeGenOptions,
      remotionConfig: config?.remotionConfig || {
        cliPath: "npx remotion",
      },
      cacheDir: config?.cacheDir || join(process.cwd(), ".cache"),
      verbose: config?.verbose ?? false,
    };

    this.ensureDirectories();
    this.blenderRunner = new BlenderRunner(this.config.blenderConfig);
    this.assetResolver = new AssetResolver(this.config.assetConfig);
  }

  private ensureDirectories(): void {
    const dirs = [
      this.config.workDir,
      this.config.outputDir,
      this.config.cacheDir || join(this.config.workDir, "cache"),
    ];
    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  setCallbacks(callbacks: PipelineCallbacks): void {
    this.callbacks = callbacks;
  }

  private log(stage: string, message: string): void {
    const entry = `[${stage}] ${message}`;
    this.logs.push(entry);
    if (this.config.verbose) console.log(entry);
    this.callbacks.onLog?.(stage, message);
  }

  private reportProgress(stage: BuildProgress["stage"], progress: number, message: string, details?: any): void {
    this.callbacks.onProgress?.({ stage, progress, message, details });
  }

  // ============================================================================
  // Main Pipeline
  // ============================================================================

  /**
   * Build video from natural language prompt
   */
  async buildFromPrompt(prompt: VideoSpec | string, options?: {
    specOutputPath?: string;
    render?: boolean;
  }): Promise<BuildResult> {
    this.startTime = Date.now();
    this.logs = [];

    try {
      // Stage 1: Parse / Get Spec
      this.reportProgress("parse", 0, "Parsing video specification...");

      if (typeof prompt === "string") {
        // We'll handle string prompts by expecting them to go through promptParser first
        // For now, assume prompt is already a VideoSpec
        throw new Error("String prompts require PromptParser. Pass a VideoSpec object or use buildFromSpecFile.");
      }

      this.spec = prompt as VideoSpec;
      this.log("parse", `Specification loaded: ${this.spec.title} (${this.spec.durationSeconds}s @ ${this.spec.fps}fps)`);

      // Stage 2: Resolve Assets
      this.reportProgress("resolve", 10, "Resolving assets...");
      const resolvedAssets = await this.resolveAssets(this.spec);
      this.log("resolve", `Resolved ${resolvedAssets.length} assets`);

      // Stage 3: Generate Code
      this.reportProgress("generate", 30, "Generating Remotion code...");
      const generatedFiles = await this.generateCode(this.spec);
      this.log("generate", "Generated MainVideo.tsx, Root.tsx, Scene3D.tsx, assets.json");

      // Stage 4: Write generated files to work directory
      this.reportProgress("build", 50, "Writing generated files...");
      await this.writeGeneratedFiles(generatedFiles);
      this.log("build", "Files written to work directory");

      // Stage 5: Install dependencies & build
      this.reportProgress("build", 60, "Installing dependencies and building...");
      await this.buildProject();
      this.log("build", "Project built successfully");

      // Stage 6: Render video (if requested)
      let videoPath: string | undefined;
      if (options?.render !== false) {
        this.reportProgress("render", 70, "Rendering video...");
        videoPath = await this.renderVideo(this.spec);
        this.log("render", `Video rendered to: ${videoPath}`);
      }

      // Complete
      this.reportProgress("complete", 100, "Build complete!");

      return {
        success: true,
        videoPath,
        specPath: options?.specOutputPath,
        generatedFiles,
        resolvedAssets,
        duration: Date.now() - this.startTime,
        logs: this.logs,
      };
    } catch (error) {
      this.reportProgress("error", 0, `Build failed: ${error}`);
      this.callbacks.onError?.("build", error as Error);
      return {
        success: false,
        duration: Date.now() - this.startTime,
        error: (error as Error).message,
        logs: this.logs,
      };
    }
  }

  /**
   * Build from a spec file (JSON)
   */
  async buildFromSpecFile(specPath: string, options?: {
    render?: boolean;
  }): Promise<BuildResult> {
    const specContent = readFileSync(specPath, "utf-8");
    const spec = JSON.parse(specContent) as VideoSpec;
    return this.buildFromPrompt(spec, { render: options?.render, specOutputPath: specPath });
  }

  /**
   * Build from existing VideoSpec object
   */
  async buildFromSpec(spec: VideoSpec, options?: {
    render?: boolean;
  }): Promise<BuildResult> {
    return this.buildFromPrompt(spec, { render: options?.render });
  }

  // ============================================================================
  // Pipeline Stages
  // ============================================================================

  private async resolveAssets(spec: VideoSpec): Promise<AssetResolutionResult[]> {
    return this.assetResolver.resolveAll(spec);
  }

  private async generateCode(spec: VideoSpec): Promise<GeneratedFiles> {
    const generator = createCodeGenerator(spec, {
      outputDir: this.config.workDir,
      compositionName: "MainVideo",
      includeAudio: true,
      includeTimeline: true,
      template: "main",
      ...this.config.codeGenOptions,
    });
    return generator.generate();
  }

  private async writeGeneratedFiles(files: GeneratedFiles): Promise<void> {
    const compositionsDir = join(this.config.workDir, "src", "compositions");
    const scenesDir = join(this.config.workDir, "src", "scenes");
    const publicDir = join(this.config.workDir, "public");

    [compositionsDir, scenesDir, publicDir].forEach(dir => {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    });

    // Write MainVideo.tsx (composition)
    writeFileSync(join(compositionsDir, "MainVideo.tsx"), files.composition);

    // Write Root.tsx
    writeFileSync(join(compositionsDir, "Root.tsx"), files.root);

    // Write Scene3D.tsx (scene if present)
    if (files.scene) {
      writeFileSync(join(scenesDir, "Scene3D.tsx"), files.scene);
    }

    // Write assets.json (manifest)
    writeFileSync(join(publicDir, "assets.json"), files.manifest);

    // Copy package.json and configs from main project
    await this.copyProjectConfigs();
  }

  private async copyProjectConfigs(): Promise<void> {
    const projectRoot = process.cwd();
    const workDir = this.config.workDir;

    const filesToCopy = [
      "package.json",
      "tsconfig.json",
      "vite.config.ts",
      "remotion.config.ts",
      "tailwind.config.js",
      "postcss.config.js",
    ];

    for (const file of filesToCopy) {
      const src = join(projectRoot, file);
      const dest = join(workDir, file);
      if (existsSync(src)) {
        copyFileSync(src, dest);
      }
    }

    // Copy .env if exists
    const envSrc = join(projectRoot, ".env");
    const envDest = join(workDir, ".env");
    if (existsSync(envSrc)) {
      copyFileSync(envSrc, envDest);
    }
  }

  private async buildProject(): Promise<void> {
    const workDir = this.config.workDir;

    // Install dependencies
    this.log("build", "Installing dependencies...");
    try {
      execSync("npm install", { cwd: workDir, stdio: this.config.verbose ? "inherit" : "pipe", timeout: 180000 });
    } catch (error) {
      this.log("build", "npm install failed, trying with --legacy-peer-deps");
      execSync("npm install --legacy-peer-deps", { cwd: workDir, stdio: this.config.verbose ? "inherit" : "pipe", timeout: 180000 });
    }

    // Build Remotion
    this.log("build", "Building Remotion project...");
    execSync("npm run build", { cwd: workDir, stdio: this.config.verbose ? "inherit" : "pipe", timeout: 300000 });
  }

  private async renderVideo(spec: VideoSpec): Promise<string> {
    const workDir = this.config.workDir;
    const { cliPath, composition, chromiumPath } = this.config.remotionConfig!;
    const compositionId = composition || spec.title.toLowerCase().replace(/\s+/g, "-").substring(0, 50);
    const outputPath = join(this.config.outputDir, `${compositionId}.mp4`);

    // Ensure output directory exists
    if (!existsSync(this.config.outputDir)) {
      mkdirSync(this.config.outputDir, { recursive: true });
    }

    const args = [
      "render",
      "src/compositions/Root.tsx",
      compositionId,
      outputPath,
      `--concurrency=${spec.renderSettings?.concurrency || 4}`,
      `--image-format=${spec.renderSettings?.imageFormat || "png"}`,
      `--quality=${spec.renderSettings?.quality || 80}`,
    ];

    if (chromiumPath) {
      args.push(`--chromium-path=${chromiumPath}`);
    }

    this.log("render", `Running: ${cliPath} ${args.join(" ")}`);

    const command = `${cliPath} ${args.join(" ")}`;
    execSync(command, {
      cwd: workDir,
      stdio: this.config.verbose ? "inherit" : "pipe",
      timeout: spec.renderSettings?.timeout || 600000,
    });

    return outputPath;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Get Blender runner for direct access
   */
  getBlenderRunner(): BlenderRunner {
    return this.blenderRunner;
  }

  /**
   * Get asset resolver for direct access
   */
  getAssetResolver(): AssetResolver {
    return this.assetResolver;
  }

  /**
   * Get current spec
   */
  getSpec(): VideoSpec | null {
    return this.spec;
  }

  /**
   * Get build logs
   */
  getLogs(): string[] {
    return this.logs;
  }

  /**
   * Clean work directory
   */
  clean(): void {
    const fs = require("fs");
    if (existsSync(this.config.workDir)) {
      fs.rmSync(this.config.workDir, { recursive: true, force: true });
    }
    this.ensureDirectories();
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createBuildOrchestrator(config?: Partial<BuildOrchestratorConfig>): BuildOrchestrator {
  return new BuildOrchestrator(config);
}

export async function buildVideoFromPrompt(
  spec: VideoSpec,
  config?: Partial<BuildOrchestratorConfig>,
  callbacks?: PipelineCallbacks
): Promise<BuildResult> {
  const orchestrator = createBuildOrchestrator(config);
  if (callbacks) orchestrator.setCallbacks(callbacks);
  return orchestrator.buildFromPrompt(spec);
}

export async function buildVideoFromSpecFile(
  specPath: string,
  config?: Partial<BuildOrchestratorConfig>,
  callbacks?: PipelineCallbacks
): Promise<BuildResult> {
  const orchestrator = createBuildOrchestrator(config);
  if (callbacks) orchestrator.setCallbacks(callbacks);
  return orchestrator.buildFromSpecFile(specPath);
}

// ============================================================================
// Export
// ============================================================================

export default BuildOrchestrator;