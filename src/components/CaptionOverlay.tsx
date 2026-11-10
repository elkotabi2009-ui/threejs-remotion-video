"use client";

import { AbsoluteFill, useVideoConfig } from "remotion";
import { useRemotionTiming, useInterpolate, useTimeRange } from "@/hooks/useRemotion";
import type { Track, Keyframe } from "@/types";
import { useMemo } from "react";

interface CaptionOverlayProps {
  track: Track;
  width: number;
  height: number;
  style?: "default" | "karaoke" | "typewriter" | "highlight" | "box";
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  outlineColor?: string;
  outlineWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  position?: "top" | "center" | "bottom";
  animation?: "fade" | "slide" | "scale" | "none";
}

export function CaptionOverlay({
  track,
  width,
  height,
  style = "default",
  fontSize = 64,
  fontFamily = "Inter, system-ui, sans-serif",
  color = "#ffffff",
  backgroundColor = "rgba(0, 0, 0, 0.7)",
  outlineColor = "#000000",
  outlineWidth = 2,
  shadowColor = "rgba(0, 0, 0, 0.5)",
  shadowBlur = 4,
  shadowOffsetX = 2,
  shadowOffsetY = 2,
  position = "bottom",
  animation = "fade",
}: CaptionOverlayProps) {
  const { fps } = useVideoConfig();
  const { frame, time, progress } = useRemotionTiming();
  const { active, progress: trackProgress } = useTimeRange(
    track.keyframes[0]?.frame || 0,
    track.keyframes[track.keyframes.length - 1]?.frame || 0
  );

  if (!active) return null;

  const keyframes = track.keyframes as Keyframe<string>[];
  const textKeyframes = keyframes.filter(k => typeof k.value === "string");

  const currentText = useInterpolate(
    textKeyframes.map(k => ({ frame: k.frame, value: k.value.length })),
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const currentTextIndex = Math.floor(currentText);
  const text = textKeyframes[currentTextIndex]?.value || "";

  const positions = useMemo(() => {
    const padding = 80;
    switch (position) {
      case "top":
        return { top: padding, left: padding, right: padding };
      case "center":
        return { top: "50%", left: padding, right: padding, transform: "translateY(-50%)" };
      case "bottom":
        return { bottom: padding, left: padding, right: padding };
    }
  }, [position, width]);

  const animStyle = useMemo(() => {
    switch (animation) {
      case "fade":
        return { opacity: trackProgress < 0.1 ? trackProgress * 10 : trackProgress > 0.9 ? (1 - trackProgress) * 10 : 1 };
      case "slide":
        const slideOffset = (1 - trackProgress) * 50;
        return position === "bottom"
          ? { transform: `translateY(${slideOffset}px)`, opacity: trackProgress < 0.1 ? trackProgress * 10 : 1 }
          : { transform: `translateY(-${slideOffset}px)`, opacity: trackProgress < 0.1 ? trackProgress * 10 : 1 };
      case "scale":
        return { transform: `scale(${0.8 + trackProgress * 0.2})`, opacity: trackProgress };
      default:
        return {};
    }
  }, [animation, trackProgress, position]);

  return (
    <AbsoluteFill
      style={{
        ...positions,
        display: "flex",
        alignItems: position === "center" ? "center" : position === "top" ? "flex-start" : "flex-end",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 100,
      }}
    >
      <div
        style={{
          ...animStyle,
          fontSize: `${fontSize}px`,
          fontFamily,
          fontWeight: 700,
          color,
          textAlign: "center",
          textShadow: `${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px ${shadowColor}`,
          WebkitTextStroke: `${outlineWidth}px ${outlineColor}`,
          background: backgroundColor,
          padding: "16px 32px",
          borderRadius: "12px",
          maxWidth: "90%",
          lineHeight: 1.3,
          wordBreak: "break-word",
        }}
      >
        {renderStyledText(text, style, trackProgress)}
      </div>
    </AbsoluteFill>
  );
}

function renderStyledText(text: string, style: string, progress: number) {
  switch (style) {
    case "karaoke":
      return (
        <span style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: `${progress * 100}%`,
              overflow: "hidden",
              color: "#00ff88",
              WebkitTextStroke: "2px #000000",
              whiteSpace: "nowrap",
            }}
          >
            {text}
          </span>
          <span style={{ color: "#ffffff80", WebkitTextStroke: "2px #000000" }}>{text}</span>
        </span>
      );

    case "typewriter":
      const chars = text.length;
      const visibleChars = Math.floor(chars * progress);
      return (
        <>
          {text.slice(0, visibleChars)}
          {visibleChars < chars && <span style={{ animation: "blink 1s infinite" }}>{text[visibleChars]}</span>}
          {text.slice(visibleChars + 1)}
        </>
      );

    case "highlight":
      return (
        <span
          style={{
            background: `linear-gradient(90deg, transparent ${progress * 100}%, #00ff88 ${progress * 100}%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {text}
        </span>
      );

    case "box":
      return (
        <span
          style={{
            background: "rgba(0, 255, 136, 0.2)",
            padding: "4px 12px",
            borderRadius: "8px",
            border: "2px solid #00ff88",
          }}
        >
          {text}
        </span>
      );

    default:
      return text;
  }
}

export function SubtitleTrack({
  track,
  width,
  height,
  language = "en",
}: {
  track: Track;
  width: number;
  height: number;
  language?: string;
}) {
  const { fps } = useVideoConfig();
  const { frame } = useRemotionTiming();

  const subtitles = track.keyframes as Keyframe<{ text: string; start: number; end: number }>[];
  const currentSubtitle = subtitles.find(k =>
    frame >= k.frame && frame < (k.frame + (k.value.end - k.value.start) * fps)
  );

  if (!currentSubtitle) return null;

  return (
    <CaptionOverlay
      track={{
        ...track,
        keyframes: [{ frame: currentSubtitle.frame, value: currentSubtitle.value.text }],
      }}
      width={width}
      height={height}
      position="bottom"
      style="default"
      fontSize={48}
    />
  );
}

export function DynamicText({
  text,
  frame,
  duration,
  style = "default",
  ...props
}: {
  text: string;
  frame: number;
  duration: number;
  style?: CaptionOverlayProps["style"];
} & Omit<CaptionOverlayProps, "track" | "width" | "height">) {
  const { fps } = useVideoConfig();
  const { progress } = useTimeRange(frame, frame + duration * fps);

  if (!progress && progress !== 0) return null;

  const track = useMemo(() => ({
    id: "dynamic",
    name: "Dynamic Text",
    type: "text" as const,
    keyframes: [{ frame, value: text }],
    enabled: true,
    muted: false,
    locked: false,
    opacity: 1,
    blendMode: "normal" as const,
  }), [frame, text]);

  return <CaptionOverlay track={track} width={1920} height={1080} style={style} {...props} />;
}