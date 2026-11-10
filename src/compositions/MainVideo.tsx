import { Composition, AbsoluteFill, useVideoConfig, OffthreadVideo } from "remotion";
import { Scene3D } from "@/scenes/Scene3D";
import { AudioVisualizer } from "@/components/AudioVisualizer";
import { CaptionOverlay } from "@/components/CaptionOverlay";
import { Timeline } from "@/timeline/Timeline";
import { useTimelineStore } from "@/store/timelineStore";
import { useAudioStore } from "@/store/audioStore";
import { useRemotionTiming, useTimeRange } from "@/hooks/useRemotion";
import { useMemo } from "react";

export const MainVideo: React.FC = () => {
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const { frame, time } = useRemotionTiming();
  const { tracks, inPoint, outPoint } = useTimelineStore();
  const { tracks: audioTracks, masterVolume } = useAudioStore();

  const videoTracks = useMemo(() => tracks.filter(t => t.type === "video"), [tracks]);
  const threeTracks = useMemo(() => tracks.filter(t => t.type === "3d"), [tracks]);
  const textTracks = useMemo(() => tracks.filter(t => t.type === "text"), [tracks]);

  return (
    <AbsoluteFill style={{ background: "#0a0a0f" }}>
      {threeTracks.map((track) => (
        <OffthreadVideo key={track.id} src="three-scene" durationInFrames={durationInFrames}>
          <Scene3D
            width={width}
            height={height}
            onFrame={(frame, delta) => {
              console.log(`3D Track ${track.id}: frame ${frame}`);
            }}
          />
        </OffthreadVideo>
      ))}

      {videoTracks.map((track) => (
        <TimeRangeTrack key={track.id} track={track} />
      ))}

      {textTracks.map((track) => (
        <CaptionOverlay
          key={track.id}
          track={track}
          width={width}
          height={height}
        />
      ))}

      <AudioVisualizer
        tracks={audioTracks}
        width={width}
        height={200}
        position="bottom"
      />

      <Timeline
        width={width}
        height={100}
        position="bottom"
      />
    </AbsoluteFill>
  );
};

function TimeRangeTrack({ track }: { track: any }) {
  const { frame } = useRemotionTiming();
  const { active, progress } = useTimeRange(track.keyframes[0]?.frame || 0, track.keyframes[track.keyframes.length - 1]?.frame || 0);

  if (!active) return null;

  return (
    <AbsoluteFill
      style={{
        opacity: 1,
        mixBlendMode: track.blendMode,
      }}
    >
      {track.content}
    </AbsoluteFill>
  );
}

export const RemotionComposition: React.FC = () => {
  return (
    <Composition
      id="main-video"
      component={MainVideo}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{}}
    />
  );
};

export const VerticalVideo: React.FC = () => {
  return (
    <Composition
      id="vertical-video"
      component={MainVideo}
      durationInFrames={180}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{}}
    />
  );
};

export const SquareVideo: React.FC = () => {
  return (
    <Composition
      id="square-video"
      component={MainVideo}
      durationInFrames={180}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={{}}
    />
  );
};

export const PreviewVideo: React.FC = () => {
  return (
    <Composition
      id="preview-video"
      component={MainVideo}
      durationInFrames={60}
      fps={30}
      width={1280}
      height={720}
      defaultProps={{}}
    />
  );
};