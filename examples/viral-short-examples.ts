/**
 * VIRAL SHORT PIPELINE - USAGE EXAMPLES
 *
 * This file demonstrates various ways to use the viral short pipeline
 * Run with: npx tsx examples/viral-short-examples.ts
 */

import {
  createViralShortOrchestrator,
  createViralShortSpec,
  validateViralShortSpec,
  getPlatformConfig,
  defaultViralShortConfig,
  ViralShortPlatform,
  ViralShortScriptStyle,
} from "../src/automation/index.js";

// ============================================================================
// EXAMPLE 1: Basic Viral Short Build
// ============================================================================

export async function example1_basicBuild() {
  console.log("\n" + "=".repeat(60));
  console.log("EXAMPLE 1: Basic Viral Short Build");
  console.log("=".repeat(60));

  const orchestrator = createViralShortOrchestrator({
    workDir: ".build-viral",
    outputDir: "out",
    verbose: true,
    defaultPlatform: "tiktok",
    defaultStyle: "photorealistic",
  });

  orchestrator.setCallbacks({
    onProgress: (p) => {
      const bar = "█".repeat(Math.floor(p.progress / 5)) + "░".repeat(20 - Math.floor(p.progress / 5));
      console.log(`  [${bar}] ${p.progress}% - ${p.message}`);
    },
    onLog: (stage, msg) => console.log(`  [${stage}] ${msg}`),
  });

  const result = await orchestrator.buildFromPrompt({
    prompt: "Paradosso: il tuo corpo ha 100.000 km di vasi sanguigni, abbastanza per fare il giro della Terra 2.5 volte",
    platform: "tiktok",
    style: "photorealistic",
    durationSeconds: 20,
    render: false, // Set to true for actual render
    hookFormula: "paradox",
    factCheckingEnabled: true,
    qualityGatesEnabled: true,
  });

  if (result.success) {
    console.log("\n✅ SUCCESS!");
    console.log(`   Video: ${result.videoPath || "(not rendered)"}`);
    console.log(`   Duration: ${result.viralShortSpec?.durationSeconds}s`);
    console.log(`   Script phases: ${result.viralShortSpec?.script.phases.length}`);
  } else {
    console.log("\n❌ FAILED:", result.error);
  }
}

// ============================================================================
// EXAMPLE 2: Comic3D Style for Reels
// ============================================================================

export async function example2_comic3DReels() {
  console.log("\n" + "=".repeat(60));
  console.log("EXAMPLE 2: Comic3D Style for Instagram Reels");
  console.log("=".repeat(60));

  const orchestrator = createViralShortOrchestrator({
    verbose: true,
    defaultPlatform: "reels",
    defaultStyle: "comic3D",
  });

  const result = await orchestrator.buildFromPrompt({
    prompt: "Se sei un developer, allora questo bug ti farà impazzire: l'off-by-one error che ha distrutto la produzione",
    platform: "reels",
    style: "comic3D",
    durationSeconds: 30,
    render: false,
    hookFormula: "directAddress",
  });

  if (result.success && result.viralShortSpec) {
    console.log("\n✅ Comic3D Spec Generated!");
    console.log(`   Style: ${result.viralShortSpec.style}`);
    console.log(`   Speech Rate: ${result.viralShortSpec.script.speechRate} wps (fast for comic)`);
    console.log(`   Ink Lines: ${result.viralShortSpec.assets.characters[0]?.inkLines?.enabled ? "Enabled" : "N/A"}`);
    console.log(`   Platform: ${result.viralShortSpec.platform} (max ${result.platformPreset?.maxDurationSeconds}s)`);
  }
}

// ============================================================================
// EXAMPLE 3: YouTube Shorts with Custom Hook
// ============================================================================

