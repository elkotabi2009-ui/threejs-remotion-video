import { VideoSpec, SceneSpec, Asset, Animation, Transition, AudioSpec, StyleSpec } from "./promptParser.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

/**
 * Code Generator - Transforms VideoSpec into Remotion/Three.js code
 * Generates composition files, scene components, and asset references
 */

export interface GenerationOptions {
  outputDir: string;
  compositionName: string;
  includeAudio: boolean;
  includeTimeline: boolean;
  template?: "main" | "vertical" | "square" | "preview";
}

export interface GeneratedFiles {
  "MainVideo.tsx": string;
  "Root.tsx": string;
  "Scene3D.tsx": string;
  "assets.json": string;
}

// ============================================================================
// Template Loading
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const templatesDir = join(__dirname, "templates");

function loadTemplate(name: string): string {
  const path = join(templatesDir, `${name}.template`);
  return readFileSync(path, "utf-8");
}

const MAIN_VIDEO_TEMPLATE = loadTemplate("MainVideo");
const ROOT_TEMPLATE = loadTemplate("Root");
const SCENE3D_TEMPLATE = loadTemplate("Scene3D");

// ============================================================================
// Code Generator Class
// ============================================================================

export class CodeGenerator {
  private spec: VideoSpec;
  private options: GenerationOptions;

  constructor(spec: VideoSpec, options: GenerationOptions) {
    this.spec = spec;
    this.options = options;
  }

  generate(): GeneratedFiles {
    const compositionId = this.spec.title.toLowerCase().replace(/\s+/g, "-").substring(0, 50);
    const durationFrames = this.spec.durationSeconds * this.spec.fps;
    const backgroundColor = this.spec.globalStyle.colorPalette?.background
      ? `rgb(${Math.round(this.spec.globalStyle.colorPalette.background.r * 255)}, ${Math.round(this.spec.globalStyle.colorPalette.background.g * 255)}, ${Math.round(this.spec.globalStyle.colorPalette.background.b * 255)})`
      : "#0a0a0f";

    // Generate MainVideo.tsx
    const mainVideo = this.generateMainVideo(compositionId, durationFrames, backgroundColor);

    // Generate Root.tsx
    const root = this.generateRoot(compositionId);

    // Generate Scene3D.tsx
    const scene3D = this.generateScene3D();

    // Generate assets.json
    const assets = this.generateAssetsJSON();

    return {
      "MainVideo.tsx": mainVideo,
      "Root.tsx": root,
      "Scene3D.tsx": scene3D,
      "assets.json": assets,
    };
  }

  private generateMainVideo(compositionId: string, durationFrames: number, backgroundColor: string): string {
    let template = MAIN_VIDEO_TEMPLATE;

    // Replace basic placeholders
    template = template
      .replace("{{compositionId}}", compositionId)
      .replace("{{durationFrames}}", durationFrames.toString())
      .replace("{{fps}}", this.spec.fps.toString())
      .replace("{{width}}", this.getWidth().toString())
      .replace("{{height}}", this.getHeight().toString())
      .replace("{{backgroundColor}}", backgroundColor)
      .replace("{{includeAudio}}", this.options.includeAudio ? "true" : "false")
      .replace("{{includeTimeline}}", this.options.includeTimeline ? "true" : "false");

    // Handle conditional blocks
    template = this.processConditionals(template, "threeTracks", this.spec.scenes.some((s: SceneSpec) => s.type === "3d"));
    template = this.processConditionals(template, "videoTracks", this.spec.scenes.some((s: SceneSpec) => s.type === "video"));
    template = this.processConditionals(template, "textTracks", this.spec.scenes.some((s: SceneSpec) => s.type === "text"));
    template = this.processConditionals(template, "includeAudio", this.options.includeAudio && this.hasAudio());
    template = this.processConditionals(template, "includeTimeline", this.options.includeTimeline);

    // Add extra compositions
    const extraCompositions = this.generateExtraCompositions(compositionId);
    template = template.replace("{{extraCompositions}}", extraCompositions);

    return template;
  }

  private generateRoot(compositionId: string): string {
    let template = ROOT_TEMPLATE;

    if (this.options.template && this.options.template !== "main") {
      const extraExports = this.getExtraExports();
      template = template.replace("{{#extraExports}}", "").replace("{{/extraExports}}", "");
      template = template.replace("{{extraExports}}", extraExports);
    } else {
      template = template.replace("{{#extraExports}}, {{extraExports}}{{/extraExports}}", "");
    }

    return template;
  }

