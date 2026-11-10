import { Composition, AbsoluteFill, useVideoConfig, useCurrentFrame } from "remotion";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { Html, Environment } from "@react-three/drei";
import { useRemotionTiming, useInterpolate } from "@/hooks/useRemotion";

export function TestVideo({ width, height }: { width: number; height: number }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { progress } = useRemotionTiming();

  const rotation = useInterpolate(
    [{ frame: 0, value: 0 }, { frame: durationInFrames, value: Math.PI * 2 }],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const colorShift = useInterpolate(
    [
      { frame: 0, value: 0 },
      { frame: durationInFrames / 3, value: 1 },
      { frame: 2 * durationInFrames / 3, value: 0.5 },
      { frame: durationInFrames, value: 0 }
    ],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const hue = (colorShift * 360) % 360;
  const color = `hsl(${hue}, 80%, 55%)`;
  const glowColor = `hsl(${hue}, 80%, 65%)`;

  return (
    <AbsoluteFill style={{ background: "#050508" }}>
      <Canvas
        camera={{ position: [0, 1.5, 5], fov: 50, near: 0.1, far: 100 }}
        gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }}
        style={{ width, height }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          gl.shadowMap.enabled = false;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1;
        }}
      >
        <Environment preset="city" background={false} ground={false} />

        <group rotation={[0, rotation, rotation * 0.7]}>
          {/* Main cube */}
          <mesh position={[-2, 0, 0]}>
            <boxGeometry args={[1.5, 1.5, 1.5]} />
            <meshPhysicalMaterial
              color={color}
              metalness={0.3}
              roughness={0.2}
              transmission={0.2}
              thickness={0.3}
              clearcoat={1}
              clearcoatRoughness={0.1}
            />
          </mesh>

          {/* Wireframe cube */}
          <mesh position={[2, 0, 0]} castShadow={false} receiveShadow={false}>
            <boxGeometry args={[1.5, 1.5, 1.5]} />
            <meshBasicMaterial color={glowColor} wireframe transparent opacity={0.6} />
          </mesh>

          {/* Center sphere */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.8, 32, 32]} />
            <meshBasicMaterial
              color={glowColor}
              transparent
              opacity={0.3}
            />
          </mesh>
        </group>

        <directionalLight position={[5, 10, 7]} intensity={1.5} color="#ffffff" />
        <ambientLight intensity={0.3} color="#ffffff" />
        <pointLight position={[-5, 5, -5]} intensity={1} color={glowColor} />

        {/* Text overlay */}
        <Html
          position={[0, 3.5, 0]}
          style={{
            color: 'white',
            fontSize: '48px',
            fontWeight: '800',
            textShadow: `0 0 30px ${glowColor}, 0 0 60px ${glowColor}`,
            pointerEvents: 'none',
            fontFamily: 'system-ui, sans-serif',
            letterSpacing: '0.05em',
          }}
          center
        >
          TEST VIDEO
        </Html>

        <Html
          position={[0, -2, 0]}
          style={{
            color: glowColor,
            fontSize: '22px',
            fontWeight: '500',
            pointerEvents: 'none',
            fontFamily: 'system-ui, sans-serif',
          }}
          center
        >
          Three.js + Remotion Pipeline
        </Html>

        <Html
          position={[0, -3.5, 0]}
          style={{
            color: '#666',
            fontSize: '16px',
            fontFamily: 'monospace',
            pointerEvents: 'none',
          }}
          center
        >
          Frame: {frame} / {durationInFrames}  •  {width}x{height} @ {fps}fps
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