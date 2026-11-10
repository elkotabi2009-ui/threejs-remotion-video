#!/usr/bin/env node

/**
 * VIRAL SHORT CLI
 *
 * Specialized CLI for ultra-realistic viral shorts (TikTok/Reels/Shorts)
 * Implements the MASTER SYSTEM PROMPT pipeline
 *
 * Usage:
 *   npm run viral:prompt "Paradosso: il tuo corpo ha 100.000 km di vasi sanguigni" --platform tiktok --style photorealistic
 *   npm run viral:spec ./viral-spec.json
 *   npm run viral:dev
 */

import { Command } from "commander";
import { resolve } from "path";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { createViralShortOrchestrator, ViralShortOrchestrator, ViralShortBuildOptions } from "./viralShortOrchestrator.js";
import { defaultViralShortConfig, ViralShortPlatform, ViralShortScriptStyle } from "./viralShortConfig.js";
import { createViralShortSpec, validateViralShortSpec } from "./viralShortPromptParser.js";

const program = new Command();

program
  .name("viral-short")
  .description("Ultra-Realistic Viral Short Pipeline (TikTok/Reels/Shorts) - Zero AI Slop")
  .version("1.0.0");

// Global options
program
  .option("-v, --verbose", "Enable verbose logging")
  .option("--work-dir <dir>", "Working directory", ".build-viral")
  .option("--output-dir <dir>", "Output directory", "out")
  .option("--platform <platform>", "Target platform (tiktok, reels, shorts)", "tiktok")
  .option("--style <style>", "Visual style (photorealistic, comic3D)", "photorealistic")
  .option("--no-render", "Generate spec/code only, don't render video")
  .option("--spec-output <path>", "Path to save generated spec JSON")
  .option("--duration <seconds>", "Override duration in seconds")
  .option("--hook <formula>", "Hook formula (paradox, shockFact, directAddress, impossibleScale, custom)")
  .option("--hook-text <text>", "Custom hook text (when using custom hook)")
  .option("--no-fact-check", "Disable fact checking")
  .option("--no-quality-gates", "Disable quality gates")
  .option("--no-multi-agent", "Disable multi-agent architecture");

