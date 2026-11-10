#!/usr/bin/env node

/**
 * VIRAL SHORT BUILD CLI (Compiled Version)
 *
 * This is the compiled JavaScript version of viralShortCLI.ts
 * Run: npm run viral:prompt "your prompt here" --platform tiktok --style photorealistic
 */

const { Command } = require("commander");
const { resolve } = require("path");
const { existsSync, readFileSync, writeFileSync, rmSync } = require("fs");
const { spawn } = require("child_process");

// Load viral short config (we'll inline the defaults for now)
const defaultViralShortConfig = {
  script: {
    hookFormulas: {
      paradox: "Paradosso: {statement}",
      shockFact: "Non crederai a questo: {fact}",
      directAddress: "Se sei {audience}, allora {revelation}",
      impossibleScale: "{impossibleNumber} {unit} - {context}",
    },
    speechRate: {
      photorealistic: 2.77,
      comic3D: 4.0,
    },
    structure: {
      hookFrames: 30,
      setupFrames: 60,
      developmentFrames: 210,
      pivotFrames: 150,
      payoffFrames: 150,
    },
    factChecking: {
      enabled: true,
      sources: [
        "pubmed.ncbi.nlm.nih.gov",
        "arxiv.org",
        "nasa.gov",
        "who.int",
      ],
      requireCitations: true,
    },
  },
  camera: {
    movementAnalysis: {
      maxCutsPerSecond: 0.14,
      preferTransitions: true,
      transitions: {
        whipPan: { weight: 0.3, minFrames: 20, maxFrames: 23 },
        zoomThrough: { weight: 0.25, minFrames: 20, maxFrames: 23 },
        slowDolly: { weight: 0.35, minFrames: 20, maxFrames: 23, ease: "slow-in-slow-out" },
        static: { weight: 0.1 },
      },
      maxJerk: 0.5,
      preferLinearDolly: true,
      avoidLateralRotation: true,
      avoidChaoticOrbits: true,
    },
    postProcessing: {
      lensBlur: { enabled: true, intensity: 0.15, bokehQuality: "high" },
      highlightControl: { enabled: true, preventPureWhite: true, rolloffCurve: "film" },
      vignette: { enabled: true, intensity: 0.1, color: "warm" },
      filmGrain: { enabled: true, intensity: 0.03, animated: true },
      motionBlur: { enabled: true, shutterAngle: 180, samples: 16, calibratedPerMovement: true },
      colorGrading: {
        shadows: { neverPureBlack: true, tintWarm: "#1a1510", tintCool: "#0a0f1a", tintPurple: "#1a0a15" },
        highlights: { protected: true, rolloff: 0.85 },
      },
    },
    lens: { focalLength: 28, aperture: 2.0, sensorSize: "full-frame", anamorphic: false },
  },
  platforms: {
    tiktok: {
      aspectRatio: "9:16",
      resolution: { width: 1080, height: 1920 },
      fps: 30,
      maxDurationSeconds: 180,
      composition: "VerticalVideo",
      encoding: { codec: "h264", bitrate: 16, profile: "high", level: "5.1" },
      audioSpec: { sampleRate: 48000, channels: 2, bitrate: 128, loudnessTarget: -14, truePeakMax: -1 },
      hookTiming: { firstFrameCritical: true, retentionPoints: [0, 15, 30, 90, 180] },
    },
    reels: {
      aspectRatio: "9:16",
      resolution: { width: 1080, height: 1920 },
      fps: 30,
      maxDurationSeconds: 90,
      composition: "VerticalVideo",
      encoding: { codec: "h264", bitrate: 12, profile: "high", level: "5.0" },
      audioSpec: { sampleRate: 48000, channels: 2, bitrate: 128, loudnessTarget: -14, truePeakMax: -1 },
      hookTiming: { firstFrameCritical: true, retentionPoints: [0, 15, 45, 90] },
    },
    shorts: {
      aspectRatio: "9:16",
      resolution: { width: 1080, height: 1920 },
      fps: 30,
      maxDurationSeconds: 60,
      composition: "VerticalVideo",
      encoding: { codec: "h264", bitrate: 10, profile: "high", level: "5.0" },
      audioSpec: { sampleRate: 48000, channels: 2, bitrate: 128, loudnessTarget: -14, truePeakMax: -1 },
      hookTiming: { firstFrameCritical: true, retentionPoints: [0, 10, 30, 60] },
    },
  },
};

