"use client";

import { AbsoluteFill, useVideoConfig } from "remotion";
import { useRemotionTiming } from "@/hooks/useRemotion";
import { useTimelineStore } from "@/store/timelineStore";
import { useMemo, useRef, useEffect, useState } from "react";
import type { Track, Keyframe } from "@/types";

interface TimelineProps {
  width: number;
  height: number;
  position: "top" | "bottom" | "left" | "right";
  showTracks?: boolean;
  showKeyframes?: boolean;
  showPlayhead?: boolean;
  showTimecode?: boolean;
  interactive?: boolean;
}

export function Timeline({
  width,
  height,
  position,
  showTracks = true,
  showKeyframes = true,
  showPlayhead = true,
  showTimecode = true,
  interactive = false,
}: TimelineProps) {
  const { fps, durationInFrames } = useVideoConfig();
  const { frame, time, progress } = useRemotionTiming();
  const {
    tracks,
    currentFrame,
    inPoint,
    outPoint,
    selection,
    playbackRate,
  } = useTimelineStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredTrack, setHoveredTrack] = useState<string | null>(null);
  const [hoveredKeyframe, setHoveredKeyframe] = useState<{ trackId: string; frame: number } | null>(null);

  const visibleTracks = useMemo(() =>
    tracks.filter(t => t.enabled && !t.muted),
    [tracks]
  );

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
    }
  }, [position]);

  const trackHeight = 60;
  const totalTracksHeight = visibleTracks.length * trackHeight;
  const timeScale = width / durationInFrames;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width * 2;
    canvas.height = (height + totalTracksHeight) * 2;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height + totalTracksHeight}px`;
    ctx.scale(2, 2);

    const animate = () => {
      drawTimeline(ctx, width, height, totalTracksHeight, timeScale);
      requestAnimationFrame(animate);
    };

    animate();
  }, [width, height, totalTracksHeight, timeScale, currentFrame, selection, hoveredTrack, hoveredKeyframe]);

  function drawTimeline(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    tracksH: number,
    scale: number
  ) {
    ctx.clearRect(0, 0, w, h + tracksH);

    const totalW = durationInFrames * scale;

    ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    ctx.fillRect(0, 0, w, h + tracksH);

    drawTimeRuler(ctx, w, h, scale);
    drawPlayhead(ctx, w, h, tracksH, scale);
    drawInOutPoints(ctx, w, h, tracksH, scale);

    if (showTracks) {
      drawTracks(ctx, w, h, tracksH, scale);
    }

    if (showTimecode) {
      drawTimecode(ctx, w, h);
    }
  }

  function drawTimeRuler(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    scale: number
  ) {
    const majorInterval = fps * 10;
    const minorInterval = fps;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;

    for (let f = 0; f <= durationInFrames; f += minorInterval) {
      const x = f * scale;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    for (let f = 0; f <= durationInFrames; f += majorInterval) {
      const x = f * scale;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h + 10);
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(formatTimecode(f, fps), x, h + 22);
    }
  }

  function drawPlayhead(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    tracksH: number,
    scale: number
  ) {
    if (!showPlayhead) return;

    const x = currentFrame * scale;

    ctx.strokeStyle = "#00ff88";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h + tracksH);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#00ff88";
    ctx.beginPath();
    ctx.moveTo(x - 6, 0);
    ctx.lineTo(x + 6, 0);
    ctx.lineTo(x, 12);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#00ff88";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(formatTimecode(currentFrame, fps), x, h + tracksH + 20);
  }

  function drawInOutPoints(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    tracksH: number,
    scale: number
  ) {
    const inX = inPoint * scale;
    const outX = outPoint * scale;

    ctx.strokeStyle = "#ff6b6b";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);

    ctx.beginPath();
    ctx.moveTo(inX, 0);
    ctx.lineTo(inX, h + tracksH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(outX, 0);
    ctx.lineTo(outX, h + tracksH);
    ctx.stroke();

    ctx.setLineDash([]);
  }

  function drawTracks(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    tracksH: number,
    scale: number
  ) {
    const trackColors: Record<string, string> = {
      video: "#3b82f6",
      audio: "#f59e0b",
      "3d": "#8b5cf6",
      text: "#ec4899",
      image: "#10b981",
      shape: "#6366f1",
      effect: "#ef4444",
      camera: "#06b6d4",
      light: "#f97316",
      shader: "#84cc16",
    };

    visibleTracks.forEach((track, index) => {
      const y = h + index * trackHeight;
      const isSelected = selection.includes(track.id);
      const isHovered = hoveredTrack === track.id;

      ctx.fillStyle = isSelected ? "rgba(0, 255, 136, 0.2)" : isHovered ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.05)";
      ctx.fillRect(0, y, w, trackHeight);

      ctx.strokeStyle = isSelected ? "#00ff88" : "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(0.5, y + 0.5, w - 1, trackHeight - 1);

      const color = trackColors[track.type] || "#ffffff";
      ctx.fillStyle = color;
      ctx.font = "12px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`${track.type.toUpperCase()}: ${track.name}`, 10, y + 20);

      if (showKeyframes) {
        drawKeyframes(ctx, track, y, scale, color);
      }

      drawTrackBar(ctx, track, y, scale, color);
    });
  }

  function drawKeyframes(
    ctx: CanvasRenderingContext2D,
    track: Track,
    y: number,
    scale: number,
    color: string
  ) {
    track.keyframes.forEach(kf => {
      const x = kf.frame * scale;
      if (x < 0 || x > width) return;

      const isHovered = hoveredKeyframe?.trackId === track.id && hoveredKeyframe?.frame === kf.frame;

      ctx.fillStyle = isHovered ? "#00ff88" : color;
      ctx.beginPath();
      ctx.arc(x, y + trackHeight / 2, isHovered ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();

      if (isHovered) {
        ctx.fillStyle = "#000000";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(formatTimecode(kf.frame, fps), x, y - 5);
      }
    });
  }

  function drawTrackBar(
    ctx: CanvasRenderingContext2D,
    track: Track,
    y: number,
    scale: number,
    color: string
  ) {
    if (track.keyframes.length < 2) return;

    const firstFrame = track.keyframes[0]!.frame;
    const lastFrame = track.keyframes[track.keyframes.length - 1]!.frame;
    const x = firstFrame * scale;
    const w = (lastFrame - firstFrame) * scale;

    ctx.fillStyle = `${color}40`;
    ctx.fillRect(x, y + 4, w, trackHeight - 8);

    ctx.strokeStyle = `${color}80`;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y + 4, w, trackHeight - 8);
  }

  function drawTimecode(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ) {
    ctx.fillStyle = "#00ff88";
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "right";
    ctx.fillText(formatTimecode(currentFrame, fps), w - 10, h - 10);

    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "12px monospace";
    ctx.fillText(`${playbackRate}x`, w - 10, h - 40);
  }

  function formatTimecode(frameNum: number, fps: number): string {
    const totalSeconds = frameNum / fps;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const frames = frameNum % fps;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}:${frames.toString().padStart(2, "0")}`;
  }

  return (
    <AbsoluteFill
      style={{
        ...positions,
        width,
        height: height + totalTracksHeight,
        pointerEvents: interactive ? "auto" : "none",
        zIndex: 1000,
      }}
    >
      <canvas ref={canvasRef} />
    </AbsoluteFill>
  );
}

