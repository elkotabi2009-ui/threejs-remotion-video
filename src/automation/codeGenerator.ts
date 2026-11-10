import { VideoSpec, SceneSpec, Asset, Animation, Transition, AudioSpec, StyleSpec, Vector3, Color } from "./promptParser.js";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname, resolve } from "path";

/**
 * Code Generator - Transforms VideoSpec into Remotion/Three.js code
 * Generates composition files, scene components, and asset manifests
 */

// ============================================================================
// Types
// ============================================================================

export interface GenerationOptions {
  outputDir: string;
  compositionName: string;
  includeAudio: boolean;
  includeTimeline: boolean;
  template?: "main" | "vertical" | "square" | "preview";
  generateSeparateSceneFiles?: boolean;
}

export interface GeneratedFiles {
  composition: string;
  scene?: string;
  manifest: string;
  root: string;
}

export interface AssetManifest {
  id: string;
  title: string;
  durationSeconds: number;
  durationFrames: number;
  fps: number;
  width: number;
  height: number;
  aspectRatio: string;
  targetPlatform: string;
  scenes: SceneManifest[];
  audio: AudioManifest;
  globalStyle: StyleManifest;
  assets: AssetRequirement[];
  generatedAt: string;
}

export interface SceneManifest {
  id: string;
  name: string;
  type: SceneSpec["type"];
  startFrame: number;
  endFrame: number;
  durationFrames: number;
  assets: AssetRequirement[];
  animations: AnimationManifest[];
  transitions: TransitionManifest[];
  camera?: CameraManifest;
  lighting?: LightingManifest;
}

export interface AssetRequirement {
  id: string;
  type: Asset["type"];
  src: string;
  name?: string;
  localPath?: string;
  sceneId?: string;
  required: boolean;
  metadata?: Record<string, unknown>;
}

export interface AnimationManifest {
  id: string;
  type: Animation["type"];
  target: string;
  property: string;
  from: unknown;
  to: unknown;
  durationFrames: number;
  delayFrames: number;
  easing: Animation["easing"];
  loop: boolean;
  yoyo: boolean;
}

export interface TransitionManifest {
  id: string;
  type: Transition["type"];
  durationFrames: number;
  easing: string;
  direction: Transition["direction"];
  params?: Record<string, unknown>;
}

export interface CameraManifest {
  position: Vector3;
  target: Vector3;
  fov: number;
  near: number;
  far: number;
}

export interface LightingManifest {
  ambient?: Color;
  directional?: Array<{ color: Color; intensity: number; position: Vector3 }>;
  point?: Array<{ color: Color; intensity: number; position: Vector3; distance: number; decay: number }>;
}

export interface AudioManifest {
  backgroundMusic?: { src: string; volume: number; loop: boolean; fadeInFrames: number; fadeOutFrames: number; startFrame: number };
  voiceover?: { src: string; volume: number; startFrame: number; language: string };
  sfx: Array<{ id: string; src: string; trigger: "time" | "event" | "beat"; time?: number; event?: string; volume: number; pitch: number }>;
  beatSync: boolean;
  masterVolume: number;
}

export interface StyleManifest {
  colorPalette?: { primary: Color[]; secondary?: Color[]; accent?: Color[]; background?: Color; mode: "light" | "dark" | "auto" };
  lighting: StyleSpec["lighting"];
  cameraStyle: StyleSpec["cameraStyle"];
  postProcessing?: StyleSpec["postProcessing"];
}

// ============================================================================
// Main Generator Function
// ============================================================================

/**
 * Generates Remotion/Three.js code from a VideoSpec
 */
export function generateCode(spec: VideoSpec, options?: Partial<GenerationOptions>): GeneratedFiles {
  const opts: GenerationOptions = {
    outputDir: "src",
    compositionName: "MainVideo",
    includeAudio: true,
    includeTimeline: true,
    template: "main",
    generateSeparateSceneFiles: true,
    ...options,
  };

  const id = spec.id.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase();
  const durationFrames = Math.round(spec.durationSeconds * spec.fps);
  const { width, height } = getDimensions(spec.aspectRatio);

  const manifest = buildManifest(spec, durationFrames, width, height);
  const manifestJson = JSON.stringify(manifest, null, 2);

  const composition = generateComposition(spec, manifest, id, durationFrames, width, height, opts);

  const has3DScenes = spec.scenes.some(s => s.type === "3d");
  const scene = has3DScenes && opts.generateSeparateSceneFiles
    ? generateSceneFile(spec, manifest, id, durationFrames, width, height)
    : undefined;

  const root = generateRoot(spec, id, opts);

  return { composition, scene, manifest: manifestJson, root };
}

/**
 * Saves generated files to disk
 */
export async function saveGeneratedFiles(
  files: GeneratedFiles,
  spec: VideoSpec,
  options?: Partial<GenerationOptions>
): Promise<{ compositionPath: string; scenePath?: string; manifestPath: string; rootPath: string }> {
  const opts: GenerationOptions = {
    outputDir: "src",
    compositionName: "MainVideo",
    includeAudio: true,
    includeTimeline: true,
    template: "main",
    generateSeparateSceneFiles: true,
    ...options,
  };

  const id = spec.id.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase();
  const baseDir = resolve(opts.outputDir);

  const compDir = join(baseDir, "compositions", "generated");
  const sceneDir = join(baseDir, "scenes", "generated");
  const autoDir = join(baseDir, "automation");

  [compDir, sceneDir, autoDir].forEach(d => {
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  });

  const compositionPath = join(compDir, `${id}.tsx`);
  writeFileSync(compositionPath, files.composition);

  let scenePath: string | undefined;
  if (files.scene) {
    scenePath = join(sceneDir, `${id}Scene.tsx`);
    writeFileSync(scenePath, files.scene);
  }

  const manifestPath = join(autoDir, `${id}-manifest.json`);
  writeFileSync(manifestPath, files.manifest);

  const rootPath = join(baseDir, "Root.tsx");
  writeFileSync(rootPath, files.root);

  return { compositionPath, scenePath, manifestPath, rootPath };
}

