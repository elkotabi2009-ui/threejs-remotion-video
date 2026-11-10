import { createViralShortOrchestrator } from './dist/automation/index.js';
import { getConfig } from './dist/automation/automation.config.js';

async function main() {
  console.log("🎬 Generating Serial Killer Viral Short (2 min)...\n");

  const config = getConfig("tiktok");
  config.features.blenderEnabled = true;
  config.blender.blenderPath = "C:/Program Files/Blender Foundation/Blender 3.6/blender.exe";
  config.assets.blenderPath = "C:/Program Files/Blender Foundation/Blender 3.6/blender.exe";
  config.remotion.renderConcurrency = 4;
  config.remotion.quality = 80;
  config.build.parallelJobs = 4;

  const orchestrator = createViralShortOrchestrator({
    workDir: ".build-serial",
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

  // H.H. Holmes - America's first serial killer, Murder Castle in Chicago
  const result = await orchestrator.buildFromPrompt({
    prompt: "H.H. Holmes: il primo serial killer d'America. Costruì un 'Castello dell'Omicidio' a Chicago con 100+ stanze, passaggi segreti, camere a gas, forni crematori. Uccise 27-200 persone durante l'Esposizione Universale 1893. Vendette gli scheletri alle facoltà di medicina. Arrestato per frode assicurativa, confessò 27 omicidi. Impiccato 1896. La sua storia è l'origine dell'horror moderno.",
    platform: "tiktok",
    style: "photorealistic",
    durationSeconds: 120,
    render: true,
    hookFormula: "paradox",
    factCheckingEnabled: true,
    qualityGatesEnabled: true,
  });

  if (result.success) {
    console.log(`\n✅ VIDEO COMPLETATO!`);
    console.log(`📁 Output: out/serial-killer-holmes.mp4`);
    console.log(`🎭 Script phases: ${result.viralShortSpec?.script.phases.length}`);
    console.log(`🎥 Camera keyframes: ${result.cameraSpec?.keyframes.length}`);
    console.log(`🔊 Audio tracks: ${result.audioSpec?.tracks.length}`);
    console.log(`📦 Blender jobs: ${result.assetSpec?.blenderJobs.length}`);
  } else {
    console.log(`\n❌ Failed: ${result.error}`);
  }
}

main().catch(console.error);
