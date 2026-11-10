import React from "react";
import { Composition, AbsoluteFill } from "remotion";
import { Scene3D } from "./scenes/Scene3D";
import { AudioVisualizer } from "./components/AudioVisualizer";
import { CaptionOverlay } from "./components/CaptionOverlay";

export const ThreeDVideoComposition: React.FC = () => {
  return (
    <AbsoluteFill>
      <Scene3D width={1920} height={1080} />
      <AudioVisualizer
        tracks={[]}
        width={1920}
        height={200}
        position="bottom"
      />
      <CaptionOverlay
        track={{
          id: "captions",
          name: "Captions",
          type: "text",
          keyframes: [],
          enabled: true,
          muted: false,
          locked: false,
          opacity: 1,
          blendMode: "normal",
        }}
        width={1920}
        height={1080}
      />
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => {
  return (
    <Composition
      id="threejs-video"
      component={ThreeDVideoComposition}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{}}
    />
  );
};

export default Root;