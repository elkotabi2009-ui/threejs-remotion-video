"use client";

import { AbsoluteFill, useVideoConfig } from "remotion";
import { useRemotionTiming } from "@/hooks/useRemotion";
import { useAudioStore } from "@/store/audioStore";
import { useMemo, useRef, useEffect } from "react";
import type { AudioTrack } from "@/types";

interface AudioVisualizerProps {
  tracks: AudioTrack[];
  width: number;
  height: number;
  position: "top" | "bottom" | "left" | "right";
  style?: "bars" | "waveform" | "circular" | "frequency";
  barCount?: number;
  color?: string;
  backgroundColor?: string;
}

export function AudioVisualizer({
  tracks,
  width,
  height,
  position,
  style = "bars",
  barCount = 64,
  color = "#00ff88",
  backgroundColor = "rgba(0, 0, 0, 0.5)",
}: AudioVisualizerProps) {
  const { fps } = useVideoConfig();
  const { time } = useRemotionTiming();
  const { waveforms, masterVolume } = useAudioStore();

  const activeTracks = useMemo(() =>
    tracks.filter(t => time >= t.startFrame / fps && time < t.endFrame / fps),
    [tracks, time, fps]
  );

  const combinedWaveform = useMemo(() => {
    if (activeTracks.length === 0) return new Float32Array(barCount);

    const combined = new Float32Array(barCount).fill(0) as Float32Array;
    let maxVal = 0;

    activeTracks.forEach(track => {
      const waveform = waveforms.get(track.id);
      if (!waveform) return;
      const wf = waveform;
      for (let i = 0; i < barCount; i++) {
        const step = Math.floor(wf.length / barCount);
        const val = (wf[i * step] ?? 0) * (track.volume ?? 1);
        combined[i] = (combined[i] ?? 0) + val;
        maxVal = Math.max(maxVal, combined[i] ?? 0);
      }
    });

    if (maxVal > 0) {
      for (let i = 0; i < barCount; i++) {
        combined[i] = (combined[i] ?? 0) / maxVal;
      }
    }

    return combined;
  }, [activeTracks, barCount, waveforms]);

  const positions = useMemo(() => {
    switch (position) {
      case "top":
        return { top: 0, left: 0, right: 0 };
      case "bottom":
        return { bottom: 0, left: 0, right: 0 };
      case "left":
        return { top: 0, bottom: 0, left: 0 };
      case "right":
        return { top: 0, bottom: 0, right: 0 };
      default:
        return { top: 0, left: 0 };
    }
  }, [position]);

  return (
    <AbsoluteFill
      style={{
        ...positions,
        width: position === "left" || position === "right" ? height : width,
        height: position === "top" || position === "bottom" ? height : width,
        background: backgroundColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <canvas
        width={position === "left" || position === "right" ? height : width}
        height={position === "top" || position === "bottom" ? height : width}
        style={{ width: "100%", height: "100%" }}
      >
        <VisualizerCanvas
          waveform={combinedWaveform}
          style={style}
          barCount={barCount}
          color={color}
          width={position === "left" || position === "right" ? height : width}
          height={position === "top" || position === "bottom" ? height : width}
        />
      </canvas>
    </AbsoluteFill>
  );
}

function VisualizerCanvas({
  waveform,
  style,
  barCount,
  color,
  width,
  height,
}: {
  waveform: Float32Array;
  style: "bars" | "waveform" | "circular" | "frequency";
  barCount: number;
  color: string;
  width: number;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width * 2;
    canvas.height = height * 2;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(2, 2);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      switch (style) {
        case "bars":
          drawBars(ctx, waveform, barCount, color, width, height);
          break;
        case "waveform":
          drawWaveform(ctx, waveform, color, width, height);
          break;
        case "circular":
          drawCircular(ctx, waveform, barCount, color, width, height);
          break;
        case "frequency":
          drawFrequency(ctx, waveform, barCount, color, width, height);
          break;
      }

      requestAnimationFrame(animate);
    };

    animate();
  }, [waveform, style, barCount, color, width, height]);

  return <canvas ref={canvasRef} />;
}

function drawBars(
  ctx: CanvasRenderingContext2D,
  waveform: Float32Array,
  barCount: number,
  color: string,
  width: number,
  height: number
) {
  const barWidth = width / barCount;
  const maxHeight = height * 0.8;

  ctx.fillStyle = color;

  for (let i = 0; i < barCount; i++) {
    const barHeight = (waveform[i] ?? 0) * maxHeight;
    if (barHeight <= 0) continue;
    const x = i * barWidth;
    const y = height - barHeight;

    const gradient = ctx.createLinearGradient(0, height, 0, y);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, adjustColor(color, -40));

    ctx.fillStyle = gradient;
    ctx.fillRect(x + 1, y, Math.max(1, barWidth - 2), barHeight);
  }
}

function drawWaveform(
  ctx: CanvasRenderingContext2D,
  waveform: Float32Array,
  color: string,
  width: number,
  height: number
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  const centerY = height / 2;

  for (let i = 0; i < waveform.length; i++) {
    const x = (i / waveform.length) * width;
    const y = centerY + (waveform[i] ?? 0) * (height * 0.4) * (i % 2 === 0 ? 1 : -1);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();

  ctx.beginPath();
  for (let i = 0; i < waveform.length; i++) {
    const x = (i / waveform.length) * width;
    const y = centerY - (waveform[i] ?? 0) * (height * 0.4) * (i % 2 === 0 ? 1 : -1);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();
}

function drawCircular(
  ctx: CanvasRenderingContext2D,
  waveform: Float32Array,
  barCount: number,
  color: string,
  width: number,
  height: number
) {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.3;
  const barWidth = (Math.PI * 2) / barCount;

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";

  for (let i = 0; i < barCount; i++) {
    const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
    const barHeight = (waveform[i] ?? 0) * radius * 0.8;
    if (barHeight <= 0) continue;

    const x1 = centerX + Math.cos(angle) * radius;
    const y1 = centerY + Math.sin(angle) * radius;
    const x2 = centerX + Math.cos(angle) * (radius + barHeight);
    const y2 = centerY + Math.sin(angle) * (radius + barHeight);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}

function drawFrequency(
  ctx: CanvasRenderingContext2D,
  waveform: Float32Array,
  barCount: number,
  color: string,
  width: number,
  height: number
) {
  const barWidth = width / barCount;
  const centerY = height / 2;

  for (let i = 0; i < barCount; i++) {
    const value = waveform[i] ?? 0;
    const barHeight = value * (height / 2) * 0.9;
    if (barHeight <= 0) continue;
    const x = i * barWidth;

    const hue = (i / barCount) * 120;
    ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;

    ctx.fillRect(x + 1, centerY - barHeight, Math.max(1, barWidth - 2), barHeight);
    ctx.fillRect(x + 1, centerY, Math.max(1, barWidth - 2), barHeight);
  }
}

function adjustColor(color: string, amount: number): string {
  const hex = color.replace("#", "");
  if (hex.length < 6) return color;
  const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 2), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 2), 16) + amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}