export async function example3_shortsCustomHook() {
  console.log("\n" + "=".repeat(60));
  console.log("EXAMPLE 3: YouTube Shorts with Custom Hook");
  console.log("=".repeat(60));

  const spec = createViralShortSpec(
    "74 soldati hanno tenuto il ponte per 6 ore contro 3000 nemici - la storia dimenticata",
    "shorts",
    "photorealistic"
  );

  // Override with custom hook
  spec.script.hook.formula = "shockFact";
  spec.script.hook.customText = "Non crederai a quanti nemici hanno fermato 74 uomini";

  // Adjust duration for Shorts (max 60s)
  spec.durationSeconds = 45;
  spec.durationFrames = 45 * 30;

  const validation = validateViralShortSpec(spec);
  if (!validation.valid) {
    console.log("❌ Validation failed:", validation.errors);
    return;
  }

  console.log("✅ Spec created and validated!");
  console.log(`   Title: ${spec.title}`);
  console.log(`   Hook: ${spec.script.hook.formula} - "${spec.script.hook.customText}"`);
  console.log(`   Duration: ${spec.durationSeconds}s (${spec.durationFrames} frames)`);
  console.log(`   Platform: ${spec.platform} (max ${getPlatformConfig("shorts").maxDurationSeconds}s)`);
  console.log(`   Speech Rate: ${spec.script.speechRate} wps`);

  // Save for later use
  // await writeFileSpec("shorts-history-spec.json", spec);
}

// ============================================================================
// EXAMPLE 4: Platform Configuration Deep Dive
// ============================================================================

export function example4_platformConfigs() {
  console.log("\n" + "=".repeat(60));
  console.log("EXAMPLE 4: Platform Configuration Details");
  console.log("=".repeat(60));

  for (const platform of ["tiktok", "reels", "shorts"] as ViralShortPlatform[]) {
    const config = getPlatformConfig(platform);
    console.log(`\n${platform.toUpperCase()}:`);
    console.log(`  Resolution: ${config.resolution.width}x${config.resolution.height}`);
    console.log(`  Max Duration: ${config.maxDurationSeconds}s`);
    console.log(`  Encoding: ${config.encoding.codec} ${config.encoding.bitrate}Mbps ${config.encoding.profile} L${config.encoding.level}`);
    console.log(`  Audio: ${config.audioSpec.loudnessTarget} LUFS, ${config.audioSpec.truePeakMax} dBTP`);
    console.log(`  Hook Retention Points: ${config.hookTiming.retentionPoints.join(", ")} frames`);
  }
}

// ============================================================================
// EXAMPLE 5: Style Comparison
// ============================================================================

export function example5_styleComparison() {
  console.log("\n" + "=".repeat(60));
  console.log("EXAMPLE 5: Style Configuration Comparison");
  console.log("=".repeat(60));

  const styles: ViralShortScriptStyle[] = ["photorealistic", "comic3D"];

  for (const style of styles) {
    const speechRate = defaultViralShortConfig.script.speechRate[style];
    console.log(`\n${style.toUpperCase()}:`);
    console.log(`  Speech Rate: ${speechRate} words/second`);

    if (style === "photorealistic") {
      const char = defaultViralShortConfig.assets3D.characters.photorealistic;
      console.log(`  Real Scans: ${char.useRealScans}`);
      console.log(`  Walk Cycles: ${char.nativeWalkCycles}`);
      console.log(`  Skin/Cloth Deformation: ${char.skinClothDeformation}`);
      console.log(`  Face Blendshapes: ${char.faceRig.blendshapes}`);
      console.log(`  Local Only: ${char.faceRig.localOnly}`);
    } else {
      const char = defaultViralShortConfig.assets3D.characters.comic3D;
      console.log(`  2D-in-3D: ${char.style2DIn3D}`);
      console.log(`  Ink Lines: ${char.inkLines.enabled} (${char.inkLines.minSides}/4 sides, ${char.inkLines.thickness}px)`);
      console.log(`  Round Heads: ${char.proportions.roundHeads}`);
      console.log(`  Proportional Limbs: ${char.proportions.proportionalLimbs}`);
    }
  }
}

// ============================================================================
// EXAMPLE 6: Camera Configuration
// ============================================================================

