import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { useRemotionTiming, useInterpolate, useTimeRange } from "@/hooks/useRemotion";
import type { Track } from "@/types";

export type TransitionType =
  | "cut"
  | "fade"
  | "crossfade"
  | "slide"
  | "push"
  | "wipe"
  | "zoom"
  | "rotate"
  | "blur"
  | "glitch";

export interface TransitionConfig {
  type: TransitionType;
  duration: number;
  easing?: string;
  direction?: "left" | "right" | "up" | "down" | "in" | "out";
  color?: string;
}

export function Transition({
  fromTrack,
  toTrack,
  config,
  progress,
}: {
  fromTrack: Track;
  toTrack: Track;
  config: TransitionConfig;
  progress: number;
}) {
  const { width, height } = useVideoConfig();
  const t = clamp(progress, 0, 1);

  switch (config.type) {
    case "cut":
      return t < 0.5 ? <FromTrack track={fromTrack} /> : <ToTrack track={toTrack} />;

    case "fade":
      return (
        <>
          <FromTrack track={fromTrack} opacity={1 - t} />
          <ToTrack track={toTrack} opacity={t} />
        </>
      );

    case "crossfade":
      return (
        <>
          <FromTrack track={fromTrack} opacity={easeInOut(1 - t)} />
          <ToTrack track={toTrack} opacity={easeInOut(t)} />
        </>
      );

    case "slide":
      return (
        <>
          <FromTrack
            track={fromTrack}
            transform={{
              x: config.direction === "left" ? -width * t : config.direction === "right" ? width * t : 0,
              y: config.direction === "up" ? -height * t : config.direction === "down" ? height * t : 0,
            }}
          />
          <ToTrack
            track={toTrack}
            transform={{
              x: config.direction === "left" ? width * (1 - t) : config.direction === "right" ? -width * (1 - t) : 0,
              y: config.direction === "up" ? height * (1 - t) : config.direction === "down" ? -height * (1 - t) : 0,
            }}
          />
        </>
      );

    case "push":
      const pushX = config.direction === "left" ? width * (t - 1) : config.direction === "right" ? width * (1 - t) : 0;
      const pushY = config.direction === "up" ? height * (t - 1) : config.direction === "down" ? height * (1 - t) : 0;
      return (
        <>
          <FromTrack track={fromTrack} transform={{ x: -pushX, y: -pushY }} />
          <ToTrack track={toTrack} transform={{ x: pushX, y: pushY }} />
        </>
      );

    case "wipe":
      return (
        <>
          <FromTrack track={fromTrack} clipPath={getWipeClipPath(t, config.direction ?? "right", width, height)} />
          <ToTrack track={toTrack} clipPath={getWipeClipPath(1 - t, config.direction ?? "left", width, height)} />
        </>
      );

    case "zoom":
      const scale = 1 + t * 0.5;
      return (
        <>
          <FromTrack track={fromTrack} transform={{ scale: 1 / scale, opacity: 1 - t }} />
          <ToTrack track={toTrack} transform={{ scale, opacity: t }} />
        </>
      );

    case "rotate":
      const angle = t * Math.PI * 0.5;
      return (
        <>
          <FromTrack track={fromTrack} transform={{ rotation: -angle, opacity: 1 - t }} />
          <ToTrack track={toTrack} transform={{ rotation: angle, opacity: t }} />
        </>
      );

    case "blur":
      return (
        <>
          <FromTrack track={fromTrack} filter={`blur(${t * 20}px)`} opacity={1 - t} />
          <ToTrack track={toTrack} filter={`blur(${(1 - t) * 20}px)`} opacity={t} />
        </>
      );

    case "glitch":
      return (
        <>
          <FromTrack track={fromTrack} opacity={1 - t} />
          <ToTrack track={toTrack} opacity={t} />
          <GlitchOverlay intensity={Math.sin(t * Math.PI * 10) * t} />
        </>
      );

    default:
      return <ToTrack track={toTrack} />;
  }
}

interface TrackRenderProps {
  track: Track;
  opacity?: number;
  transform?: { x?: number; y?: number; scale?: number; rotation?: number; opacity?: number };
  filter?: string;
  clipPath?: string;
}

function FromTrack({
  track,
  opacity = 1,
  transform = {},
  filter = "none",
  clipPath = "none",
}: TrackRenderProps) {
  const { x = 0, y = 0, scale = 1, rotation = 0 } = transform;
  return (
    <AbsoluteFill
      style={{
        opacity: transform.opacity ?? opacity,
        filter,
        clipPath,
        transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotation}rad)`,
        transformOrigin: "center center",
      }}
    >
      {track.content}
    </AbsoluteFill>
  );
}

function ToTrack({
  track,
  opacity = 1,
  transform = {},
  filter = "none",
  clipPath = "none",
}: TrackRenderProps) {
  const { x = 0, y = 0, scale = 1, rotation = 0 } = transform;
  return (
    <AbsoluteFill
      style={{
        opacity: transform.opacity ?? opacity,
        filter,
        clipPath,
        transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotation}rad)`,
        transformOrigin: "center center",
      }}
    >
      {track.content}
    </AbsoluteFill>
  );
}

function GlitchOverlay({ intensity }: { intensity: number }) {
  if (intensity <= 0) return null;
  const { width, height } = useVideoConfig();
  const slices = 10;
  return (
    <AbsoluteFill
      style={{ pointerEvents: "none", mixBlendMode: "difference" }}
    >
      {Array.from({ length: slices }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: 0,
            left: `${(i / slices) * 100}%`,
            width: `${(1 / slices) * 100}%`,
            height: "100%",
            background: `rgba(255,0,0,${intensity * 0.3})`,
            transform: `translateX(${intensity * 20 * (Math.random() - 0.5)}px)`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
}

function getWipeClipPath(progress: number, direction: string, width: number, height: number): string {
  const w = width * progress;
  const h = height * progress;
  switch (direction) {
    case "left":
      return `inset(0 ${width - w}px 0 0)`;
    case "right":
      return `inset(0 0 0 ${w}px)`;
    case "up":
      return `inset(${height - h}px 0 0 0)`;
    case "down":
      return `inset(0 0 ${h}px 0)`;
    default:
      return `inset(0 ${width - w}px 0 0)`;
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function useTransition(
  fromTrack: Track,
  toTrack: Track,
  config: TransitionConfig
) {
  const { frame } = useRemotionTiming();
  const { active, progress } = useTimeRange(
    fromTrack.keyframes[fromTrack.keyframes.length - 1]?.frame ?? 0,
    toTrack.keyframes[0]?.frame ?? 0
  );

  return { active: active && progress > 0 && progress < 1, progress };
}