export function TimelineEditor({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const { tracks, currentFrame, selection, inPoint, outPoint } = useTimelineStore();
  const {
    addTrack,
    removeTrack,
    updateTrack,
    addKeyframe,
    removeKeyframe,
    selectTracks,
    toggleTrackSelection,
  } = useTimelineStore();

  const [newTrackName, setNewTrackName] = useState("");
  const [newTrackType, setNewTrackType] = useState<Track["type"]>("video");

  return (
    <div style={{ width, height, display: "flex", flexDirection: "column", background: "#1a1a2e" }}>
      <div style={{ padding: 16, borderBottom: "1px solid #333", display: "flex", gap: 12, alignItems: "center" }}>
        <input
          type="text"
          value={newTrackName}
          onChange={e => setNewTrackName(e.target.value)}
          placeholder="Track name..."
          style={{ flex: 1, padding: "8px 12px", background: "#2a2a3e", border: "1px solid #444", borderRadius: 4, color: "white" }}
        />
        <select
          value={newTrackType}
          onChange={e => setNewTrackType(e.target.value as Track["type"])}
          style={{ padding: "8px 12px", background: "#2a2a3e", border: "1px solid #444", borderRadius: 4, color: "white" }}
        >
          <option value="video">Video</option>
          <option value="audio">Audio</option>
          <option value="3d">3D Scene</option>
          <option value="text">Text</option>
          <option value="image">Image</option>
          <option value="effect">Effect</option>
        </select>
        <button
          onClick={() => {
            if (!newTrackName.trim()) return;
            addTrack({
              id: `track_${Date.now()}`,
              name: newTrackName,
              type: newTrackType,
              keyframes: [],
              enabled: true,
              muted: false,
              locked: false,
              opacity: 1,
              blendMode: "normal",
            });
            setNewTrackName("");
          }}
          style={{ padding: "8px 16px", background: "#00ff88", border: "none", borderRadius: 4, color: "#000", fontWeight: 600 }}
        >
          Add Track
        </button>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {tracks.map(track => (
          <div
            key={track.id}
            style={{
              padding: "12px",
              marginBottom: 8,
              background: selection.includes(track.id) ? "rgba(0, 255, 136, 0.1)" : "#222",
              border: selection.includes(track.id) ? "2px solid #00ff88" : "1px solid #333",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
            onClick={() => toggleTrackSelection(track.id)}
          >
            <input
              type="checkbox"
              checked={track.enabled}
              onChange={e => updateTrack(track.id, { enabled: e.target.checked })}
            />
            <input
              type="checkbox"
              checked={track.muted}
              onChange={e => updateTrack(track.id, { muted: e.target.checked })}
            />
            <input
              type="checkbox"
              checked={track.locked}
              onChange={e => updateTrack(track.id, { locked: e.target.checked })}
            />
            <span style={{ width: 80, textTransform: "uppercase", fontSize: 12, color: "#888" }}>{track.type}</span>
            <input
              type="text"
              value={track.name}
              onChange={e => updateTrack(track.id, { name: e.target.value })}
              style={{ flex: 1, padding: "4px 8px", background: "#333", border: "1px solid #444", borderRadius: 4, color: "white" }}
            />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={track.opacity}
              onChange={e => updateTrack(track.id, { opacity: parseFloat(e.target.value) })}
              style={{ width: 100 }}
            />
            <select
              value={track.blendMode}
              onChange={e => updateTrack(track.id, { blendMode: e.target.value as any })}
              style={{ padding: "4px 8px", background: "#333", border: "1px solid #444", borderRadius: 4, color: "white" }}
            >
              <option value="normal">Normal</option>
              <option value="multiply">Multiply</option>
              <option value="screen">Screen</option>
              <option value="overlay">Overlay</option>
            </select>
            <button
              onClick={() => removeTrack(track.id)}
              style={{ padding: "4px 12px", background: "#ff4444", border: "none", borderRadius: 4, color: "white" }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}