export function example6_cameraConfig() {
  console.log("\n" + "=".repeat(60));
  console.log("EXAMPLE 6: Camera & Cinematography Config");
  console.log("=".repeat(60));

  const cam = defaultViralShortConfig.camera;

  console.log("\nMovement Analysis:");
  console.log(`  Max Cuts/Second: ${cam.movementAnalysis.maxCutsPerSecond}`);
  console.log(`  Prefer Transitions: ${cam.movementAnalysis.preferTransitions}`);
  console.log(`  Max Jerk: ${cam.movementAnalysis.maxJerk}`);
  console.log(`  Linear Dolly %: ${cam.movementAnalysis.preferLinearDolly ? "65% target" : "N/A"}`);
  console.log(`  Avoid Lateral Rotation: ${cam.movementAnalysis.avoidLateralRotation}`);
  console.log(`  Avoid Chaotic Orbits: ${cam.movementAnalysis.avoidChaoticOrbits}`);

  console.log("\nTransition Weights:");
  for (const [type, cfg] of Object.entries(cam.movementAnalysis.transitions)) {
    console.log(`  ${type}: ${(cfg.weight * 100).toFixed(0)}% (${cfg.minFrames}-${cfg.maxFrames} frames)`);
  }

  console.log("\nPost-Processing (MANDATORY for realism):");
  console.log(`  Lens Blur: ${cam.postProcessing.lensBlur.enabled} (intensity: ${cam.postProcessing.lensBlur.intensity})`);
  console.log(`  Highlight Control: ${cam.postProcessing.highlightControl.enabled} (${cam.postProcessing.highlightControl.rolloffCurve})`);
  console.log(`  Vignette: ${cam.postProcessing.vignette.enabled} (${cam.postProcessing.vignette.intensity})`);
  console.log(`  Film Grain: ${cam.postProcessing.filmGrain.enabled} (${cam.postProcessing.filmGrain.intensity}, animated: ${cam.postProcessing.filmGrain.animated})`);
  console.log(`  Motion Blur: ${cam.postProcessing.motionBlur.enabled} (${cam.postProcessing.motionBlur.shutterAngle}°, ${cam.postProcessing.motionBlur.samples} samples)`);
  console.log(`  Color Grading: Never pure black, shadow tints (warm/cool/purple)`);
}

// ============================================================================
// EXAMPLE 7: Audio Mix Configuration
// ============================================================================

export function example7_audioConfig() {
  console.log("\n" + "=".repeat(60));
  console.log("EXAMPLE 7: Professional Audio Mix Config");
  console.log("=".repeat(60));

  const audio = defaultViralShortConfig.audio;

  console.log("\nTrack Structure (max 19 tracks):");
  for (const [layer, cfg] of Object.entries(audio.trackStructure.layers)) {
    console.log(`  ${layer}: ${cfg.count} track(s) - ${cfg.description}`);
  }

  console.log("\nReference Levels (dBFS):");
  for (const [track, level] of Object.entries(audio.mix.referenceLevels)) {
    console.log(`  ${track}: ${level} dBFS`);
  }

  console.log("\nNarrator Compression (Module 5):");
  const narr = audio.mix.narratorCompression;
  console.log(`  Target LUFS: ${narr.targetLUFS}`);
  console.log(`  Ratio: ${narr.ratio}:1`);
  console.log(`  Attack: ${narr.attack * 1000}ms`);
  console.log(`  Release: ${narr.release * 1000}ms`);
  console.log(`  Max Gain Reduction: ${narr.maxGainReduction} dB`);

  console.log(`\nSync Rule: ${audio.mix.syncRule}`);
}

// ============================================================================
// EXAMPLE 8: Render Optimization
// ============================================================================