  private generateScene3D(): string {
    // For now, return the comprehensive Scene3D template
    // In a more advanced version, this would be customized per spec
    return SCENE3D_TEMPLATE;
  }

  private generateAssetsJSON(): string {
    const allAssets: Asset[] = [];
    for (const scene of this.spec.scenes) {
      allAssets.push(...scene.assets);
    }
    return JSON.stringify(allAssets, null, 2);
  }

  private generateExtraCompositions(baseId: string): string {
    const compositions: string[] = [];
    const durationFrames = this.spec.durationSeconds * this.spec.fps;

    // Vertical (TikTok/Reels/Shorts)
    if (this.spec.aspectRatio === "9:16" || this.spec.targetPlatform === "tiktok" || this.spec.targetPlatform === "reels" || this.spec.targetPlatform === "shorts") {
      compositions.push(`
export const VerticalVideo: React.FC = () => {
  return (
    <Composition
      id="${baseId}-vertical"
      component={MainVideo}
      durationInFrames=${Math.floor(durationFrames * 0.6)}
      fps={${this.spec.fps}}
      width={1080}
      height={1920}
      defaultProps={{}}
    />
  );
};`);
    }

    // Square (Instagram)
    if (this.spec.aspectRatio === "1:1") {
      compositions.push(`
export const SquareVideo: React.FC = () => {
  return (
    <Composition
      id="${baseId}-square"
      component={MainVideo}
      durationInFrames=${Math.floor(durationFrames * 0.6)}
      fps={${this.spec.fps}}
      width={1080}
      height={1080}
      defaultProps={{}}
    />
  );
};`);
    }

    // Preview
    compositions.push(`
export const PreviewVideo: React.FC = () => {
  return (
    <Composition
      id="${baseId}-preview"
      component={MainVideo}
      durationInFrames={60}
      fps={${this.spec.fps}}
      width={1280}
      height={720}
      defaultProps={{}}
    />
  );
};`);

    return compositions.join("\n");
  }

  private getExtraExports(): string {
    const exports: string[] = [];
    if (this.spec.aspectRatio === "9:16" || this.spec.targetPlatform === "tiktok" || this.spec.targetPlatform === "reels" || this.spec.targetPlatform === "shorts") {
      exports.push("VerticalVideo");
    }
    if (this.spec.aspectRatio === "1:1") {
      exports.push("SquareVideo");
    }
    exports.push("PreviewVideo");
    return exports.join(", ");
  }

  private getWidth(): number {
    switch (this.spec.aspectRatio) {
      case "9:16": return 1080;
      case "1:1": return 1080;
      case "4:3": return 1440;
      case "21:9": return 2560;
      default: return 1920;
    }
  }

  private getHeight(): number {
    switch (this.spec.aspectRatio) {
      case "9:16": return 1920;
      case "1:1": return 1080;
      case "4:3": return 1080;
      case "21:9": return 1080;
      default: return 1080;
    }
  }

  private hasAudio(): boolean {
    return !!(
      this.spec.audio.backgroundMusic ||
      this.spec.audio.voiceover ||
      this.spec.audio.sfx.length > 0
    );
  }

  private processConditionals(template: string, blockName: string, condition: boolean): string {
    const openTag = `{{#${blockName}}}`;
    const closeTag = `{{/${blockName}}}`;
    const invertedOpenTag = `{{^${blockName}}}`;
    const invertedCloseTag = `{{/${blockName}}}`;

    if (condition) {
      // Keep content between {{#block}}...{{/block}}, remove inverted
      return template
        .replace(new RegExp(openTag + "([\\s\\S]*?)" + closeTag), "$1")
        .replace(new RegExp(invertedOpenTag + "([\\s\\S]*?)" + invertedCloseTag), "");
    } else {
      // Remove content between {{#block}}...{{/block}}, keep inverted
      return template
        .replace(new RegExp(openTag + "([\\s\\S]*?)" + closeTag), "")
        .replace(new RegExp(invertedOpenTag + "([\\s\\S]*?)" + invertedCloseTag), "$1");
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createCodeGenerator(spec: VideoSpec, options?: Partial<GenerationOptions>): CodeGenerator {
  const defaultOptions: GenerationOptions = {
    outputDir: "src/compositions",
    compositionName: "MainVideo",
    includeAudio: true,
    includeTimeline: true,
    template: "main",
    ...options,
  };
  return new CodeGenerator(spec, defaultOptions);
}

export function generateVideoCode(spec: VideoSpec, options?: Partial<GenerationOptions>): GeneratedFiles {
  return createCodeGenerator(spec, options).generate();
}