// Command: Build from natural language prompt
program
  .command("prompt <prompt>")
  .description("Build viral short from natural language description")
  .option("-d, --duration <seconds>", "Duration in seconds")
  .option("-p, --platform <platform>", "Platform: tiktok, reels, shorts")
  .option("-s, --style <style>", "Style: photorealistic, comic3D")
  .option("--hook <formula>", "Hook formula")
  .option("--hook-text <text>", "Custom hook text")
  .action(async (prompt, options) => {
    try {
      await runViralPrompt(prompt, options);
    } catch (error) {
      console.error("❌ Error:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Command: Build from spec file
program
  .command("spec <specFile>")
  .description("Build viral short from JSON spec file")
  .action(async (specFile, options) => {
    try {
      await runViralSpec(specFile, options);
    } catch (error) {
      console.error("❌ Error:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Command: Generate spec only (no render)
program
  .command("generate-spec <prompt>")
  .description("Generate viral short spec JSON from prompt without rendering")
  .option("-o, --output <path>", "Output spec file path")
  .option("-p, --platform <platform>", "Platform: tiktok, reels, shorts")
  .option("-s, --style <style>", "Style: photorealistic, comic3D")
  .option("--hook <formula>", "Hook formula")
  .option("--hook-text <text>", "Custom hook text")
  .action(async (prompt, options) => {
    try {
      await generateViralSpec(prompt, options);
    } catch (error) {
      console.error("❌ Error:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Command: Development mode
program
  .command("dev")
  .description("Start development server with hot reload for viral shorts")
  .option("--port <port>", "Port for dev server", "3000")
  .action(async (options) => {
    try {
      await runViralDev(options);
    } catch (error) {
      console.error("❌ Error:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Command: List platform presets
program
  .command("platforms")
  .description("List platform presets and their specifications")
  .action(() => {
    listPlatforms();
  });

// Command: Validate spec
program
  .command("validate <specFile>")
  .description("Validate a viral short spec file")
  .action(async (specFile) => {
    try {
      await validateSpec(specFile);
    } catch (error) {
      console.error("❌ Error:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Command: Clean
program
  .command("clean")
  .description("Clean build and cache directories")
  .action(async () => {
    try {
      await cleanViralBuild();
    } catch (error) {
      console.error("❌ Error:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse(process.argv);

// Show help if no command
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

// ============================================================================
// Implementation
// ============================================================================

async function runViralPrompt(prompt: string, options: any) {
  console.log("🎬 VIRAL SHORT PIPELINE - Prompt to Video");
  console.log("=".repeat(60));
  console.log(`📝 Prompt: ${prompt}`);
  console.log(`📱 Platform: ${options.platform}`);
  console.log(`🎨 Style: ${options.style}`);
  console.log(`⏱️  Duration: ${options.duration || "auto"}s @ 30fps`);
  console.log(`🎯 Hook: ${options.hook || "auto-detect"}`);
  console.log(`🔍 Fact-checking: ${options.factCheck !== false ? "enabled" : "disabled"}`);
  console.log(`🛡️  Quality gates: ${options.qualityGates !== false ? "enabled" : "disabled"}`);
  console.log(`🤖 Multi-agent: ${options.multiAgent !== false ? "enabled" : "disabled"}`);
  console.log(`🎞️  Render: ${options.render !== false ? "yes" : "no (spec/code only)"}`);
  console.log("");

  const orchestrator = createViralShortOrchestrator(options);

  // Set up progress callbacks
  orchestrator.setCallbacks({
    onProgress: (progress) => {
      const bar = "█".repeat(Math.floor(progress.progress / 5)) + "░".repeat(20 - Math.floor(progress.progress / 5));
      console.log(`  [${bar}] ${progress.progress}% - ${progress.message}`);
    },
    onLog: (stage, message) => {
      if (options.verbose) console.log(`  [${stage}] ${message}`);
    },
    onError: (stage, error) => {
      console.error(`  [${stage}] ERROR:`, error.message);
    },
  });

  const buildOptions: ViralShortBuildOptions = {
    prompt,
    platform: options.platform as any,
    style: options.style as any,
    durationSeconds: options.duration ? parseInt(options.duration) : undefined,
    render: options.render !== false,
    specOutputPath: options.specOutput,
    hookFormula: options.hook as any,
    customHookText: options.hookText,
    factCheckingEnabled: options.factCheck !== false,
    qualityGatesEnabled: options.qualityGates !== false,
    multiAgentEnabled: options.multiAgent !== false,
  };

  const result = await orchestrator.buildFromPrompt(buildOptions);

  if (result.success) {
    console.log("");
    console.log("✅ VIRAL SHORT COMPLETE!");
    console.log("=".repeat(60));
    if (result.videoPath) {
      console.log(`🎬 Video: ${result.videoPath}`);
    }
    if (result.viralShortSpec) {
      console.log(`📱 Platform: ${result.viralShortSpec.platform}`);
      console.log(`🎨 Style: ${result.viralShortSpec.style}`);
      console.log(`⏱️  Duration: ${result.viralShortSpec.durationSeconds}s (${result.viralShortSpec.durationFrames} frames)`);
      console.log(`🎭 Script phases: ${result.viralShortSpec.script.phases.length}`);
      console.log(`🎥 Camera keyframes: ${result.viralShortSpec.camera.keyframes.length}`);
      console.log(`🔊 Audio tracks: ${result.viralShortSpec.audio.tracks.length}`);
      console.log(`📦 Assets: ${result.viralShortSpec.assets.realWorldAssets.length} real-world, ${result.viralShortSpec.assets.proceduralGenerators.length} procedural`);
      console.log(`🤖 Blender jobs: ${result.viralShortSpec.assets.blenderJobs.length}`);
    }
    console.log(`⏱️  Total time: ${(result.duration / 1000).toFixed(1)}s`);
  } else {
    console.log("");
    console.log("❌ BUILD FAILED");
    console.log("=".repeat(60));
    console.log(`Error: ${result.error}`);
    if (result.logs.length > 0) {
      console.log("\nLogs:");
      result.logs.forEach(log => console.log(`  ${log}`));
    }
    process.exit(1);
  }
}

async function runViralSpec(specFile: string, options: any) {
  const resolvedPath = resolve(specFile);

  if (!existsSync(resolvedPath)) {
    throw new Error(`Spec file not found: ${resolvedPath}`);
  }

  console.log(`📄 Loading viral short spec from: ${resolvedPath}`);
  const specContent = readFileSync(resolvedPath, "utf-8");
  const spec = JSON.parse(specContent);

  // Validate
  const validation = validateViralShortSpec(spec);
  if (!validation.valid) {
    throw new Error(`Invalid spec: ${validation.errors.join(", ")}`);
  }

  console.log(`🎬 Building: ${spec.title} (${spec.durationSeconds}s @ ${spec.fps}fps)`);
  console.log(`📱 Platform: ${spec.platform} | 🎨 Style: ${spec.style}`);

  const orchestrator = createViralShortOrchestrator(options);
  orchestrator.setCallbacks({
    onProgress: (progress) => {
      const bar = "█".repeat(Math.floor(progress.progress / 5)) + "░".repeat(20 - Math.floor(progress.progress / 5));
      console.log(`  [${bar}] ${progress.progress}% - ${progress.message}`);
    },
    onLog: (stage, message) => {
      if (options.verbose) console.log(`  [${stage}] ${message}`);
    },
  });

  const result = await orchestrator.buildFromSpec(spec, { render: options.render !== false });

  if (result.success) {
    console.log("");
    console.log("✅ VIRAL SHORT COMPLETE!");
    if (result.videoPath) console.log(`🎬 Video: ${result.videoPath}`);
  } else {
    console.log("");
    console.log("❌ BUILD FAILED");
    console.log(`Error: ${result.error}`);
    process.exit(1);
  }
}

async function generateViralSpec(prompt: string, options: any) {
  console.log("📝 Generating viral short spec...");

  const platform = (options.platform || "tiktok") as "tiktok" | "reels" | "shorts";
  const style = (options.style || "photorealistic") as "photorealistic" | "comic3D";

  const spec = createViralShortSpec(prompt, platform, style);

  // Override hook
  if (options.hook) {
    spec.script.hook.formula = options.hook as any;
    if (options.hookText) spec.script.hook.customText = options.hookText;
  }

  // Validate
  const validation = validateViralShortSpec(spec);
  if (!validation.valid) {
    console.warn("⚠️  Spec validation warnings:", validation.errors);
  }

  const outputPath = options.output || `viral-spec-${Date.now()}.json`;
  writeFileSync(outputPath, JSON.stringify(spec, null, 2));

  console.log(`✅ Spec saved to: ${outputPath}`);
  console.log("");
  console.log("📋 Spec Summary:");
  console.log(`  Title: ${spec.title}`);
  console.log(`  Platform: ${spec.platform} (${spec.width}x${spec.height} @ ${spec.fps}fps)`);
  console.log(`  Style: ${spec.style}`);
  console.log(`  Duration: ${spec.durationSeconds}s (${spec.durationFrames} frames)`);
  console.log(`  Hook: ${spec.script.hook.formula}`);
  console.log(`  Speech Rate: ${spec.script.speechRate} wps`);
  console.log(`  Script Phases: ${spec.script.phases.map(p => p.name).join(" → ")}`);
  console.log(`  Camera Keyframes: ${spec.camera.keyframes.length}`);
  console.log(`  Transitions: ${spec.camera.transitions.length}`);
  console.log(`  Audio Tracks: ${spec.audio.tracks.length}`);
  console.log(`  Real-world Assets: ${spec.assets.realWorldAssets.length}`);
  console.log(`  Procedural Generators: ${spec.assets.proceduralGenerators.length}`);
  console.log(`  Blender Jobs: ${spec.assets.blenderJobs.length}`);
  console.log(`  Quality Gates: ${Object.entries(spec.qualityGates || {}).filter(([_, v]) => v).map(([k]) => k).join(", ")}`);
}

async function runViralDev(options: any) {
  console.log("🔧 Starting viral short development server...");
  console.log(`   Port: ${options.port}`);
  console.log("   Watching for changes...");

  const { spawn } = await import("child_process");
  const remotion = spawn("npx", ["remotion", "studio", "--port", options.port], {
    stdio: "inherit",
    shell: true,
  });

  remotion.on("exit", (code) => {
    console.log(`Remotion studio exited with code ${code}`);
  });

  process.on("SIGINT", () => {
    remotion.kill();
    process.exit(0);
  });
}

function listPlatforms() {
  console.log("📱 VIRAL SHORT PLATFORM PRESETS");
  console.log("=".repeat(60));

  const platforms = defaultViralShortConfig.platforms;
  for (const [key, preset] of Object.entries(platforms)) {
    console.log(`\n${key.toUpperCase()}:`);
    console.log(`  Resolution: ${preset.resolution.width}x${preset.resolution.height} (${preset.aspectRatio})`);
    console.log(`  FPS: ${preset.fps}`);
    console.log(`  Max Duration: ${preset.maxDurationSeconds}s`);
    console.log(`  Composition: ${preset.composition}`);
    console.log(`  Encoding: ${preset.encoding.codec} @ ${preset.encoding.bitrate}Mbps ${preset.encoding.profile} L${preset.encoding.level}`);
    console.log(`  Audio: ${preset.audioSpec.sampleRate}Hz ${preset.audioSpec.channels}ch ${preset.audioSpec.bitrate}kbps ${preset.audioSpec.loudnessTarget} LUFS`);
    console.log(`  Hook Timing: First frame critical: ${preset.hookTiming.firstFrameCritical}, Retention points: ${preset.hookTiming.retentionPoints.join(", ")} frames`);
  }

  console.log("\n🎨 STYLES:");
  console.log("  photorealistic: 2.77 wps, real human scans, 52 blendshapes, film grain, cinematic grading");
  console.log("  comic3D: 4.0 wps, 2D-in-3D with ink lines (3/4 sides), round heads, proportional limbs");
}

async function validateSpec(specFile: string) {
  const resolvedPath = resolve(specFile);

  if (!existsSync(resolvedPath)) {
    throw new Error(`Spec file not found: ${resolvedPath}`);
  }

  const specContent = readFileSync(resolvedPath, "utf-8");
  const spec = JSON.parse(specContent);

  const validation = validateViralShortSpec(spec);

  if (validation.valid) {
    console.log("✅ Spec is VALID");
    console.log("");
    console.log("📋 Summary:");
    console.log(`  Title: ${spec.title}`);
    console.log(`  Platform: ${spec.platform}`);
    console.log(`  Style: ${spec.style}`);
    console.log(`  Duration: ${spec.durationSeconds}s @ ${spec.fps}fps`);
    console.log(`  Resolution: ${spec.width}x${spec.height}`);
    console.log(`  Script phases: ${spec.script.phases.length}`);
    console.log(`  Camera keyframes: ${spec.camera.keyframes.length}`);
    console.log(`  Transitions: ${spec.camera.transitions.length}`);
    console.log(`  Audio tracks: ${spec.audio.tracks.length}`);
    console.log(`  Quality gates: ${Object.keys(spec.qualityGates || {}).length} configured`);
  } else {
    console.log("❌ Spec is INVALID");
    console.log("");
    console.log("Errors:");
    validation.errors.forEach(err => console.log(`  - ${err}`));
    process.exit(1);
  }
}

async function cleanViralBuild() {
  const { rmSync } = await import("fs");
  const dirs = [".build-viral", ".cache-viral", ".blender-temp", "out"];

  for (const dir of dirs) {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
      console.log(`🗑️  Cleaned: ${dir}`);
    }
  }
  console.log("✅ Clean complete!");
}

export default program;