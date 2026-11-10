# Three.js + Remotion Video Pipeline

A production-ready pipeline for creating professional videos using Three.js (React Three Fiber), Remotion, Blender, and advanced audio/video editing capabilities.

## Features

- **3D Scene Creation** — React Three Fiber + Drei + Postprocessing for stunning 3D visuals
- **Programmatic Video** — Remotion 4.x for frame-accurate rendering, timeline, and composition
- **Blender Integration** — Headless GLTF export, animation baking, procedural asset generation
- **Audio Pipeline** — Web Audio API, waveform visualization, multi-track mixing, effects
- **Video Editing** — Timeline, keyframes, transitions, effects, compositing
- **Cloud Rendering** — AWS Lambda via `@remotion/lambda` for scalable rendering
- **TypeScript** — Full type safety across the entire pipeline

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start development server (Remotion Studio)
pnpm dev

# Build video
pnpm build:video

# Render with Lambda (cloud)
pnpm lambda:deploy
pnpm lambda:render
```

## Project Structure

```
threejs-remotion-video/
├── blender/                    # Blender Python scripts
│   ├── export_gltf.py         # GLTF/GLB export pipeline
│   ├── bake_animations.py     # Animation baking (NLA → Actions)
│   ├── generate_assets.py     # Procedural asset generation
│   └── configs/               # Export/bake/generate configs
├── scripts/                   # Node.js CLI wrappers for Blender
│   ├── blender-export.js
│   ├── blender-bake.js
│   └── blender-generate.js
├── public/
│   └── assets/                # Static assets (models, textures, audio)
├── src/
│   ├── compositions/          # Remotion Compositions (entry points)
│   ├── scenes/                # Three.js scene components
│   │   ├── objects/           # Reusable 3D objects
│   │   ├── shaders/           # Custom GLSL/TSL shaders
│   │   └── postprocessing/    # EffectComposer passes
│   ├── timeline/              # Timeline & sequencing system
│   ├── audio/                 # Audio engine & visualization
│   ├── editing/               # Video editing primitives
│   ├── hooks/                 # Custom React hooks
│   ├── store/                 # Zustand stores (timeline, audio, scene)
│   ├── types/                 # TypeScript types
│   ├── components/            # UI components (AudioVisualizer, CaptionOverlay)
│   └── utils/                 # Utility functions
├── remotion.config.ts         # Remotion configuration
├── webpack.override.ts        # Webpack overrides for Three.js
├── vite.config.ts             # Vite configuration
├── tailwind.config.js         # Tailwind CSS
└── package.json
```

## Blender Pipeline

### Export GLTF/GLB

```bash
# Using CLI wrapper
node scripts/blender-export.js --config blender/configs/export_example.json

# Or directly with Blender
blender -b -P blender/export_gltf.py -- --config blender/configs/export_example.json
```

### Bake Animations

```bash
node scripts/blender-bake.js --config blender/configs/bake_example.json
```

### Generate Procedural Assets

```bash
node scripts/blender-generate.js --config blender/configs/generate_example.json --type primitives
node scripts/blender-generate.js --type city --count 50 --seed 123
```

## Remotion Compositions

### Main Video (1920x1080, 30fps, 10s)
```bash
pnpm build:video
```

### Vertical Video (1080x1920, 30fps, 6s)
```bash
remotion render src/Root.tsx vertical-video out/vertical.mp4
```

### Square Video (1080x1080, 30fps, 6s)
```bash
remotion render src/Root.tsx square-video out/square.mp4
```

## Lambda Cloud Rendering

```bash
# Deploy Lambda function
pnpm lambda:deploy

# Render video on Lambda
pnpm lambda:render
```

## Timeline System

The timeline supports:
- Multiple track types (video, audio, 3D, text, image, effect, camera, light, shader)
- Keyframe animation with easing and interpolation
- Track reordering, muting, locking, opacity, blend modes
- Undo/redo history (50 steps)
- Copy/paste/duplicate tracks

```typescript
import { useTimelineStore } from '@/store/timelineStore';

const { addTrack, addKeyframe, currentFrame } = useTimelineStore();

addTrack({
  id: 'track_1',
  name: 'Main Title',
  type: 'text',
  keyframes: [],
  enabled: true,
  muted: false,
  locked: false,
  opacity: 1,
  blendMode: 'normal',
});

addKeyframe('track_1', {
  frame: 30,
  value: 'Hello World',
  easing: 'easeOut',
  interpolation: 'linear',
});
```

## Audio System

```typescript
import { useAudioStore } from '@/store/audioStore';
import { useAudioEngine } from '@/hooks/useAudio';

const { playTrack, stopAll, analyser } = useAudioEngine();

await playTrack({
  id: 'music_1',
  src: '/assets/audio/music.mp3',
  name: 'Background Music',
  volume: 0.8,
  pan: 0,
  startFrame: 0,
  endFrame: 900,
  playbackRate: 1,
  effects: [
    { id: 'reverb_1', type: 'reverb', params: { roomSize: 0.5, wet: 0.3 }, enabled: true },
  ],
});
```

## 3D Scene Components

```tsx
import { Scene3D, CameraRig, LightRig, ParticleSystem } from '@/scenes/Scene3D';

<Scene3D width={1920} height={1080} onFrame={(frame, delta) => {
  // Update 3D scene per frame
}} />

<CameraRig frame={frame} duration={300} />
<LightRig frame={frame} duration={300} />
<ParticleSystem count={1000} size={0.1} />
```

## Custom Shaders

Place GLSL shaders in `src/scenes/shaders/`:

```glsl
// vertex.glsl
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

```glsl
// fragment.glsl
uniform float uTime;
varying vec2 vUv;
void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  float n = sin(uv.x * 10.0 + uTime) * cos(uv.y * 10.0 + uTime);
  gl_FragColor = vec4(vec3(n * 0.5 + 0.5), 1.0);
}
```

## Environment Variables

See `.env.example` for all configuration options.

Key variables:
- `REMOTION_CONCURRENCY` — Parallel render threads (default: 4)
- `BLENDER_PATH` — Path to Blender executable
- `AWS_*` — Lambda cloud rendering credentials
- `VIDEO_CRF` — Video quality (18 = visually lossless)

## Performance Tips

1. **Reduce polygon count** — Use LOD, instancing, or baked geometry
2. **Limit shadow casters** — Only key objects need `castShadow`
3. **Optimize materials** — Reuse materials, use texture atlases
4. **Control render resolution** — Preview at lower res, final at 4K
5. **Use Lambda** — Offload heavy renders to cloud
6. **Enable GPU** — `ENABLE_GPU_ACCELERATION=true`

## License

MIT