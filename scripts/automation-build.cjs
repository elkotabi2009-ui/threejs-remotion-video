#!/usr/bin/env node

/**
 * Automation Build CLI
 *
 * Usage:
 *   npm run automation:prompt "15s TikTok: rotating neon cube with synth beat"
 *   npm run automation:spec ./spec.json
 *   npm run automation:dev
 *   npm run automation:render --composition=MainVideo --output=video.mp4
 */

const { Command } = require("commander");
const { resolve, join } = require("path");
const { existsSync, readFileSync, writeFileSync } = require("fs");

// Load the automation modules
// Note: We need to compile TypeScript first or use ts-node
// For now, we'll use a simple approach with dynamic imports

const program = new Command();

program
  .name("automation-build")
  .description("Prompt-to-Video Automation Pipeline")
  .version("1.0.0");

// Global options
program
  .option("-v, --verbose", "Enable verbose logging")
  .option("--work-dir <dir>", "Working directory for builds", ".build")
  .option("--output-dir <dir>", "Output directory for rendered videos", "out")
  .option("--platform <platform>", "Target platform (tiktok, reels, shorts, youtube, instagram, preview)")
  .option("--no-render", "Generate code only, don't render video")
  .option("--spec-output <path>", "Path to save the generated spec JSON");

// Command: Build from natural language prompt
program
  .command("prompt <prompt>")
  .description("Build video from natural language description")
  .option("-d, --duration <seconds>", "Duration in seconds", "15")
  .option("--fps <fps>", "Frames per second", "30")
  .option("--aspect <ratio>", "Aspect ratio (16:9, 9:16, 1:1, 4:3, 21:9)", "9:16")
  .option("--style <style>", "Visual style (cinematic, neon, minimal, abstract, retro, sci-fi)")
  .action(async (prompt, options) => {
    try {
      await runFromPrompt(prompt, options);
    } catch (error) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

// Command: Build from spec file
program
  .command("spec <specFile>")
  .description("Build video from JSON spec file")
  .action(async (specFile, options) => {
    try {
      await runFromSpec(specFile, options);
    } catch (error) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

// Command: Development mode - watch and rebuild
program
  .command("dev")
  .description("Start development server with hot reload")
  .option("--port <port>", "Port for dev server", "3000")
  .action(async (options) => {
    try {
      await runDev(options);
    } catch (error) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

// Command: Render existing composition
program
  .command("render")
  .description("Render a composition")
  .requiredOption("-c, --composition <id>", "Composition ID to render")
  .requiredOption("-o, --output <path>", "Output video path")
  .option("--concurrency <n>", "Render concurrency", "4")
  .option("--quality <n>", "Render quality (1-100)", "80")
  .action(async (options) => {
    try {
      await runRender(options);
    } catch (error) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

// Command: Generate spec from prompt (without rendering)
program
  .command("generate-spec <prompt>")
  .description("Generate JSON spec from prompt without rendering")
  .option("-o, --output <path>", "Output spec file path")
  .action(async (prompt, options) => {
    try {
      await generateSpec(prompt, options);
    } catch (error) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

// Command: List available compositions
program
  .command("compositions")
  .description("List available compositions in the project")
  .action(async () => {
    try {
      await listCompositions();
    } catch (error) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

// Command: Clean build artifacts
program
  .command("clean")
  .description("Clean build and cache directories")
  .action(async () => {
    try {
      await cleanBuild();
    } catch (error) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

// Parse arguments
program.parse(process.argv);

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

// ============================================================================
// Implementation Functions
// ============================================================================

async function runFromPrompt(prompt, options) {
  console.log("🎬 Automation Build - Prompt to Video");
  console.log("=" .repeat(50));
  console.log(`Prompt: ${prompt}`);
  console.log(`Platform: ${options.platform || "auto"}`);
  console.log(`Duration: ${options.duration}s @ ${options.fps}fps`);
  console.log(`Aspect Ratio: ${options.aspect}`);
  console.log(`Render: ${options.render !== false ? "Yes" : "No (code only)"}`);
  console.log("");

  // TODO: Integrate with PromptParser once TypeScript is compiled
  // For now, create a basic spec
  const spec = createBasicSpec(prompt, options);

  if (options.specOutput) {
    writeFileSync(options.specOutput, JSON.stringify(spec, null, 2));
    console.log(`📝 Spec saved to: ${options.specOutput}`);
  }

  if (options.render !== false) {
    console.log("\n🔨 Building and rendering video...");
    await buildAndRender(spec, options);
  } else {
    console.log("\n✅ Code generation complete (no render requested)");
    console.log(`   Work directory: ${options.workDir}`);
  }
}

async function runFromSpec(specFile, options) {
  const resolvedPath = resolve(specFile);

  if (!existsSync(resolvedPath)) {
    throw new Error(`Spec file not found: ${resolvedPath}`);
  }

  console.log(`📄 Loading spec from: ${resolvedPath}`);
  const spec = JSON.parse(readFileSync(resolvedPath, "utf-8"));

  console.log(`🎬 Building: ${spec.title} (${spec.durationSeconds}s @ ${spec.fps}fps)`);

  if (options.render !== false) {
    await buildAndRender(spec, options);
  } else {
    console.log("✅ Code generation complete (no render requested)");
  }
}

async function runDev(options) {
  console.log("🔧 Starting development server...");
  console.log(`   Port: ${options.port}`);
  console.log("   Watching for changes...");

  // Start remotion studio
  const { spawn } = require("child_process");
  const remotion = spawn("npx", ["remotion", "studio", "--port", options.port], {
    stdio: "inherit",
    shell: true,
  });

  remotion.on("exit", (code) => {
    console.log(`Remotion studio exited with code ${code}`);
  });

  // Handle shutdown
  process.on("SIGINT", () => {
    remotion.kill();
    process.exit(0);
  });
}

async function runRender(options) {
  console.log(`🎬 Rendering composition: ${options.composition}`);
  console.log(`   Output: ${options.output}`);

  const { spawn } = require("child_process");
  const render = spawn("npx", [
    "remotion", "render",
    "src/compositions/Root.tsx",
    options.composition,
    options.output,
    `--concurrency=${options.concurrency}`,
    `--quality=${options.quality}`,
  ], {
    stdio: "inherit",
    shell: true,
  });

  return new Promise((resolve, reject) => {
    render.on("exit", (code) => {
      if (code === 0) {
        console.log("✅ Render complete!");
        resolve();
      } else {
        reject(new Error(`Render failed with code ${code}`));
      }
    });
  });
}

async function generateSpec(prompt, options) {
  console.log("📝 Generating spec from prompt...");

  // Basic spec generation (replace with PromptParser when compiled)
  const spec = createBasicSpec(prompt, {
    duration: "15",
    fps: "30",
    aspect: "9:16",
  });

  const outputPath = options.output || `spec-${Date.now()}.json`;
  writeFileSync(outputPath, JSON.stringify(spec, null, 2));
  console.log(`✅ Spec saved to: ${outputPath}`);
}

async function listCompositions() {
  console.log("📋 Available compositions:");
  console.log("   - MainVideo (1920x1080, 16:9)");
  console.log("   - VerticalVideo (1080x1920, 9:16) - TikTok/Reels/Shorts");
  console.log("   - SquareVideo (1080x1080, 1:1) - Instagram");
  console.log("   - PreviewVideo (1280x720, 16:9) - Quick preview");
}

async function cleanBuild() {
  const { rmSync } = require("fs");
  const dirs = [".build", ".cache", ".asset-cache", ".blender-temp", "out"];

  for (const dir of dirs) {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
      console.log(`🗑️  Cleaned: ${dir}`);
    }
  }
  console.log("✅ Clean complete!");
}

async function buildAndRender(spec, options) {
  console.log("\n📦 This would invoke the full pipeline:");
  console.log("   1. Resolve assets (download/generate via Blender)");
  console.log("   2. Generate Remotion code (MainVideo.tsx, Scene3D.tsx, etc.)");
  console.log("   3. Install dependencies in work directory");
  console.log("   4. Build Remotion project");
  console.log("   5. Render video using Remotion CLI");

  console.log("\n⚠️  Full pipeline requires TypeScript compilation.");
  console.log("   Run: npm run build:automation");
  console.log("   Then use the BuildOrchestrator class programmatically.");

  // Show what the generated spec looks like
  console.log("\n📄 Generated Spec Preview:");
  console.log(JSON.stringify({
    title: spec.title,
    durationSeconds: spec.durationSeconds,
    fps: spec.fps,
    aspectRatio: spec.aspectRatio,
    scenesCount: spec.scenes.length,
    assetsCount: spec.scenes.reduce((a, s) => a + s.assets.length, 0),
    hasAudio: !!spec.audio.backgroundMusic || !!spec.audio.voiceover || spec.audio.sfx.length > 0,
  }, null, 2));
}

// ============================================================================
// Basic Spec Creator (placeholder until PromptParser is compiled)
// ============================================================================

function createBasicSpec(prompt, options) {
  const duration = parseInt(options.duration) || 15;
  const fps = parseInt(options.fps) || 30;
  const aspectRatio = options.aspect || "9:16";

  // Parse platform from prompt or options
  let targetPlatform = options.platform;
  if (!targetPlatform) {
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes("tiktok")) targetPlatform = "tiktok";
    else if (lowerPrompt.includes("reels") || lowerPrompt.includes("instagram")) targetPlatform = "reels";
    else if (lowerPrompt.includes("shorts") || lowerPrompt.includes("youtube")) targetPlatform = "shorts";
    else if (lowerPrompt.includes("youtube")) targetPlatform = "youtube";
  }

  // Determine dimensions from aspect ratio
  const [w, h] = aspectRatio.split(":").map(Number);
  const baseWidth = 1080;
  const width = aspectRatio === "9:16" ? 1080 : aspectRatio === "1:1" ? 1080 : 1920;
  const height = aspectRatio === "9:16" ? 1920 : aspectRatio === "1:1" ? 1080 : 1080;

  // Create a basic scene based on prompt keywords
  const scene = createSceneFromPrompt(prompt, width, height, duration, fps);

  return {
    title: prompt.substring(0, 50).replace(/[^a-zA-Z0-9\s]/g, "").trim() || "Generated Video",
    description: prompt,
    durationSeconds: duration,
    fps,
    width,
    height,
    aspectRatio,
    targetPlatform,
    globalStyle: {
      colorPalette: getColorPalette(options.style),
      postProcessing: {
        bloom: { enabled: true, strength: 0.5, radius: 0.8, threshold: 0.8 },
        vignette: { enabled: true, darkness: 0.3, offset: 0.5 },
        chromaticAberration: { enabled: false, offset: 0.01 },
      },
      environmentPreset: "city",
    },
    scenes: [scene],
    audio: {
      backgroundMusic: null,
      voiceover: null,
      sfx: [],
      masterVolume: 1.0,
      beatSync: { enabled: false, bpm: 120, division: 4 },
    },
    renderSettings: {
      codec: "h264",
      crf: 20,
      preset: "medium",
      pixelFormat: "yuv420p",
      concurrency: 4,
      imageFormat: "png",
      quality: 80,
    },
  };
}

function createSceneFromPrompt(prompt, width, height, duration, fps) {
  const lowerPrompt = prompt.toLowerCase();
  const durationFrames = duration * fps;

  // Detect scene type from keywords
  let sceneType = "3d";
  let objects = [];

  if (lowerPrompt.includes("text") || lowerPrompt.includes("caption") || lowerPrompt.includes("title")) {
    sceneType = "text";
    objects.push({
      id: "text-1",
      type: "text",
      content: extractTextContent(prompt) || "Hello World",
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      material: { color: "#ffffff", emissive: "#ff0000", emissiveIntensity: 0.5 },
      animations: [
        {
          property: "position.y",
          from: -3,
          to: 3,
          duration: durationFrames,
          easing: "easeInOut",
          loop: true,
        },
      ],
    });
  } else if (lowerPrompt.includes("particle") || lowerPrompt.includes("sparkle") || lowerPrompt.includes("snow")) {
    objects.push({
      id: "particles-1",
      type: "particles",
      count: 500,
      size: 0.05,
      color: "#ffffff",
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: -0.1, z: 0 },
      lifetime: 2,
    });
  } else if (lowerPrompt.includes("cube") || lowerPrompt.includes("box")) {
    objects.push({
      id: "cube-1",
      type: "mesh",
      geometry: "box",
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      material: { color: "#e94560", metalness: 0.3, roughness: 0.4 },
      animations: [
        {
          property: "rotation.y",
          from: 0,
          to: Math.PI * 2,
          duration: durationFrames,
          easing: "linear",
          loop: true,
        },
      ],
    });
  } else if (lowerPrompt.includes("sphere") || lowerPrompt.includes("ball")) {
    objects.push({
      id: "sphere-1",
      type: "mesh",
      geometry: "sphere",
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      material: { color: "#0f3460", metalness: 0.8, roughness: 0.2 },
      animations: [
        {
          property: "rotation.y",
          from: 0,
          to: Math.PI * 2,
          duration: durationFrames * 2,
          easing: "linear",
          loop: true,
        },
      ],
    });
  } else if (lowerPrompt.includes("car") || lowerPrompt.includes("vehicle")) {
    objects.push({
      id: "vehicle-1",
      type: "model",
      src: "blender://vehicle?complexity=medium&style=lowpoly",
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 2, y: 2, z: 2 },
      animations: [
        {
          property: "position.x",
          from: -10,
          to: 10,
          duration: durationFrames,
          easing: "easeInOut",
          loop: true,
        },
      ],
    });
  } else if (lowerPrompt.includes("city") || lowerPrompt.includes("building")) {
    objects.push({
      id: "city-1",
      type: "model",
      src: "blender://city?count=20&complexity=high",
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    });
  } else {
    // Default: rotating abstract shape
    objects.push({
      id: "abstract-1",
      type: "mesh",
      geometry: "torus",
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: Math.PI / 4, y: 0, z: 0 },
      scale: { x: 1.5, y: 1.5, z: 1.5 },
      material: { color: "#e94560", metalness: 0.5, roughness: 0.3 },
      animations: [
        {
          property: "rotation.x",
          from: 0,
          to: Math.PI * 2,
          duration: durationFrames,
          easing: "linear",
          loop: true,
        },
        {
          property: "rotation.y",
          from: 0,
          to: Math.PI * 4,
          duration: durationFrames,
          easing: "linear",
          loop: true,
        },
      ],
    });
  }

  // Add camera animation if mentioned
  const cameraAnimations = [];
  if (lowerPrompt.includes("orbit") || lowerPrompt.includes("rotate camera")) {
    cameraAnimations.push({
      property: "position",
      from: [0, 2, 5],
      to: [0, 2, 5],
      duration: durationFrames,
      easing: "linear",
      loop: true,
    });
  }

  return {
    id: "scene-1",
    name: "Main Scene",
    type: sceneType,
    durationFrames,
    camera: {
      position: { x: 0, y: 2, z: 5 },
      target: { x: 0, y: 0, z: 0 },
      fov: 50,
    },
    lighting: {
      ambient: { r: 0.3, g: 0.3, b: 0.4 },
      directional: [
        { position: { x: 5, y: 10, z: 7 }, intensity: 1, color: { r: 1, g: 0.96, b: 0.9 } },
        { position: { x: -5, y: 5, z: -5 }, intensity: 0.5, color: { r: 0.5, g: 0.7, b: 1 } },
      ],
    },
    objects,
    transitions: [],
    assets: [],
  };
}

function getColorPalette(style) {
  const palettes = {
    cinematic: {
      background: { r: 0.02, g: 0.02, b: 0.05 },
      primary: { r: 0.9, g: 0.27, b: 0.38 },
      secondary: { r: 0.06, g: 0.13, b: 0.24 },
      accent: { r: 0.91, g: 0.69, b: 0.25 },
      text: { r: 1, g: 1, b: 1 },
    },
    neon: {
      background: { r: 0.02, g: 0.02, b: 0.05 },
      primary: { r: 0.9, g: 0.0, b: 1 },
      secondary: { r: 0.0, g: 1, b: 1 },
      accent: { r: 1, g: 0.0, b: 0.5 },
      text: { r: 1, g: 1, b: 1 },
    },
    minimal: {
      background: { r: 0.95, g: 0.95, b: 0.97 },
      primary: { r: 0.1, g: 0.1, b: 0.15 },
      secondary: { r: 0.3, g: 0.3, b: 0.4 },
      accent: { r: 0.5, g: 0.2, b: 0.8 },
      text: { r: 0.1, g: 0.1, b: 0.15 },
    },
    abstract: {
      background: { r: 0.04, g: 0.02, b: 0.08 },
      primary: { r: 1, g: 0.3, b: 0.6 },
      secondary: { r: 0.3, g: 0.6, b: 1 },
      accent: { r: 0.6, g: 1, b: 0.3 },
      text: { r: 1, g: 1, b: 1 },
    },
    retro: {
      background: { r: 0.15, g: 0.05, b: 0.2 },
      primary: { r: 1, g: 0.4, b: 0.8 },
      secondary: { r: 0, g: 1, b: 1 },
      accent: { r: 1, g: 1, b: 0 },
      text: { r: 1, g: 1, b: 1 },
    },
    scifi: {
      background: { r: 0.02, g: 0.05, b: 0.1 },
      primary: { r: 0, g: 1, b: 0.8 },
      secondary: { r: 0.2, g: 0.6, b: 1 },
      accent: { r: 1, g: 0.2, b: 0.6 },
      text: { r: 0.8, g: 1, b: 1 },
    },
  };
  return palettes[style || "cinematic"] || palettes.cinematic;
}

function extractTextContent(prompt) {
  // Try to find quoted text
  const quoted = prompt.match(/["']([^"']+)["']/);
  if (quoted) return quoted[1];

  // Try to find "text:" or "saying" patterns
  const textMatch = prompt.match(/(?:text|saying|shows?)\s+["']?([^"']+)["']?/i);
  if (textMatch) return textMatch[1];

  return null;
}