import { createViralShortOrchestrator } from './dist/automation/index.js';
import { getConfig } from './dist/automation/automation.config.js';

async function main() {
  console.log("🎬 Running Full Viral Short Pipeline...");

  // Get config with Blender enabled and proper path
  const config = getConfig("tiktok");
  config.features.blenderEnabled = true;
  config.blender.blenderPath = "C:/Program Files/Blender Foundation/Blender 3.6/blender.exe";
  config.assets.blenderPath = "C:/Program Files/Blender Foundation/Blender 3.6/blender.exe";
  console.log("✅ Blender path:", config.blender.blenderPath);

  const orchestrator = createViralShortOrchestrator({
    workDir: ".build-viral",
    outputDir: "out",
    verbose: true,
    defaultPlatform: "tiktok",
    defaultStyle: "photorealistic",
    config,
  });

  orchestrator.setCallbacks({
    onProgress: (p) => console.log(`${p.stage}: ${p.progress}% - ${p.message}`),
    onLog: (stage, msg) => console.log(`[${stage}] ${msg}`),
  });

  const result = await orchestrator.buildFromPrompt({
    prompt: "Paradosso: il tuo corpo ha 100.000 km di vasi sanguigni - se li stendessi faresti 2.5 volte il giro della Terra",
    platform: "tiktok",
    style: "photorealistic",
    durationSeconds: 20,
    render: false, // Start with spec generation only
    hookFormula: "paradox",
    factCheckingEnabled: true,
    qualityGatesEnabled: true,
  });

  if (result.success) {
    console.log(`\n✅ Viral short spec generated!`);
    console.log(`📹 Video spec ready for render`);
    console.log(`🎭 Script phases: ${result.viralShortSpec?.script.phases.length}`);
    console.log(`🎥 Camera keyframes: ${result.cameraSpec?.keyframes.length}`);
    console.log(`🔊 Audio tracks: ${result.audioSpec?.tracks.length}`);
    console.log(`📦 Blender jobs: ${result.assetSpec?.blenderJobs.length}`);
  } else {
    console.log(`\n❌ Failed: ${result.error}`);
  }
}

main().catch(console.error);