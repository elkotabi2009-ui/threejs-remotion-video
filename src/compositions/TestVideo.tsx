import { Composition, AbsoluteFill, useVideoConfig } from "remotion";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls, Html, ContactShadows, Environment } from "@react-three/drei";
import { useRemotionTiming, useInterpolate } from "@/hooks/useRemotion";

export function TestVideo({ width, height }: { width: number; height: number }) {
  const { frame, fps, durationInFrames } = useVideoConfig();
  const { progress } = useRemotionTiming();

  const rotation = useInterpolate(
    [{ frame: 0, value: 0 }, { frame: durationInFrames, value: Math.PI * 2 }],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ background: "#0a0a0f" }}>
      <Canvas
        camera={{ position: [0, 2, 5], fov: 50, near: 0.1, far: 1000 }}
        gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }}
        style={{ width, height }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1;
        }}
      >
        <Environment preset="city" background={false} />

        <group rotation={[0, rotation, 0]}>
          {/* Neon spinning cube */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[2, 2, 2]} />
            <meshPhysicalMaterial
              color="#e94560"
              metalness={0.3}
              roughness={0.4}
              transmission={0.3}
              thickness={0.5}
              clearcoat={1}
              clearcoatRoughness={0.1}
            />
          </mesh>

          {/* Inner glow */}
          <mesh>
            <boxGeometry args={[2.2, 2.2, 2.2]} />
            <meshBasicMaterial
              color="#ff00ff"
              transparent
              opacity={0.1}
              side={THREE.BackSide}
            />
          </mesh>
        </group>

        <directionalLight
          position={[5, 10, 7]}
          intensity={2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.1}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <ambientLight intensity={0.5} color="#ffffff" />
        <pointLight position={[-5, 5, -5]} intensity={1} color="#00ffff" />
        <ContactShadows opacity={0.5} scale={10} blur={2} color="#000000" />

        <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} />

        {/* Text overlay */}
        <Html
          position={[0, 3, 0]}
          style={{
            color: 'white',
            fontSize: '48px',
            fontWeight: 'bold',
            textShadow: '0 0 20px #e94560',
            pointerEvents: 'none',
            fontFamily: 'system-ui',
          }}
          center
        >
          TEST VIDEO
        </Html>

        <Html
          position={[0, -2.5, 0]}
          style={{
            color: '#888',
            fontSize: '24px',
            pointerEvents: 'none',
            fontFamily: 'system-ui',
          }}
          center
        >
          Three.js + Remotion Pipeline
        </Html>
      </Canvas>
    </AbsoluteFill>
  );
}

export const TestVideoComposition: React.FC = () => {
  return (
    <Composition
      id="test-video"
      component={TestVideo}
      durationInFrames={90}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ width: 1080, height: 1920 }}
    />
  );
};

export const TestVideoSquare: React.FC = () => {
  return (
    <Composition
      id="test-video-square"
      component={TestVideo}
      durationInFrames={90}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={{ width: 1080, height: 1080 }}
    />
  );
};

export const TestVideoLandscape: React.FC = () => {
  return (
    <Composition
      id="test-video-landscape"
      component={TestVideo}
      durationInFrames={90}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ width: 1920, height: 1080 }}
    />
  );
};