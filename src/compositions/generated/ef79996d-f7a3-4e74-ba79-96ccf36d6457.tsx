import { Composition, AbsoluteFill, useVideoConfig, OffthreadVideo } from "remotion";
import { Scene3D, CameraRig, LightRig, GLTFModel, ParticleSystem, ShaderBackground } from "@/scenes/Scene3D";
import { AudioVisualizer } from "@/components/AudioVisualizer";
import { CaptionOverlay, DynamicText } from "@/components/CaptionOverlay";
import { Timeline } from "@/timeline/Timeline";
import { Transition, useTransition } from "@/editing/transitions";
import { useTimelineStore } from "@/store/timelineStore";
import { useAudioStore } from "@/store/audioStore";
import { useRemotionTiming, useInterpolate, useInterpolateVec3, useSequence, useTimeRange } from "@/hooks/useRemotion";
import { useMemo, useRef, useEffect } from "react";

export const MainVideo: React.FC = () => {
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const { frame, time, progress } = useRemotionTiming();
  const { tracks, inPoint, outPoint } = useTimelineStore();
  const { tracks: audioTracks, masterVolume } = useAudioStore();

  const videoTracks = useMemo(() => tracks.filter(t => t.type === "video"), [tracks]);
  const threeTracks = useMemo(() => tracks.filter(t => t.type === "3d"), [tracks]);
  const textTracks = useMemo(() => tracks.filter(t => t.type === "text"), [tracks]);

  const sceneSequence = useMemo(() => {
    return [{id:"scene-mw81xe33-n6hs3ln",name:"Scene 1",type:"3d",startFrame:0,endFrame:300},{id:"scene-mw81xe34-jgw4tok",name:"Scene 2",type:"3d",startFrame:300,endFrame:300},{id:"scene-mw81xe34-4smmkdy",name:"Scene 3",type:"3d",startFrame:330,endFrame:300},{id:"scene-mw81xe35-ymegap4",name:"Scene 4",type:"3d",startFrame:360,endFrame:300},{id:"scene-mw81xe35-8hdjksj",name:"Scene 5",type:"text",startFrame:390,endFrame:300}];
  }, []);

  const activeScene = useMemo(() => {
    return sceneSequence.find(s => frame >= s.startFrame && frame < s.endFrame) || sceneSequence[0];
  }, [sceneSequence, frame]);

  const sceneProgress = useMemo(() => {
    if (!activeScene) return 0;
    return (frame - activeScene.startFrame) / (activeScene.endFrame - activeScene.startFrame);
  }, [activeScene, frame]);

  return (
    <AbsoluteFill style={{ background: "rgb(26, 26, 46)" }}>
      {threeTracks.map((track) => (
        <OffthreadVideo key={track.id} src="three-scene" durationInFrames={durationInFrames}>
          <Generated3DScene
            width={width}
            height={height}
            sceneSpec={activeScene}
            frame={frame}
            progress={sceneProgress}
            sceneManifest={[{id:"scene-mw81xe33-n6hs3ln",name:"Scene 1",type:"3d",startFrame:0,endFrame:300,durationFrames:300,assets:[{id:"asset-mw81xe34-4t4nugb-model",type:"model",src:"./assets/models/default.glb",name:"Main 3D Model",sceneId:"scene-mw81xe33-n6hs3ln",required:true}],animations:[{id:"anim-mw81xe34-8n9gfib-rotation",type:"rotation",target:"main",property:"rotation.y",from:0,to:6.283185307179586,durationFrames:300,delayFrames:0,easing:"linear",loop:true,yoyo:false}],transitions:[],camera:{position:{x:0,y:2,z:5},target:{x:0,y:0,z:0},fov:50,near:0.1,far:1000},lighting:{ambient:{r:0.3,g:0.3,b:0.35},directional:[{color:{r:1,g:0.95,b:0.9},intensity:1,position:{x:5,y:10,z:7}},{color:{r:0.5,g:0.7,b:1},intensity:0.5,position:{x:-5,y:5,z:-5}}]}},{id:"scene-mw81xe34-jgw4tok",name:"Scene 2",type:"3d",startFrame:300,endFrame:300,durationFrames:0,assets:[{id:"asset-mw81xe34-phci07r-model",type:"model",src:"./assets/models/default.glb",name:"Main 3D Model",sceneId:"scene-mw81xe34-jgw4tok",required:true}],animations:[{id:"anim-mw81xe34-zehlsmg-rotation",type:"rotation",target:"main",property:"rotation.y",from:0,to:6.283185307179586,durationFrames:30,delayFrames:0,easing:"easeInOut",loop:true,yoyo:false}],transitions:[{id:"trans-mw81xe34-rn5abzd-fade",type:"fade",durationFrames:15,easing:"easeInOut",direction:"both"}],camera:{position:{x:0,y:2,z:5},target:{x:0,y:0,z:0},fov:50,near:0.1,far:1000},lighting:{ambient:{r:0.3,g:0.3,b:0.35},directional:[{color:{r:1,g:0.95,b:0.9},intensity:1,position:{x:5,y:10,z:7}},{color:{r:0.5,g:0.7,b:1},intensity:0.5,position:{x:-5,y:5,z:-5}}]}},{id:"scene-mw81xe34-4smmkdy",name:"Scene 3",type:"3d",startFrame:330,endFrame:300,durationFrames:-30,assets:[{id:"asset-mw81xe34-j099rkv-model",type:"model",src:"./assets/models/default.glb",name:"Main 3D Model",sceneId:"scene-mw81xe34-4smmkdy",required:true},{id:"asset-mw81xe34-j099rkv-particles",type:"shader",src:"./assets/shaders/particles.glsl",name:"Particle System",sceneId:"scene-mw81xe34-4smmkdy",required:true}],animations:[{id:"anim-mw81xe34-ehwuaf0-particle",type:"particle",target:"main",property:"particle",from:0,to:1,durationFrames:30,delayFrames:0,easing:"easeInOut",loop:true,yoyo:false}],transitions:[{id:"trans-mw81xe35-ekoqt2a-fade",type:"fade",durationFrames:15,easing:"easeInOut",direction:"both"}],camera:{position:{x:0,y:2,z:5},target:{x:0,y:0,z:0},fov:50,near:0.1,far:1000},lighting:{ambient:{r:0.3,g:0.3,b:0.35},directional:[{color:{r:1,g:0.95,b:0.9},intensity:1,position:{x:5,y:10,z:7}},{color:{r:0.5,g:0.7,b:1},intensity:0.5,position:{x:-5,y:5,z:-5}}]}},{id:"scene-mw81xe35-ymegap4",name:"Scene 4",type:"3d",startFrame:360,endFrame:300,durationFrames:-60,assets:[{id:"asset-mw81xe35-nzmnd2o-model",type:"model",src:"./assets/models/default.glb",name:"Main 3D Model",sceneId:"scene-mw81xe35-ymegap4",required:true}],animations:[{id:"anim-mw81xe35-cughipz-rotation",type:"rotation",target:"main",property:"rotation.y",from:0,to:6.283185307179586,durationFrames:30,delayFrames:0,easing:"linear",loop:true,yoyo:false}],transitions:[{id:"trans-mw81xe35-le0s45c-fade",type:"fade",durationFrames:15,easing:"easeInOut",direction:"both"}],camera:{position:{x:0,y:2,z:5},target:{x:0,y:0,z:0},fov:50,near:0.1,far:1000},lighting:{ambient:{r:0.3,g:0.3,b:0.35},directional:[{color:{r:1,g:0.95,b:0.9},intensity:1,position:{x:5,y:10,z:7}},{color:{r:0.5,g:0.7,b:1},intensity:0.5,position:{x:-5,y:5,z:-5}}]}}]}
          />
        </OffthreadVideo>
      ))}
      // No video scenes
      {
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
      }
      {
        <AudioVisualizer
          tracks={audioTracks}
          width={width}
          height={200}
          position="bottom"
          style="bars"
          color="rgb(26, 26, 46)"
        />
      }
      {
        <Timeline
          width={width}
          height={100}
          position="bottom"
        />
      }
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
          duration={sceneSpec?.durationFrames || 300}
          position={cameraPosition}
          target={camera.target ? useInterpolateVec3([
            { frame: 0, value: camera.target }, { frame: 1, value: camera.target },
          ]) : { x: 0, y: 0, z: 0 }}
        />
      )}
      <LightRig frame={frame} duration={sceneSpec?.durationFrames || 300} config={lighting} />
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

export const Ef79996d-f7a3-4e74-ba79-96ccf36d6457-main: React.FC = () => {
  return <Composition id="ef79996d-f7a3-4e74-ba79-96ccf36d6457-main" component={MainVideo} durationInFrames=300 fps=30 width={1920} height={1080} defaultProps={{}} />;
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
  return `rgb(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)})`;
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
