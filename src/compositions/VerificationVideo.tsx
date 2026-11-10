import { Composition, AbsoluteFill, useVideoConfig, useCurrentFrame, interpolate } from "remotion";

export function VerificationVideo() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  // Progress 0 to 1
  const progress = interpolate(
    frame,
    [0, durationInFrames],
    [0, 1]
  );

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "white",
        width: width,
        height: height,
      }}
    >
      {/* Title */}
      <div
        style={{
          fontSize: "64px",
          fontWeight: "800",
          background: "linear-gradient(90deg, #ff6b6b, #4ecdc4, #45b7d1, #96c93d)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          textAlign: "center",
          marginBottom: "20px",
        }}
      >
        PIPELINE OK ✅
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: "24px",
          color: "#aaa",
          textAlign: "center",
          marginBottom: "40px",
        }}
      >
        GitHub Actions + Remotion + Xvfb (No Three.js)
      </div>

      {/* Frame info */}
      <div
        style={{
          fontSize: "18px",
          color: "#4ecdc4",
          fontFamily: "monospace",
          textAlign: "center",
          marginBottom: "40px",
        }}
      >
        Frame: {frame} / {durationInFrames}  •  {width}x{height} @ {fps}fps
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: "60%",
          maxWidth: "400px",
          height: "8px",
          background: "#222",
          borderRadius: "4px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            background: "linear-gradient(90deg, #ff6b6b, #4ecdc4)",
            borderRadius: "4px",
          }}
        />
      </div>

      {/* Render time */}
      <div
        style={{
          marginTop: "20px",
          fontSize: "16px",
          color: "#666",
          textAlign: "center",
        }}
      >
        Render time: {(frame / fps).toFixed(2)}s / {(durationInFrames / fps).toFixed(2)}s
      </div>
    </AbsoluteFill>
  );
}

export const VerificationVideoComposition: React.FC = () => {
  return (
    <Composition
      id="verification-video"
      component={VerificationVideo}
      durationInFrames={10}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{}}
    />
  );
};

export const VerificationVideoSquare: React.FC = () => {
  return (
    <Composition
      id="verification-video-square"
      component={VerificationVideo}
      durationInFrames={10}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={{}}
    />
  );
};

export const VerificationVideoLandscape: React.FC = () => {
  return (
    <Composition
      id="verification-video-landscape"
      component={VerificationVideo}
      durationInFrames={10}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{}}
    />
  );
};