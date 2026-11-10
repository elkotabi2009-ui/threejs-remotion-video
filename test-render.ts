import { BuildOrchestrator } from "./src/automation/buildOrchestrator.js";

async function main() {
  console.log('Testing base orchestrator...');
  const orchestrator = new BuildOrchestrator({
    workDir: '.build-test',
    outputDir: 'out-test',
    verbose: true,
  });

  orchestrator.setCallbacks({
    onProgress: (p) => console.log('PROGRESS:', p.stage, p.progress, p.message),
    onLog: (stage, msg) => console.log('LOG:', stage, msg),
    onError: (stage, err) => console.log('ERROR:', stage, err.message),
  });

  const spec = {
    id: 'test',
    title: 'Test Video',
    durationSeconds: 5,
    aspectRatio: '9:16',
    targetPlatform: 'tiktok',
    fps: 30,
    scenes: [{
      id: 'scene-1',
      type: '3d',
      name: 'test',
      duration: 5,
      startTime: 0,
      assets: [],
      animations: [],
      transitions: [],
      camera: { position: { x: 0, y: 2, z: 5 }, target: { x: 0, y: 0, z: 0 }, fov: 50, near: 0.1, far: 1000 },
      lighting: { ambient: { r: 0.3, g: 0.3, b: 0.35 }, directional: [] }
    }],
    globalStyle: {
      colorPalette: { primary: [], secondary: [], accent: [], background: { r: 0, g: 0, b: 0 }, mode: 'dark' },
      lighting: 'cinematic',
      cameraStyle: 'dolly',
      postProcessing: { bloom: { enabled: false }, depthOfField: { enabled: false }, motionBlur: { enabled: false }, colorGrading: { enabled: false }, vignette: { enabled: false }, filmGrain: { enabled: false }, chromaticAberration: { enabled: false } }
    },
    renderSettings: { codec: 'h264', crf: 20, preset: 'medium', pixelFormat: 'yuv420p', concurrency: 4, imageFormat: 'png', quality: 80, timeout: 300000 }
  };

  console.log('Building...');
  const result = await orchestrator.buildFromPrompt(spec, { render: false });
  console.log('Result:', JSON.stringify({ success: result.success, videoPath: result.videoPath, error: result.error }, null, 2));
}

main().catch(console.error);
