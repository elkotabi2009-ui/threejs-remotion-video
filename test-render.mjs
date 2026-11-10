import { createBuildOrchestrator, parseVideoPrompt } from './dist/automation/index.js';
import { getConfig } from './dist/automation/automation.config.js';

async function main() {
  console.log("🎬 QUICK TEST RENDER - 15s Neon Cube\n");

  const config = getConfig("tiktok");
  config.remotion.renderConcurrency = 2;
  config.remotion.quality = 70;

  const orchestrator = createBuildOrchestrator({
    workDir: ".build-test",
    outputDir: "out",
    verbose: true,
    config,
  });

  orchestrator.setCallbacks({
    onProgress: (p) => console.log(`${p.stage}: ${p.progress}% - ${p.message}`),
    onLog: (stage, msg) => console.log(`[${stage}] ${msg}`),
  });

  const prompt = "15s TikTok: spinning neon cube with particles, electric blue glow";
  console.log(`Prompt: ${prompt}\n`);

  const result = await orchestrator.buildFromPrompt(
    parseVideoPrompt(prompt, { platform: "tiktok", durationSeconds: 15 })
  );

  if (result.success) {
    console.log(`\n✅ VIDEO PRONTO: ${result.videoPath}`);
    console.log(`   Frames: ${result.metadata?.totalFrames || 'N/A'}`);
    console.log(`   Duration: ${result.metadata?.durationSeconds || 'N/A'}s`);
  } else {
    console.log(`\n❌ ERRORE: ${result.error}`);
  }
}

main().catch(console.error);