export function example8_renderOptimization() {
  console.log("\n" + "=".repeat(60));
  console.log("EXAMPLE 8: Render Optimization (Module 6)");
  console.log("=".repeat(60));

  const opt = defaultViralShortConfig.assets3D.blenderHeadless.renderOptimization;

  console.log("\nLight Optimization:");
  console.log(`  Avoid Superfluous Lights: ${opt.lightOptimization.avoidSuperfluousLights}`);
  console.log(`  Particle Light Culling: ${opt.lightOptimization.particleLightCulling}`);
  console.log(`  Flame Light Culling: ${opt.lightOptimization.flameLightCulling}`);
  console.log(`  Static Light Baking: ${opt.lightOptimization.staticLightBaking}`);

  console.log("\nResolution Strategy:");
  console.log(`  Native: ${opt.resolutionStrategy.nativeRender}`);
  console.log(`  Upscale: ${opt.resolutionStrategy.upscaleMethod} ${opt.resolutionStrategy.upscaleFactor}x`);
  console.log(`  Target Display: ${opt.resolutionStrategy.targetDisplay}`);

  console.log("\nParallel Processing:");
  console.log(`  Blender Instances: ${opt.parallel.blenderInstances}`);
  console.log(`  Remotion Concurrency: ${opt.parallel.remotionConcurrency}`);
  console.log(`  Frame Distribution: ${opt.parallel.frameDistribution}`);

  console.log("\nTargets:");
  console.log(`  Max Render Time: ${opt.targetRenderTime.maxHours} hour(s)`);
  console.log(`  Quality Threshold: ${opt.targetRenderTime.maxHours}`);
}

// ============================================================================
// EXAMPLE 9: Asset Acquisition Strategy
// ============================================================================

export function example9_assetStrategy() {
  console.log("\n" + "=".repeat(60));
  console.log("EXAMPLE 9: Asset Acquisition Strategy (Module 3)");
  console.log("=".repeat(60));

  const assets = defaultViralShortConfig.assets3D;

  console.log("\nGolden Rule: Prefer Real-World Assets");
  console.log(`  Enabled: ${assets.assetAcquisition.preferRealWorldAssets}`);
  console.log(`  Auto Download: ${assets.assetAcquisition.downloadAndImport}`);
  console.log(`  Fallback to Procedural: ${assets.assetAcquisition.fallbackToProcedural}`);

  console.log("\nVerified Databases:");
  for (const [category, urls] of Object.entries(assets.assetAcquisition.databases)) {
    console.log(`  ${category}:`);
    for (const url of urls) {
      console.log(`    - ${url}`);
    }
  }

  console.log("\nProcedural Generators:");
  for (const [gen, enabled] of Object.entries(assets.procedural.generators)) {
    console.log(`  ${gen}: ${enabled ? "✓" : "✗"}`);
  }
}

// ============================================================================
// EXAMPLE 10: Full Pipeline with Spec Output
// ============================================================================

export async function example10_fullPipelineWithSpec() {
  console.log("\n" + "=".repeat(60));
  console.log("EXAMPLE 10: Full Pipeline with Spec Export");
  console.log("=".repeat(60));

  const orchestrator = createViralShortOrchestrator({
    verbose: true,
  });

  const result = await orchestrator.buildFromPrompt({
    prompt: "Paradosso: lo stomaco ha un suo sistema nervoso con 100 milioni di neuroni, chiamato 'secondo cervello'",
    platform: "tiktok",
    style: "photorealistic",
    durationSeconds: 25,
    render: false, // Generate spec only
    specOutputPath: "./out/viral-spec-example.json",
    factCheckingEnabled: true,
    qualityGatesEnabled: true,
    multiAgentEnabled: true,
  });

  if (result.success) {
    console.log("\n✅ Spec exported to ./out/viral-spec-example.json");
    console.log("   You can now:");
    console.log("   1. Review the spec manually");
    console.log("   2. Modify camera paths, audio tracks, assets");
    console.log("   3. Re-run with: npm run viral:spec ./out/viral-spec-example.json");
  }
}

// ============================================================================
// RUN ALL EXAMPLES
// ============================================================================

export async function runAllExamples() {
  console.log("🚀 VIRAL SHORT PIPELINE - USAGE EXAMPLES");
  console.log("=".repeat(60));

  // Config examples (no async needed)
  example4_platformConfigs();
  example5_styleComparison();
  example6_cameraConfig();
  example7_audioConfig();
  example8_renderOptimization();
  example9_assetStrategy();

  // Async examples (require orchestrator)
  // Uncomment to run:
  // await example1_basicBuild();
  // await example2_comic3DReels();
  // await example3_shortsCustomHook();
  // await example10_fullPipelineWithSpec();

  console.log("\n" + "=".repeat(60));
  console.log("Examples complete! Uncomment async examples to run builds.");
  console.log("=".repeat(60));
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(console.error);
}