// ============================================================================
// Manifest Builder
// ============================================================================

function buildManifest(
  spec: VideoSpec,
  durationFrames: number,
  width: number,
  height: number
): AssetManifest {
  const sceneManifests: SceneManifest[] = [];
  const allAssets: AssetRequirement[] = [];

  for (const scene of spec.scenes) {
    const startFrame = Math.round(scene.startTime * spec.fps);
    const endFrame = Math.min(startFrame + Math.round(scene.duration * spec.fps), durationFrames);
    const sceneDurationFrames = endFrame - startFrame;

    const assetReqs: AssetRequirement[] = scene.assets.map((asset: Asset) => {
      const req: AssetRequirement = {
        id: asset.id,
        type: asset.type,
        src: asset.src,
        name: asset.name,
        sceneId: scene.id,
        required: true,
        metadata: asset.metadata,
      };
      allAssets.push(req);
      return req;
    });

    const animManifests: AnimationManifest[] = scene.animations.map((anim: Animation) => ({
      id: anim.id,
      type: anim.type,
      target: anim.target,
      property: anim.property,
      from: anim.from,
      to: anim.to,
      durationFrames: Math.round(anim.duration / 1000 * spec.fps),
      delayFrames: Math.round(anim.delay / 1000 * spec.fps),
      easing: anim.easing,
      loop: anim.loop,
      yoyo: anim.yoyo,
    }));

    const transManifests: TransitionManifest[] = scene.transitions.map((trans: Transition) => ({
      id: trans.id,
      type: trans.type,
      durationFrames: Math.round(trans.duration / 1000 * spec.fps),
      easing: trans.easing,
      direction: trans.direction,
      params: trans.params,
    }));

    const sceneManifest: SceneManifest = {
      id: scene.id,
      name: scene.name || `Scene ${sceneManifests.length + 1}`,
      type: scene.type,
      startFrame,
      endFrame,
      durationFrames: sceneDurationFrames,
      assets: assetReqs,
      animations: animManifests,
      transitions: transManifests,
      camera: scene.camera ? {
        position: scene.camera.position || { x: 0, y: 2, z: 5 },
        target: scene.camera.target || { x: 0, y: 0, z: 0 },
        fov: scene.camera.fov || 50,
        near: scene.camera.near || 0.1,
        far: scene.camera.far || 1000,
      } : undefined,
      lighting: scene.lighting ? {
        ambient: scene.lighting.ambient,
        directional: scene.lighting.directional,
        point: scene.lighting.point,
      } : undefined,
    };

    sceneManifests.push(sceneManifest);
  }

  const audioManifest: AudioManifest = {
    backgroundMusic: spec.audio.backgroundMusic ? {
      src: spec.audio.backgroundMusic.src,
      volume: spec.audio.backgroundMusic.volume,
      loop: spec.audio.backgroundMusic.loop,
      fadeInFrames: Math.round((spec.audio.backgroundMusic.fadeIn || 0) * spec.fps),
      fadeOutFrames: Math.round((spec.audio.backgroundMusic.fadeOut || 0) * spec.fps),
      startFrame: Math.round((spec.audio.backgroundMusic.startTime || 0) * spec.fps),
    } : undefined,
    voiceover: spec.audio.voiceover ? {
      src: spec.audio.voiceover.src,
      volume: spec.audio.voiceover.volume,
      startFrame: Math.round((spec.audio.voiceover.startTime || 0) * spec.fps),
      language: spec.audio.voiceover.language,
    } : undefined,
    sfx: spec.audio.sfx.map((sfx: typeof spec.audio.sfx[0]) => ({
      id: sfx.id,
      src: sfx.src,
      trigger: sfx.trigger,
      time: sfx.time ? Math.round(sfx.time * spec.fps) : undefined,
      event: sfx.event,
      volume: sfx.volume,
      pitch: sfx.pitch,
    })),
    beatSync: spec.audio.beatSync,
    masterVolume: spec.audio.masterVolume,
  };

  const styleManifest: StyleManifest = {
    colorPalette: spec.globalStyle.colorPalette,
    lighting: spec.globalStyle.lighting,
    cameraStyle: spec.globalStyle.cameraStyle,
    postProcessing: spec.globalStyle.postProcessing,
  };

  return {
    id: spec.id,
    title: spec.title,
    durationSeconds: spec.durationSeconds,
    durationFrames,
    fps: spec.fps,
    width,
    height,
    aspectRatio: spec.aspectRatio,
    targetPlatform: spec.targetPlatform,
    scenes: sceneManifests,
    audio: audioManifest,
    globalStyle: styleManifest,
    assets: allAssets,
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Composition Generator
// ============================================================================

function generateComposition(
  spec: VideoSpec,
  manifest: AssetManifest,
  id: string,
  durationFrames: number,
  width: number,
  height: number,
  opts: GenerationOptions
): string {
  const has3DScenes = spec.scenes.some((s: SceneSpec) => s.type === "3d");
  const hasVideoScenes = spec.scenes.some((s: SceneSpec) => s.type === "video");
  const hasTextScenes = spec.scenes.some((s: SceneSpec) => s.type === "text");
  const hasAudio = opts.includeAudio && manifest.audio.backgroundMusic;

  const backgroundColor = spec.globalStyle.colorPalette?.background
    ? `rgb(${Math.round(spec.globalStyle.colorPalette.background.r * 255)}, ${Math.round(spec.globalStyle.colorPalette.background.g * 255)}, ${Math.round(spec.globalStyle.colorPalette.background.b * 255)})`
    : "#0a0a0f";

  const compositionId = `${id}-${opts.template}`;

  return `import { Composition, AbsoluteFill, useVideoConfig, OffthreadVideo } from "remotion";
import { Scene3D, CameraRig, LightRig, GLTFModel, ParticleSystem, ShaderBackground } from "@/scenes/Scene3D";
import { AudioVisualizer } from "@/components/AudioVisualizer";
import { CaptionOverlay, DynamicText } from "@/components/CaptionOverlay";
import { Timeline } from "@/timeline/Timeline";
import { Transition, useTransition } from "@/editing/transitions";
import { useTimelineStore } from "@/store/timelineStore";
import { useAudioStore } from "@/store/audioStore";
import { useRemotionTiming, useInterpolate, useInterpolateVec3, useSequence, useTimeRange } from "@/hooks/useRemotion";
import { useMemo, useRef, useEffect } from "react";

export const ${capitalizeFirst(opts.compositionName)}: React.FC = () => {
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const { frame, time, progress } = useRemotionTiming();
  const { tracks, inPoint, outPoint } = useTimelineStore();
  const { tracks: audioTracks, masterVolume } = useAudioStore();

  const videoTracks = useMemo(() => tracks.filter(t => t.type === "video"), [tracks]);
  const threeTracks = useMemo(() => tracks.filter(t => t.type === "3d"), [tracks]);
  const textTracks = useMemo(() => tracks.filter(t => t.type === "text"), [tracks]);

  const sceneSequence = useMemo(() => {
    return ${JSON.stringify(manifest.scenes.map(s => ({
      id: s.id, name: s.name, type: s.type, startFrame: s.startFrame, endFrame: s.endFrame,
    }))).replace(/"([^"]+)":/g, '$1:')};
  }, []);

  const activeScene = useMemo(() => {
    return sceneSequence.find(s => frame >= s.startFrame && frame < s.endFrame) || sceneSequence[0];
  }, [sceneSequence, frame]);

  const sceneProgress = useMemo(() => {
    if (!activeScene) return 0;
    return (frame - activeScene.startFrame) / (activeScene.endFrame - activeScene.startFrame);
  }, [activeScene, frame]);

  return (
    <AbsoluteFill style={{ background: "${backgroundColor}" }}>
      {threeTracks.map((track) => (
        <OffthreadVideo key={track.id} src="three-scene" durationInFrames={durationInFrames}>
          <Generated3DScene
            width={width}
            height={height}
            sceneSpec={activeScene}
            frame={frame}
            progress={sceneProgress}
            sceneManifest={${JSON.stringify(manifest.scenes.filter(s => s.type === "3d")).replace(/"([^"]+)":/g, '$1:')}}
          />
        </OffthreadVideo>
      ))}
      ${hasVideoScenes ? `{
        videoTracks.map((track) => (
          <TimeRangeTrack key={track.id} track={track} />
        ))
      }` : "// No video scenes"}
      ${hasTextScenes ? `{
        textTracks.map((track) => (
          <CaptionOverlay
            key={track.id}
            track={track}
            width={width}
            height={height}
            style="default"
            animation="fade"
          />
        ))
      }` : "// No text scenes"}
      ${hasAudio ? `{
        <AudioVisualizer
          tracks={audioTracks}
          width={width}
          height={200}
          position="bottom"
          style="bars"
          color="${getPrimaryColor(spec.globalStyle.colorPalette)}"
        />
      }` : "// Audio visualizer disabled"}
      ${opts.includeTimeline ? `{
        <Timeline
          width={width}
          height={100}
          position="bottom"
        />
      }` : "// Timeline disabled"}
      <SceneTransitions
        scenes={sceneSequence}
        currentFrame={frame}
        width={width}
        height={height}
      />
    </AbsoluteFill>
  );
};

function TimeRangeTrack({ track }: { track: any }) {
  const { frame } = useRemotionTiming();
  const { active, progress } = useTimeRange(
    track.keyframes[0]?.frame || 0,
    track.keyframes[track.keyframes.length - 1]?.frame || 0
  );

  if (!active) return null;

  return (
    <AbsoluteFill
      style={{ opacity: 1, mixBlendMode: track.blendMode }}
    >
      {track.content}
    </AbsoluteFill>
  );
}

interface Generated3DSceneProps {
  width: number; height: number; sceneSpec: any; frame: number; progress: number; sceneManifest: any[];
}

function Generated3DScene({
  width, height, sceneSpec, frame, progress, sceneManifest,
}: Generated3DSceneProps) {
  const sceneData = sceneManifest.find(s => s.id === sceneSpec?.id) || sceneManifest[0];
  const { camera, lighting, assets, animations } = sceneData || {};

  const cameraPosition = useInterpolateVec3(
    camera ? [{ frame: 0, value: camera.position }, { frame: 1, value: camera.target }] : [],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const animatedObjects = useMemo(() => {
    if (!animations || animations.length === 0) return [];
    return animations.map(anim => ({
      ...anim,
      progress: useInterpolate(
        [{ frame: anim.delayFrames, value: 0 }, { frame: anim.delayFrames + anim.durationFrames, value: 1 }],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      ),
    }));
  }, [animations, frame]);

  return (
    <Scene3D width={width} height={height}>
      {camera && (
        <CameraRig
          frame={frame}
          duration={sceneSpec?.durationFrames || ${durationFrames}}
          position={cameraPosition}
          target={camera.target ? useInterpolateVec3([
            { frame: 0, value: camera.target }, { frame: 1, value: camera.target },
          ]) : { x: 0, y: 0, z: 0 }}
        />
      )}
      <LightRig frame={frame} duration={sceneSpec?.durationFrames || ${durationFrames}} config={lighting} />
      {assets?.map((asset: any) => {
        switch (asset.type) {
          case "model":
            return <GLTFModel key={asset.id} url={asset.src} position={asset.position || [0,0,0]} rotation={asset.rotation || [0,0,0]} scale={asset.scale || [1,1,1]} animations={animations.filter((a: any) => a.target === asset.id)} />;
          case "shader":
            return <ShaderBackground key={asset.id} time={time} shaderUrl={asset.src} />;
          case "particle":
            return <ParticleSystem key={asset.id} count={asset.count || 1000} size={asset.size || 0.1} color={asset.color || 0xffffff} />;
          default:
            return null;
        }
      })}
      {animatedObjects.map((anim: any) => (
        <AnimatedProperty key={anim.id} target={anim.target} property={anim.property} from={anim.from} to={anim.to} progress={anim.progress} easing={anim.easing} loop={anim.loop} yoyo={anim.yoyo} />
      ))}
    </Scene3D>
  );
}

interface AnimatedPropertyProps { target: string; property: string; from: unknown; to: unknown; progress: number; easing: string; loop: boolean; yoyo: boolean; }

function AnimatedProperty({ target, property, from, to, progress, easing, loop, yoyo }: AnimatedPropertyProps) {
  const ref = useRef<any>(null);
  useFrame(() => {
    if (!ref.current) return;
    const eased = easeProgress(progress, easing);
    const finalProgress = yoyo ? 1 - Math.abs(1 - eased * 2) : eased;
    const value = interpolateValue(from, to, finalProgress);
    const parts = property.split(".");
    let obj: any = ref.current;
    for (let i = 0; i < parts.length - 1; i++) { obj = obj[parts[i]]; if (!obj) return; }
    obj[parts[parts.length - 1]] = value;
  });
  return <group ref={ref} />;
}

interface SceneTransitionsProps { scenes: any[]; currentFrame: number; width: number; height: number; }

function SceneTransitions({ scenes, currentFrame, width, height }: SceneTransitionsProps) {
  const transitions = scenes.filter((_, i) => i > 0).map((scene, i) => {
    const prevScene = scenes[i];
    const trans = scene.transitions?.[0];
    return { fromScene: prevScene, toScene: scene, startFrame: scene.startFrame, endFrame: scene.startFrame + (trans?.durationFrames || 30), config: trans || { type: "fade", duration: 30, easing: "easeInOut", direction: "both" } };
  }).filter(t => currentFrame >= t.startFrame && currentFrame < t.endFrame);

  if (transitions.length === 0) return null;

  return (
    <>
      {transitions.map((t, i) => {
        const transProgress = (currentFrame - t.startFrame) / (t.endFrame - t.startFrame);
        return <Transition key={i} fromTrack={{ id: t.fromScene.id, content: <Generated3DScene sceneSpec={t.fromScene} frame={currentFrame} progress={0} sceneManifest={scenes} /> }} toTrack={{ id: t.toScene.id, content: <Generated3DScene sceneSpec={t.toScene} frame={currentFrame} progress={1} sceneManifest={scenes} /> }} config={{ type: t.config.type, duration: t.config.durationFrames, easing: t.config.easing, direction: t.config.direction, color: t.config.params?.color }} progress={transProgress} />;
      })}
    </>
  );
}

export const ${capitalizeFirst(compositionId)}: React.FC = () => {
  return <Composition id="${compositionId}" component={${capitalizeFirst(opts.compositionName)}} durationInFrames=${durationFrames} fps=${spec.fps} width={${width}} height={${height}} defaultProps={{}} />;
};

function easeProgress(t: number, easing: string): number {
  const clamped = Math.max(0, Math.min(1, t));
  switch (easing) {
    case "linear": return clamped;
    case "easeIn": return clamped * clamped;
    case "easeOut": return 1 - (1 - clamped) * (1 - clamped);
    case "easeInOut": return clamped < 0.5 ? 2 * clamped * clamped : -1 + (4 - 2 * clamped) * clamped;
    case "easeInSine": return 1 - Math.cos((clamped * Math.PI) / 2);
    case "easeOutSine": return Math.sin((clamped * Math.PI) / 2);
    case "easeInOutSine": return -(Math.cos(Math.PI * clamped) - 1) / 2;
    case "easeInQuad": return clamped * clamped;
    case "easeOutQuad": return 1 - (1 - clamped) * (1 - clamped);
    case "easeInOutQuad": return clamped < 0.5 ? 2 * clamped * clamped : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
    case "easeInCubic": return clamped * clamped * clamped;
    case "easeOutCubic": return 1 - Math.pow(1 - clamped, 3);
    case "easeInOutCubic": return clamped < 0.5 ? 4 * clamped * clamped * clamped : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
    case "easeOutElastic": { const c4 = (2 * Math.PI) / 3; return clamped === 0 ? 0 : clamped === 1 ? 1 : Math.pow(2, -10 * clamped) * Math.sin((clamped * 10 - 0.75) * c4) + 1; }
    case "easeOutBounce": { const n1 = 7.5625, d1 = 2.75; if (clamped < 1/d1) return n1*clamped*clamped; if (clamped < 2/d1) return n1*(clamped-=1.5/d1)*clamped+0.75; if (clamped < 2.5/d1) return n1*(clamped-=2.25/d1)*clamped+0.9375; return n1*(clamped-=2.625/d1)*clamped+0.984375; }
    default: return clamped < 0.5 ? 2 * clamped * clamped : -1 + (4 - 2 * clamped) * clamped;
  }
}

function interpolateValue(from: unknown, to: unknown, t: number): number | { x: number; y: number; z: number } {
  if (typeof from === "number" && typeof to === "number") return from + (to - from) * t;
  if (typeof from === "object" && typeof to === "object" && from && to) {
    const f = from as { x?: number; y?: number; z?: number };
    const toObj = to as { x?: number; y?: number; z?: number };
    return { x: (f.x ?? 0) + ((toObj.x ?? 0) - (f.x ?? 0)) * t, y: (f.y ?? 0) + ((toObj.y ?? 0) - (f.y ?? 0)) * t, z: (f.z ?? 0) + ((toObj.z ?? 0) - (f.z ?? 0)) * t };
  }
  return 0;
}

function getPrimaryColor(palette?: StyleManifest["colorPalette"]): string {
  if (!palette || !palette.primary || palette.primary.length === 0) return "#00ff88";
  const c = palette.primary[0];
  return \`rgb(\${Math.round(c.r * 255)}, \${Math.round(c.g * 255)}, \${Math.round(c.b * 255)})\`;
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
`;
}

// ============================================================================
// Scene File Generator
// ============================================================================

function generateSceneFile(
  spec: VideoSpec,
  manifest: AssetManifest,
  id: string,
  durationFrames: number,
  width: number,
  height: number
): string {
  const scene3dScenes = manifest.scenes.filter(s => s.type === "3d");
  const primaryScene = scene3dScenes[0];
  const hasLighting = primaryScene?.lighting !== undefined;
  const hasPostProcessing = spec.globalStyle.postProcessing !== undefined;
  const sceneId = toValidIdentifier(id);

  return `import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import { OrbitControls, Environment, Html, ContactShadows, Effects, Bloom, Vignette, ChromaticAberration, DepthOfField } from "@react-three/drei";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useRef, useEffect, Suspense } from "react";
import { useRemotionTiming, useInterpolate, useInterpolateVec3, useTimeRange } from "@/hooks/useRemotion";

extend(THREE);

interface ${capitalizeFirst(sceneId)}SceneProps {
  width: number;
  height: number;
  frame?: number;
  progress?: number;
  sceneSpec?: any;
}

export const ${capitalizeFirst(sceneId)}Scene: React.FC<${capitalizeFirst(sceneId)}SceneProps> = ({
  width, height, frame: frameProp, progress: progressProp, sceneSpec,
}) => {
  const { frame, time, progress } = useRemotionTiming();
  const currentFrame = frameProp ?? frame;
  const currentProgress = progressProp ?? progress;

  const cameraConfig = useMemo(() => {
    const cam = sceneSpec?.camera || ${primaryScene?.camera ? JSON.stringify(primaryScene.camera).replace(/"([^"]+)":/g, '$1:') : "null"};
    if (!cam) return null;
    return { position: new THREE.Vector3(cam.position?.x || 0, cam.position?.y || 2, cam.position?.z || 5), target: new THREE.Vector3(cam.target?.x || 0, cam.target?.y || 0, cam.target?.z || 0), fov: cam.fov || 50, near: cam.near || 0.1, far: cam.far || 1000 };
  }, [sceneSpec?.camera]);

  const lightingConfig = useMemo(() => ${hasLighting ? JSON.stringify(primaryScene?.lighting).replace(/"([^"]+)":/g, '$1:') : "null"}, []);
  const assets = useMemo(() => ${JSON.stringify(primaryScene?.assets || []).replace(/"([^"]+)":/g, '$1:')}, []);
  const animations = useMemo(() => ${JSON.stringify(primaryScene?.animations || []).replace(/"([^"]+)":/g, '$1:')}, []);
  const postProcessing = ${hasPostProcessing ? JSON.stringify(spec.globalStyle.postProcessing).replace(/"([^"]+)":/g, '$1:') : "undefined"};
  const environmentPreset = "${spec.globalStyle.lighting}" as "studio" | "apartment" | "city" | "dawn" | "forest" | "lobby" | "night" | "park" | "sunset" | "warehouse";

  return (
    <Canvas
      camera={cameraConfig ? { position: cameraConfig.position.toArray(), fov: cameraConfig.fov, near: cameraConfig.near, far: cameraConfig.far } : { position: [0, 2, 5], fov: 50 }}
      style={{ width, height }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => { gl.setPixelRatio(Math.min(window.devicePixelRatio, 2)); gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFSoftShadowMap; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1; }}
    >
      <Suspense fallback={null}>
        <CameraRigComponent config={cameraConfig} frame={currentFrame} duration=${durationFrames} />
        <LightRigComponent config={lightingConfig} frame={currentFrame} duration=${durationFrames} />
        <SceneAssets assets={assets} animations={animations} frame={currentFrame} time={time} progress={currentProgress} />
        ${hasPostProcessing ? `{ postProcessing && ( <Effects multisampling={8}> {postProcessing.bloom?.enabled && ( <Bloom intensity={postProcessing.bloom.strength} radius={postProcessing.bloom.radius} threshold={postProcessing.bloom.threshold} /> )} {postProcessing.depthOfField?.enabled && ( <DepthOfField focusDistance={postProcessing.depthOfField.focusDistance} aperture={postProcessing.depthOfField.aperture} maxBlur={postProcessing.depthOfField.maxBlur} /> )} {postProcessing.motionBlur?.enabled && ( <MotionBlur strength={postProcessing.motionBlur.strength} /> )} {postProcessing.vignette?.enabled && ( <Vignette darkness={postProcessing.vignette.darkness} offset={postProcessing.vignette.offset} /> )} {postProcessing.filmGrain?.enabled && ( <FilmGrain strength={postProcessing.filmGrain.strength} /> )} {postProcessing.chromaticAberration?.enabled && ( <ChromaticAberration offset={postProcessing.chromaticAberration.offset} /> )} </Effects> ) }` : "// No post-processing effects"}
        <Environment preset={environmentPreset} background={false} />
        <ContactShadows opacity={0.3} scale={10} blur={2} far={10} />
      </Suspense>
      <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} />
    </Canvas>
  );
};

interface CameraRigComponentProps { config: { position: THREE.Vector3; target: THREE.Vector3; fov: number; near: number; far: number } | null; frame: number; duration: number; }

function CameraRigComponent({ config, frame, duration }: CameraRigComponentProps) {
  const { camera } = useThree();
  useFrame(() => {
    if (!config) return;
    const progress = frame / duration;
    const position = config.position.clone(); const target = config.target.clone();
    const cameraStyle = "${spec.globalStyle.cameraStyle}";
    let animatedPosition = position; let animatedTarget = target;
    switch (cameraStyle) {
      case "orbit": const angle = progress * Math.PI * 2; animatedPosition = new THREE.Vector3(Math.sin(angle) * position.length(), position.y, Math.cos(angle) * position.length()); break;
      case "dolly": animatedPosition = position.clone().lerp(new THREE.Vector3(0, 1, 3), progress * 0.5); break;
      case "crane": animatedPosition = new THREE.Vector3(position.x, position.y + Math.sin(progress * Math.PI) * 3, position.z); break;
      case "handheld": animatedPosition = new THREE.Vector3(position.x + (Math.random() - 0.5) * 0.1, position.y + (Math.random() - 0.5) * 0.1, position.z + (Math.random() - 0.5) * 0.1); break;
    }
    camera.position.lerp(animatedPosition, 0.05); camera.lookAt(animatedTarget);
  });
  return null;
}

interface LightRigComponentProps { config: { ambient?: { r: number; g: number; b: number }; directional?: Array<{ color: { r: number; g: number; b: number }; intensity: number; position: { x: number; y: number; z: number } }>; point?: Array<{ color: { r: number; g: number; b: number }; intensity: number; position: { x: number; y: number; z: number }; distance: number; decay: number }> } | null; frame: number; duration: number; }

function LightRigComponent({ config, frame, duration }: LightRigComponentProps) {
  if (!config) { return (<> <ambientLight intensity={0.5} color="#ffffff" /> <directionalLight position={[5, 10, 7]} intensity={1} color="#fff5e6" castShadow><directionalLightShadow mapSizeWidth={2048} mapSizeHeight={2048} /></directionalLight> <directionalLight position={[-5, 5, -5]} intensity={0.5} color="#80b3ff" /> </>); }
  const progress = frame / duration; const intensity = 1 + Math.sin(progress * Math.PI * 2) * 0.2;
  return (<> {config.ambient && <ambientLight intensity={0.3 * intensity} color={\`rgb(\${config.ambient.r * 255}, \${config.ambient.g * 255}, \${config.ambient.b * 255)}\`} />} {config.directional?.map((light, i) => ( <directionalLight key={i} position={[light.position.x, light.position.y, light.position.z]} intensity={light.intensity * intensity} color={\`rgb(\${light.color.r * 255}, \${light.color.g * 255}, \${light.color.b * 255)}\`} castShadow><directionalLightShadow mapSizeWidth={2048} mapSizeHeight={2048} /></directionalLight> ))} {config.point?.map((light, i) => ( <pointLight key={i} position={[light.position.x, light.position.y, light.position.z]} intensity={light.intensity * intensity} color={\`rgb(\${light.color.r * 255}, \${light.color.g * 255}, \${light.color.b * 255)}\`} distance={light.distance} decay={light.decay} /> ))} </>);
}

interface SceneAssetsProps { assets: Array<{ id: string; type: string; src: string; name?: string; position?: [number, number, number]; rotation?: [number, number, number]; scale?: [number, number, number]; count?: number; size?: number; color?: number }>; animations: Array<{ id: string; type: string; target: string; property: string; from: unknown; to: unknown; durationFrames: number; delayFrames: number; easing: string; loop: boolean; yoyo: boolean }>; frame: number; time: number; progress: number; }

function SceneAssets({ assets, animations, frame, time, progress }: SceneAssetsProps) {
  return <> {assets.map((asset) => { switch (asset.type) { case "model": return <AnimatedModel key={asset.id} url={asset.src} assetId={asset.id} animations={animations.filter(a => a.target === asset.id)} position={asset.position || [0,0,0]} rotation={asset.rotation || [0,0,0]} scale={asset.scale || [1,1,1]} frame={frame} durationFrames={animations.find(a => a.target === asset.id)?.durationFrames || 30} />; case "shader": return <ShaderBackground key={asset.id} time={time} shaderUrl={asset.src} />; case "particle": return <ParticleSystem key={asset.id} count={asset.count || 1000} size={asset.size || 0.1} color={asset.color || 0xffffff} />; default: return null; } })} </>;
}

interface AnimatedModelProps { url: string; assetId: string; animations: Array<{ id: string; type: string; target: string; property: string; from: unknown; to: unknown; durationFrames: number; delayFrames: number; easing: string; loop: boolean; yoyo: boolean }>; position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number]; frame: number; durationFrames: number; }

function AnimatedModel({ url, assetId, animations, position, rotation, scale, frame, durationFrames }: AnimatedModelProps) {
  const { nodes, materials, animations: gltfAnimations } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<Map<string, THREE.AnimationAction>>(new Map());
  useFrame((state, delta) => { if (mixerRef.current) mixerRef.current.update(delta); });
  useFrame((state) => { if (gltfAnimations.length > 0 && !mixerRef.current && groupRef.current) { mixerRef.current = new THREE.AnimationMixer(groupRef.current); for (const clip of gltfAnimations) { const action = mixerRef.current.clipAction(clip); action.play(); actionsRef.current.set(clip.name, action); } } });
  useFrame(() => { if (!groupRef.current || animations.length === 0) return; for (const anim of animations) { const animProgress = ((frame - anim.delayFrames) / anim.durationFrames) % (anim.loop ? 1 : 1); if (animProgress >= 0 && animProgress <= 1) { const eased = easeProgress(animProgress, anim.easing); const finalProgress = anim.yoyo ? 1 - Math.abs(1 - eased * 2) : eased; applyAnimation(groupRef.current, anim, finalProgress); } } });
  return <group ref={groupRef} position={position} rotation={rotation} scale={scale} dispose={null}><primitive object={nodes} /></group>;
}

function applyAnimation(object: THREE.Object3D, anim: any, progress: number) { const value = interpolateValue(anim.from, anim.to, progress); const parts = anim.property.split("."); let target: any = object; for (let i = 0; i < parts.length - 1; i++) { target = target[parts[i]]; if (!target) return; } target[parts[parts.length - 1]] = value; }

function interpolateValue(from: unknown, to: unknown, t: number): number | { x: number; y: number; z: number } {
  if (typeof from === "number" && typeof to === "number") return from + (to - from) * t;
  if (typeof from === "object" && typeof to === "object" && from && to) {
    const f = from as { x?: number; y?: number; z?: number };
    const toObj = to as { x?: number; y?: number; z?: number };
    return { x: (f.x ?? 0) + ((toObj.x ?? 0) - (f.x ?? 0)) * t, y: (f.y ?? 0) + ((toObj.y ?? 0) - (f.y ?? 0)) * t, z: (f.z ?? 0) + ((toObj.z ?? 0) - (f.z ?? 0)) * t };
  }
  return 0;
}

function easeProgress(t: number, easing: string): number {
  const clamped = Math.max(0, Math.min(1, t));
  switch (easing) {
    case "linear": return clamped;
    case "easeIn": return clamped * clamped;
    case "easeOut": return 1 - (1 - clamped) * (1 - clamped);
    case "easeInOut": return clamped < 0.5 ? 2 * clamped * clamped : -1 + (4 - 2 * clamped) * clamped;
    case "easeInSine": return 1 - Math.cos((clamped * Math.PI) / 2);
    case "easeOutSine": return Math.sin((clamped * Math.PI) / 2);
    case "easeInOutSine": return -(Math.cos(Math.PI * clamped) - 1) / 2;
    case "easeInQuad": return clamped * clamped;
    case "easeOutQuad": return 1 - (1 - clamped) * (1 - clamped);
    case "easeInOutQuad": return clamped < 0.5 ? 2 * clamped * clamped : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
    case "easeInCubic": return clamped * clamped * clamped;
    case "easeOutCubic": return 1 - Math.pow(1 - clamped, 3);
    case "easeInOutCubic": return clamped < 0.5 ? 4 * clamped * clamped * clamped : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
    case "easeOutElastic": { const c4 = (2 * Math.PI) / 3; return clamped === 0 ? 0 : clamped === 1 ? 1 : Math.pow(2, -10 * clamped) * Math.sin((clamped * 10 - 0.75) * c4) + 1; }
    case "easeOutBounce": { const n1 = 7.5625, d1 = 2.75; if (clamped < 1/d1) return n1*clamped*clamped; if (clamped < 2/d1) return n1*(clamped-=1.5/d1)*clamped+0.75; if (clamped < 2.5/d1) return n1*(clamped-=2.25/d1)*clamped+0.9375; return n1*(clamped-=2.625/d1)*clamped+0.984375; }
    default: return clamped < 0.5 ? 2 * clamped * clamped : -1 + (4 - 2 * clamped) * clamped;
  }
}

interface ShaderBackgroundProps { time: number; shaderUrl?: string; }

function ShaderBackground({ time, shaderUrl }: ShaderBackgroundProps) {
  const materialRef = useRef<THREE.ShaderMaterial>();
  useEffect(() => {
    const fragmentShader = shaderUrl ? "// Loaded from " + shaderUrl : "uniform float uTime; uniform vec2 uResolution; varying vec2 vUv; float noise(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); } void main() { vec2 uv = vUv * 2.0 - 1.0; uv.x *= uResolution.x / uResolution.y; float n = noise(uv * 10.0 + uTime * 0.1); vec3 col = mix(vec3(0.02, 0.02, 0.05), vec3(0.1, 0.05, 0.15), n); gl_FragColor = vec4(col, 1.0); }";
    materialRef.current = new THREE.ShaderMaterial({ uniforms: { uTime: { value: time }, uResolution: { value: new THREE.Vector2() } }, vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }", fragmentShader });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), materialRef.current); plane.renderOrder = -1;
    return () => { materialRef.current?.dispose(); };
  }, [shaderUrl]);
  useFrame(() => { if (materialRef.current && materialRef.current.uniforms.uTime) materialRef.current.uniforms.uTime.value = time; });
  return <primitive object={new THREE.Mesh(new THREE.PlaneGeometry(2, 2), materialRef.current)} />;
}

interface ParticleSystemComponentProps { count?: number; size?: number; color?: number; }

function ParticleSystemComponent({ count = 1000, size = 0.1, color = 0xffffff }: ParticleSystemComponentProps) {
  const positionsRef = useRef<Float32Array>(); const geometryRef = useRef<THREE.BufferGeometry>(); const materialRef = useRef<THREE.PointsMaterial>(); const pointsRef = useRef<THREE.Points>();
  useEffect(() => { const positions = new Float32Array(count * 3); const colors = new Float32Array(count * 3); const sizes = new Float32Array(count); for (let i = 0; i < count; i++) { positions[i*3] = (Math.random()-0.5)*20; positions[i*3+1] = (Math.random()-0.5)*20; positions[i*3+2] = (Math.random()-0.5)*20; const c = new THREE.Color(color); colors[i*3]=c.r; colors[i*3+1]=c.g; colors[i*3+2]=c.b; sizes[i]=Math.random()*size; } const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3)); geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3)); geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1)); const material = new THREE.PointsMaterial({ size, vertexColors: true, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }); const points = new THREE.Points(geometry, material); pointsRef.current = points; geometryRef.current = geometry; materialRef.current = material; positionsRef.current = positions; return () => { geometry.dispose(); material.dispose(); }; }, [count, size, color]);
  useFrame((_: any, delta: number) => { const positions = positionsRef.current; const geometry = geometryRef.current; if (!positions || !geometry) return; for (let i = 0; i < count; i++) { const idx = i * 3 + 1; const val = positions[idx]! + delta * 0.5; positions[idx] = val > 10 ? -10 : val; } geometry.attributes.position!.needsUpdate = true; });
  return <primitive object={pointsRef.current} />;
}

function MotionBlur({ strength }: { strength: number }) { return null; }
function FilmGrain({ strength }: { strength: number }) { return null; }

export const CameraRig = CameraRigComponent;
export const LightRig = LightRigComponent;
export const GLTFModel = AnimatedModel;
export const ParticleSystem = ParticleSystemComponent;
export const ShaderBackground = ShaderBackground;
`;
}

// ============================================================================
// Root Generator
// ============================================================================

function generateRoot(spec: VideoSpec, id: string, opts: GenerationOptions): string {
  const hasVertical = spec.aspectRatio === "9:16" || ["tiktok", "reels", "shorts"].includes(spec.targetPlatform);
  const hasSquare = spec.aspectRatio === "1:1";

  const exports = ["RemotionComposition"];
  if (hasVertical) exports.push("VerticalVideo");
  if (hasSquare) exports.push("SquareVideo");
  exports.push("PreviewVideo");

  return `import { registerRoot } from "remotion";
import { ${exports.join(", ")} } from "./compositions/MainVideo";

registerRoot(RemotionComposition);

export { ${exports.join(", ")} };
`;
}

// ============================================================================
// Utility Functions
// ============================================================================

function getDimensions(aspectRatio: string): { width: number; height: number } {
  switch (aspectRatio) {
    case "9:16": return { width: 1080, height: 1920 };
    case "1:1": return { width: 1080, height: 1080 };
    case "4:3": return { width: 1440, height: 1080 };
    case "21:9": return { width: 2560, height: 1080 };
    default: return { width: 1920, height: 1080 };
  }
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function toValidIdentifier(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/^[0-9]/, "_$&");
}

function getPrimaryColor(palette?: StyleManifest["colorPalette"]): string {
  if (!palette || !palette.primary || palette.primary.length === 0) return "#00ff88";
  const c = palette.primary[0];
  return `rgb(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)})`;
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createCodeGenerator(spec: VideoSpec, options?: Partial<GenerationOptions>) {
  return { generate: () => generateCode(spec, options), save: async () => saveGeneratedFiles(await generateCode(spec, options), spec, options) };
}

export default { generateCode, saveGeneratedFiles, createCodeGenerator };