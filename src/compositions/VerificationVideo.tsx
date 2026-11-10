import { Composition, AbsoluteFill, useVideoConfig } from "remotion";
import { Html } from "@react-three/drei";

export function VerificationVideo({ width, height }: { width: number; height: number }) {
  const { frame, fps, durationInFrames, width: videoWidth, height: videoHeight } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: "#0a0a0f" }}>
      <div style={{
        width: videoWidth,
        height: videoHeight,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        color: 'white',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)'
      }}>
        <Html
          style={{
            fontSize: '64px',
            fontWeight: '800',
            background: 'linear-gradient(90deg, #ff6b6b, #4ecdc4, #45b7d1, #96c93d)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textAlign: 'center',
            marginBottom: '20px'
          }}
          center
        >
          PIPELINE OK ✅
        </Html>

        <Html
          style={{
            fontSize: '24px',
            color: '#aaa',
            textAlign: 'center',
            marginBottom: '40px'
          }}
          center
        >
          GitHub Actions + Remotion + Three.js + Xvfb
        </Html>

        <Html
          style={{
            fontSize: '18px',
            color: '#4ecdc4',
            fontFamily: 'monospace',
            textAlign: 'center'
          }}
          center
        >
          Frame: {frame} / {durationInFrames}  •  {videoWidth}x{videoHeight} @ {fps}fps
        </Html>

        <div style={{
          marginTop: '60px',
          width: '60%',
          height: '8px',
          background: '#222',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${(frame / durationInFrames) * 100}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #ff6b6b, #4ecdc4)',
            borderRadius: '4px',
            transition: 'width 0.1s linear'
          }} />
        </div>

        <Html
          style={{
            marginTop: '20px',
            fontSize: '16px',
            color: '#666',
            textAlign: 'center'
          }}
          center
        >
          Render time: {(frame / fps).toFixed(1)}s / {(durationInFrames / fps).toFixed(1)}s
        </Html>
      </div>
    </AbsoluteFill>
  );
}

export const VerificationVideoComposition: React.FC = () => {
  return (
    <Composition
      id="verification-video"
      component={VerificationVideo}
      durationInFrames={30}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ width: 1080, height: 1920 }}
    />
  );
};

export const VerificationVideoSquare: React.FC = () => {
  return (
    <Composition
      id="verification-video-square"
      component={VerificationVideo}
      durationInFrames={30}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={{ width: 1080, height: 1080 }}
    />
  );
};

export const VerificationVideoLandscape: React.FC = () => {
  return (
    <Composition
      id="verification-video-landscape"
      component={VerificationVideo}
      durationInFrames={30}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ width: 1920, height: 1080 }}
    />
  );
};