const program = new Command();

program
  .name("viral-build")
  .description("Ultra-Realistic Viral Short Pipeline (TikTok/Reels/Shorts) - Zero AI Slop")
  .version("1.0.0");

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
      await runViralPrompt(prompt, { ...program.opts(), ...options });
    } catch (error) {
      console.error("❌ Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("spec <specFile>")
  .description("Build viral short from JSON spec file")
  .action(async (specFile, options) => {
    try {
      await runViralSpec(specFile, { ...program.opts(), ...options });
    } catch (error) {
      console.error("❌ Error:", error.message);
      process.exit(1);
    }
  });

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
      await generateViralSpec(prompt, { ...program.opts(), ...options });
    } catch (error) {
      console.error("❌ Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("dev")
  .description("Start development server with hot reload for viral shorts")
  .option("--port <port>", "Port for dev server", "3000")
  .action(async (options) => {
    try {
      await runViralDev({ ...program.opts(), ...options });
    } catch (error) {
      console.error("❌ Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("platforms")
  .description("List platform presets and their specifications")
  .action(() => {
    listPlatforms();
  });

program
  .command("validate <specFile>")
  .description("Validate a viral short spec file")
  .action(async (specFile) => {
    try {
      await validateSpec(specFile);
    } catch (error) {
      console.error("❌ Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("clean")
  .description("Clean build and cache directories")
  .action(async () => {
    try {
      await cleanViralBuild();
    } catch (error) {
      console.error("❌ Error:", error.message);
      process.exit(1);
    }
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}

// ============================================================================
// Implementation
// ============================================================================

function createViralShortSpec(prompt, platform, style) {
  const config = defaultViralShortConfig;
  const platformConfig = config.platforms[platform];
  const speechRate = config.script.speechRate[style];

  const wordCount = prompt.split(/\s+/).length;
  const estimatedSeconds = Math.max(15, Math.min(platformConfig.maxDurationSeconds, wordCount / speechRate));
  const durationFrames = Math.round(estimatedSeconds * 30);

  const hookText = prompt.split(".")[0] || prompt;
  const hookFormula =
    hookText.toLowerCase().includes("paradosso") || hookText.toLowerCase().includes("paradox") ? "paradox" :
    hookText.toLowerCase().includes("non crederai") || hookText.toLowerCase().includes("shocking") ? "shockFact" :
    hookText.toLowerCase().startsWith("se sei") || hookText.toLowerCase().startsWith("if you") ? "directAddress" :
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
    script: {
      style,
      platform,
      hook: { formula: hookFormula, frame: 0 },
      speechRate,
      phases: [
        { name: "hook", startFrame: 0, endFrame: config.script.structure.hookFrames, durationFrames: config.script.structure.hookFrames, content: hookText },
        { name: "setup", startFrame: config.script.structure.hookFrames, endFrame: config.script.structure.hookFrames + config.script.structure.setupFrames, durationFrames: config.script.structure.setupFrames, content: "Setup della scena e contesto" },
        { name: "development", startFrame: config.script.structure.hookFrames + config.script.structure.setupFrames, endFrame: config.script.structure.hookFrames + config.script.structure.setupFrames + config.script.structure.developmentFrames, durationFrames: config.script.structure.developmentFrames, content: "Sviluppo progressivo dei dati e narrazione" },
        { name: "pivot", startFrame: durationFrames - config.script.structure.pivotFrames - config.script.structure.payoffFrames, endFrame: durationFrames - config.script.structure.payoffFrames, durationFrames: config.script.structure.pivotFrames, content: "Il pivot - cambio di prospettiva" },
        { name: "payoff", startFrame: durationFrames - config.script.structure.payoffFrames, endFrame: durationFrames, durationFrames: config.script.structure.payoffFrames, content: "Payoff finale con twist" },
      ],
      totalDurationFrames: durationFrames,
      totalDurationSeconds: estimatedSeconds,
    },
    camera: {
      lens: { focalLength: 28, aperture: 2.0, sensorSize: "full-frame", anamorphic: false, anamorphicSqueeze: 1.33 },
      keyframes: [
        { frame: 0, position: { x: 0, y: 2, z: 5 }, target: { x: 0, y: 0, z: 0 }, fov: 50, easeIn: 0.5, easeOut: 0.5 },
        { frame: durationFrames, position: { x: 3, y: 1.5, z: 3 }, target: { x: 0, y: 0, z: 0 }, fov: 35, easeIn: 0.5, easeOut: 0.5 },
      ],
      transitions: [],
      defaultPostProcessing: config.camera.postProcessing,
      constraints: config.camera.movementAnalysis,
    },
    assets: {
      acquisition: { preferRealWorld: true, downloadAndImport: true, fallbackToProcedural: true },
      realWorldAssets: [],
      characters: [],
      proceduralGenerators: [],
      blenderJobs: [],
      blenderHeadless: config.assets3D?.blenderHeadless || { parallelInstances: 2, gpuAcceleration: true },
      renderOptimization: config.assets3D?.blenderHeadless?.renderOptimization || {},
    },
    audio: {
      master: { targetLUFS: -14, truePeakMax: -1, limiterCeiling: -1, dither: true },
      referenceLevels: { musicBed: -24, ambientBed: -30, narrator: -18, punctualSFX: -12, foley: -18, riserImpact: -6 },
      narrator: { targetLUFS: -15, compressionRatio: 8, fastAttack: 0.003, mediumRelease: 0.1, maxGainReduction: 12, highPassHz: 80, deEsser: true },
      sync: { rule: "peaks-aligned-to-visual-changes" },
      tracks: [],
      proceduralGenerators: { ambientDrones: true, proceduralBeats: true, syntheticSFX: true, voiceoverTTS: false },
    },
    render: {
      targetPlatform: platform,
      encoding: platformConfig.encoding,
      output: { container: "mp4", audioCodec: "aac", audioBitrate: platformConfig.audioSpec.bitrate },
      optimization: { maxRenderTimeMinutes: 60, parallelJobs: 4, qualityVsSpeed: "balanced" },
    },
    qualityGates: { frameByFrameCheck: true, checkLighting: true, checkInkLines: style === "comic3D", checkClipping: true, checkContrast: true, checkAudioSync: true, checkLUFS: true },
    metadata: { createdAt: new Date().toISOString(), version: "1.0", viralShortConfigVersion: "1.0" },
  };
}

function validateViralShortSpec(spec) {
  const errors = [];
  if (!spec.title) errors.push("Missing title");
  if (!spec.platform || !["tiktok", "reels", "shorts"].includes(spec.platform)) errors.push("Invalid platform");
  if (!spec.style || !["photorealistic", "comic3D"].includes(spec.style)) errors.push("Invalid style");
  if (!spec.durationSeconds || spec.durationSeconds < 1) errors.push("Invalid duration");
  if (spec.width !== 1080 || spec.height !== 1920) errors.push("Resolution must be 1080x1920");
  if (spec.aspectRatio !== "9:16") errors.push("Aspect ratio must be 9:16");
  return { valid: errors.length === 0, errors };
}

async function runViralPrompt(prompt, options) {
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

  const platform = options.platform;
  const style = options.style;

  const spec = createViralShortSpec(prompt, platform, style);

  if (options.duration) {
    spec.durationSeconds = parseInt(options.duration);
    spec.durationFrames = Math.round(spec.durationSeconds * 30);
    // Recalculate phases
    const config = defaultViralShortConfig;
    spec.script.phases = [
      { name: "hook", startFrame: 0, endFrame: config.script.structure.hookFrames, durationFrames: config.script.structure.hookFrames, content: spec.script.phases[0].content },
      { name: "setup", startFrame: config.script.structure.hookFrames, endFrame: config.script.structure.hookFrames + config.script.structure.setupFrames, durationFrames: config.script.structure.setupFrames, content: spec.script.phases[1].content },
      { name: "development", startFrame: config.script.structure.hookFrames + config.script.structure.setupFrames, endFrame: config.script.structure.hookFrames + config.script.structure.setupFrames + config.script.structure.developmentFrames, durationFrames: config.script.structure.developmentFrames, content: spec.script.phases[2].content },
      { name: "pivot", startFrame: spec.durationFrames - config.script.structure.pivotFrames - config.script.structure.payoffFrames, endFrame: spec.durationFrames - config.script.structure.payoffFrames, durationFrames: config.script.structure.pivotFrames, content: spec.script.phases[3].content },
      { name: "payoff", startFrame: spec.durationFrames - config.script.structure.payoffFrames, endFrame: spec.durationFrames, durationFrames: config.script.structure.payoffFrames, content: spec.script.phases[4].content },
    ];
    spec.script.totalDurationFrames = spec.durationFrames;
    spec.script.totalDurationSeconds = spec.durationSeconds;
  }

  if (options.hook) {
    spec.script.hook.formula = options.hook;
    if (options.hookText) spec.script.hook.customText = options.hookText;
  }

  const validation = validateViralShortSpec(spec);
  if (!validation.valid) {
    throw new Error(`Invalid spec: ${validation.errors.join(", ")}`);
  }

  // Save spec if requested
  if (options.specOutput) {
    writeFileSync(options.specOutput, JSON.stringify(spec, null, 2));
    console.log(`📝 Spec saved to: ${options.specOutput}`);
  }

  console.log("\n📋 Generated Spec Summary:");
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
  console.log(`  Quality Gates: ${Object.entries(spec.qualityGates).filter(([_, v]) => v).map(([k]) => k).join(", ")}`);

  if (options.render !== false) {
    console.log("\n🔨 Building and rendering video...");
    console.log("   This would invoke the full pipeline:");
    console.log("   1. Resolve assets (download/generate via Blender)");
    console.log("   2. Generate Remotion code (MainVideo.tsx, Scene3D.tsx, etc.)");
    console.log("   3. Install dependencies in work directory");
    console.log("   4. Build Remotion project");
    console.log("   5. Render video using Remotion CLI");
    console.log("\n⚠️  Full pipeline requires TypeScript compilation.");
    console.log("   Run: npm run viral:build");
    console.log("   Then use the ViralShortOrchestrator class programmatically.");
  } else {
    console.log("\n✅ Spec generation complete (no render requested)");
    console.log(`   Work directory: ${options.workDir}`);
  }
}

async function runViralSpec(specFile, options) {
  const resolvedPath = resolve(specFile);

  if (!existsSync(resolvedPath)) {
    throw new Error(`Spec file not found: ${resolvedPath}`);
  }

  console.log(`📄 Loading viral short spec from: ${resolvedPath}`);
  const specContent = readFileSync(resolvedPath, "utf-8");
  const spec = JSON.parse(specContent);

  const validation = validateViralShortSpec(spec);
  if (!validation.valid) {
    throw new Error(`Invalid spec: ${validation.errors.join(", ")}`);
  }

  console.log(`🎬 Building: ${spec.title} (${spec.durationSeconds}s @ ${spec.fps}fps)`);
  console.log(`📱 Platform: ${spec.platform} | 🎨 Style: ${spec.style}`);

  if (options.render !== false) {
    console.log("\n🔨 Building and rendering video...");
    console.log("   (Requires compiled TypeScript - run: npm run viral:build)");
  } else {
    console.log("✅ Spec loaded successfully (no render requested)");
  }
}

async function generateViralSpec(prompt, options) {
  console.log("📝 Generating viral short spec...");

  const platform = options.platform || "tiktok";
  const style = options.style || "photorealistic";

  const spec = createViralShortSpec(prompt, platform, style);

  if (options.hook) {
    spec.script.hook.formula = options.hook;
    if (options.hookText) spec.script.hook.customText = options.hookText;
  }

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
  console.log(`  Quality Gates: ${Object.entries(spec.qualityGates).filter(([_, v]) => v).map(([k]) => k).join(", ")}`);
}

async function runViralDev(options) {
  console.log("🔧 Starting viral short development server...");
  console.log(`   Port: ${options.port}`);
  console.log("   Watching for changes...");

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

async function validateSpec(specFile) {
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
  const dirs = [".build-viral", ".cache-viral", ".blender-temp", "out"];

  for (const dir of dirs) {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
      console.log(`🗑️  Cleaned: ${dir}`);
    }
  }
  console.log("✅ Clean complete!");
}