import { useCurrentFrame, useVideoConfig } from "remotion";
import { useMemo, useRef, useEffect } from "react";
import { useAudioStore } from "@/store/audioStore";

export interface RemotionTiming {
  frame: number;
  fps: number;
  durationInFrames: number;
  width: number;
  height: number;
  time: number;
  progress: number;
  isFirstFrame: boolean;
  isLastFrame: boolean;
}

export function useRemotionTiming(): RemotionTiming {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  return useMemo(() => ({
    frame,
    fps,
    durationInFrames,
    width,
    height,
    time: frame / fps,
    progress: frame / durationInFrames,
    isFirstFrame: frame === 0,
    isLastFrame: frame === durationInFrames - 1,
  }), [frame, fps, durationInFrames, width, height]);
}

export function useInterpolate(
  keyframes: { frame: number; value: number }[],
  options?: { extrapolateLeft?: "clamp" | "repeat" | "mirror"; extrapolateRight?: "clamp" | "repeat" | "mirror" }
): number {
  const { frame } = useRemotionTiming();
  return interpolate(frame, keyframes, options);
}

export function useInterpolateVec3(
  keyframes: { frame: number; value: { x: number; y: number; z: number } }[],
  options?: { extrapolateLeft?: "clamp" | "repeat" | "mirror"; extrapolateRight?: "clamp" | "repeat" | "mirror" }
): { x: number; y: number; z: number } {
  const { frame } = useRemotionTiming();
  return {
    x: interpolate(frame, keyframes.map(k => ({ frame: k.frame, value: k.value.x })), options),
    y: interpolate(frame, keyframes.map(k => ({ frame: k.frame, value: k.value.y })), options),
    z: interpolate(frame, keyframes.map(k => ({ frame: k.frame, value: k.value.z })), options),
  };
}

export function useInterpolateColor(
  keyframes: { frame: number; value: { r: number; g: number; b: number } }[],
  options?: { extrapolateLeft?: "clamp" | "repeat" | "mirror"; extrapolateRight?: "clamp" | "repeat" | "mirror" }
): { r: number; g: number; b: number } {
  const { frame } = useRemotionTiming();
  return {
    r: interpolate(frame, keyframes.map(k => ({ frame: k.frame, value: k.value.r })), options),
    g: interpolate(frame, keyframes.map(k => ({ frame: k.frame, value: k.value.g })), options),
    b: interpolate(frame, keyframes.map(k => ({ frame: k.frame, value: k.value.b })), options),
  };
}

function interpolate(
  frame: number,
  keyframes: { frame: number; value: number }[],
  options?: { extrapolateLeft?: "clamp" | "repeat" | "mirror"; extrapolateRight?: "clamp" | "repeat" | "mirror" }
): number {
  if (keyframes.length === 0) return 0;
  const firstFrame = keyframes[0];
  if (keyframes.length === 1) return firstFrame!.value;

  const sorted = [...keyframes].sort((a, b) => a.frame - b.frame);
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;

  if (frame <= first.frame) {
    switch (options?.extrapolateLeft) {
      case "repeat":
        return last.value!;
      case "mirror":
        return sorted[1]?.value ?? first.value!;
      default:
        return first.value!;
    }
  }

  if (frame >= last.frame) {
    switch (options?.extrapolateRight) {
      case "repeat":
        return first.value!;
      case "mirror":
        return sorted[sorted.length - 2]?.value ?? last.value!;
      default:
        return last.value!;
    }
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const k1 = sorted[i]!;
    const k2 = sorted[i + 1]!;
    if (frame >= k1.frame && frame <= k2.frame) {
      const t = (frame - k1.frame) / (k2.frame - k1.frame);
      return k1.value! + (k2.value! - k1.value!) * t;
    }
  }

  return last.value!;
}

export function useSpring(value: number, config?: { stiffness?: number; damping?: number; mass?: number }): number {
  const { frame } = useRemotionTiming();
  // Simplified spring for Remotion (frame-based)
  // In practice, use react-spring or a proper spring implementation
  return value;
}

export function useDelayedValue<T>(value: T, delayFrames: number): T {
  const { frame } = useRemotionTiming();
  // This would need a ref to track previous values
  // Simplified version - in practice use a proper delay hook
  return frame > delayFrames ? value : value;
}

export function useSequence(
  sequences: { start: number; end: number; content: React.ReactNode }[]
): React.ReactNode | null {
  const { frame } = useRemotionTiming();
  const active = sequences.find((s) => frame >= s.start && frame < s.end);
  return active?.content ?? null;
}

export function useTimeRange(startFrame: number, endFrame: number): { active: boolean; progress: number } {
  const { frame } = useRemotionTiming();
  const active = frame >= startFrame && frame < endFrame;
  const progress = active ? (frame - startFrame) / (endFrame - startFrame) : 0;
  return { active, progress: Math.max(0, Math.min(1, progress)) };
}

export function useFrameRange(frames: number[]): { active: boolean; index: number } {
  const { frame } = useRemotionTiming();
  const index = frames.findIndex((f) => f === frame);
  return { active: index !== -1, index: Math.max(0, index) };
}

export function useWaveformData(trackId: string, samples = 256): Float32Array {
  const waveform = useAudioStore((state) => state.waveforms.get(trackId));
  const waveformDataRef = useRef<Float32Array>(new Float32Array(samples));

  useEffect(() => {
    if (!waveform) return;

    const data = new Float32Array(samples);
    const step = Math.floor(waveform.length / samples);
    for (let i = 0; i < samples; i++) {
      data[i] = waveform[i * step] ?? 0;
    }
    waveformDataRef.current = data;
  }, [waveform, samples]);

  return waveformDataRef.current;
}