import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import { OrbitControls, Environment, Html, ContactShadows, Effects, Bloom, Vignette, ChromaticAberration, DepthOfField } from "@react-three/drei";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useRef, useEffect, Suspense } from "react";
import { useRemotionTiming, useInterpolate, useInterpolateVec3, useTimeRange } from "@/hooks/useRemotion";

extend(THREE);

interface Ef79996d_f7a3_4e74_ba79_96ccf36d6457SceneProps {
  width: number;
  height: number;
  frame?: number;
  progress?: number;
  sceneSpec?: any;
}

export const Ef79996d_f7a3_4e74_ba79_96ccf36d6457Scene: React.FC<Ef79996d_f7a3_4e74_ba79_96ccf36d6457SceneProps> = ({
  width, height, frame: frameProp, progress: progressProp, sceneSpec,
}) => {
  const { frame, time, progress } = useRemotionTiming();
  const currentFrame = frameProp ?? frame;
  const currentProgress = progressProp ?? progress;

  const cameraConfig = useMemo(() => {
    const cam = sceneSpec?.camera || {position:{x:0,y:2,z:5},target:{x:0,y:0,z:0},fov:50,near:0.1,far:1000};
    if (!cam) return null;
    return { position: new THREE.Vector3(cam.position?.x || 0, cam.position?.y || 2, cam.position?.z || 5), target: new THREE.Vector3(cam.target?.x || 0, cam.target?.y || 0, cam.target?.z || 0), fov: cam.fov || 50, near: cam.near || 0.1, far: cam.far || 1000 };
  }, [sceneSpec?.camera]);

  const lightingConfig = useMemo(() => {ambient:{r:0.3,g:0.3,b:0.35},directional:[{color:{r:1,g:0.95,b:0.9},intensity:1,position:{x:5,y:10,z:7}},{color:{r:0.5,g:0.7,b:1},intensity:0.5,position:{x:-5,y:5,z:-5}}]}, []);
  const assets = useMemo(() => [{id:"asset-mw81xe34-4t4nugb-model",type:"model",src:"./assets/models/default.glb",name:"Main 3D Model",sceneId:"scene-mw81xe33-n6hs3ln",required:true}], []);
  const animations = useMemo(() => [{id:"anim-mw81xe34-8n9gfib-rotation",type:"rotation",target:"main",property:"rotation.y",from:0,to:6.283185307179586,durationFrames:300,delayFrames:0,easing:"linear",loop:true,yoyo:false}], []);
  const postProcessing = {bloom:{enabled:false,strength:0.5,radius:0.5,threshold:0.8},colorGrading:{enabled:true,exposure:0,contrast:1.1,saturation:1.1,temperature:0,tint:0},vignette:{enabled:false,darkness:0.3,offset:0}};
  const environmentPreset = "studio" as "studio" | "apartment" | "city" | "dawn" | "forest" | "lobby" | "night" | "park" | "sunset" | "warehouse";

  return (
    <Canvas
      camera={cameraConfig ? { position: cameraConfig.position.toArray(), fov: cameraConfig.fov, near: cameraConfig.near, far: cameraConfig.far } : { position: [0, 2, 5], fov: 50 }}
      style={{ width, height }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => { gl.setPixelRatio(Math.min(window.devicePixelRatio, 2)); gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFSoftShadowMap; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1; }}
    >
      <Suspense fallback={null}>
        <CameraRigComponent config={cameraConfig} frame={currentFrame} duration=300 />
        <LightRigComponent config={lightingConfig} frame={currentFrame} duration=300 />
        <SceneAssets assets={assets} animations={animations} frame={currentFrame} time={time} progress={currentProgress} />
        { postProcessing && ( <Effects multisampling={8}> {postProcessing.bloom?.enabled && ( <Bloom intensity={postProcessing.bloom.strength} radius={postProcessing.bloom.radius} threshold={postProcessing.bloom.threshold} /> )} {postProcessing.depthOfField?.enabled && ( <DepthOfField focusDistance={postProcessing.depthOfField.focusDistance} aperture={postProcessing.depthOfField.aperture} maxBlur={postProcessing.depthOfField.maxBlur} /> )} {postProcessing.motionBlur?.enabled && ( <MotionBlur strength={postProcessing.motionBlur.strength} /> )} {postProcessing.vignette?.enabled && ( <Vignette darkness={postProcessing.vignette.darkness} offset={postProcessing.vignette.offset} /> )} {postProcessing.filmGrain?.enabled && ( <FilmGrain strength={postProcessing.filmGrain.strength} /> )} {postProcessing.chromaticAberration?.enabled && ( <ChromaticAberration offset={postProcessing.chromaticAberration.offset} /> )} </Effects> ) }
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
    const cameraStyle = "static";
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
  return (<> {config.ambient && <ambientLight intensity={0.3 * intensity} color={`rgb(${config.ambient.r * 255}, ${config.ambient.g * 255}, ${config.ambient.b * 255)}`} />} {config.directional?.map((light, i) => ( <directionalLight key={i} position={[light.position.x, light.position.y, light.position.z]} intensity={light.intensity * intensity} color={`rgb(${light.color.r * 255}, ${light.color.g * 255}, ${light.color.b * 255)}`} castShadow><directionalLightShadow mapSizeWidth={2048} mapSizeHeight={2048} /></directionalLight> ))} {config.point?.map((light, i) => ( <pointLight key={i} position={[light.position.x, light.position.y, light.position.z]} intensity={light.intensity * intensity} color={`rgb(${light.color.r * 255}, ${light.color.g * 255}, ${light.color.b * 255)}`} distance={light.distance} decay={light.decay} /> ))} </>);
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
