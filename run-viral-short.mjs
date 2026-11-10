import { quickViralBuild, createViralShortOrchestrator } from './dist/automation/index.js';
import { getConfig } from './dist/automation/automation.config.js';

async function main() {
  console.log("🎬 Running Viral Short Pipeline...");

  // Get config with Blender disabled
  const config = getConfig("tiktok");
  config.features.blenderEnabled = false;
  config.blender.blenderPath = "";
  config.assets.blenderPath = "";

  const orchestrator = createViralShortOrchestrator({
    workDir: ".build-viral",
    outputDir: "out",
    verbose: true,
    defaultPlatform: "tiktok",
    defaultStyle: "photorealistic",
    config, // pass config to disable blender
  });

  orchestrator.setCallbacks({
    onProgress: (p) => console.log(`${p.stage}: ${p.progress}% - ${p.message}`),
    onLog: (stage, msg) => console.log(`[${stage}] ${msg}`),
  });

  const result = await orchestrator.buildFromPrompt({
    prompt: "Paradosso: questa pipeline genera video virali senza AI slop - 6 moduli, fact-checking reale, render sotto un'ora",
    platform: "tiktok",
    style: "photorealistic",
    durationSeconds: 15,
    render: false, // Start with no render to see spec generation
  });

  if (result.success) {
    console.log(`\n✅ Viral short spec generated!`);
    console.log(`📹 Video path: ${result.videoPath}`);
  } else {
    console.log(`\n❌ Failed: ${result.error}`);
  }
}

main().catch(console.error);