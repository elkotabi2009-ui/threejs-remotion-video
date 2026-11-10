import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { AudioTrack, AudioEffect, AudioEffectType } from "@/types";

interface AudioState {
  tracks: AudioTrack[];
  masterVolume: number;
  masterMuted: boolean;
  sampleRate: number;
  bufferSize: number;
  waveforms: Map<string, Float32Array>;
  playbackState: "stopped" | "playing" | "paused";
  currentTime: number;
  duration: number;
}

interface AudioActions {
  addTrack: (track: AudioTrack) => void;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<AudioTrack>) => void;
  reorderTracks: (trackIds: string[]) => void;
  setMasterVolume: (volume: number) => void;
  setMasterMuted: (muted: boolean) => void;
  setWaveform: (trackId: string, waveform: Float32Array) => void;
  getWaveform: (trackId: string) => Float32Array | undefined;
  setPlaybackState: (state: AudioState["playbackState"]) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  addEffect: (trackId: string, effect: AudioEffect) => void;
  removeEffect: (trackId: string, effectId: string) => void;
  updateEffect: (trackId: string, effectId: string, updates: Partial<AudioEffect>) => void;
  toggleEffect: (trackId: string, effectId: string) => void;
  createEffect: (type: AudioEffectType, params?: Record<string, number>) => AudioEffect;
  reset: () => void;
}

const initialState: AudioState = {
  tracks: [],
  masterVolume: 1,
  masterMuted: false,
  sampleRate: 48000,
  bufferSize: 4096,
  waveforms: new Map(),
  playbackState: "stopped",
  currentTime: 0,
  duration: 0,
};

const DEFAULT_EFFECT_PARAMS: Record<AudioEffectType, Record<string, number>> = {
  gain: { gain: 1 },
  filter: { frequency: 1000, type: 0, Q: 1 },
  compressor: { threshold: -24, knee: 30, ratio: 12, attack: 0.003, release: 0.25 },
  reverb: { roomSize: 0.5, dampening: 0.5, wet: 0.3, dry: 0.7 },
  delay: { delayTime: 0.5, feedback: 0.3, wet: 0.3, dry: 0.7 },
  distortion: { distortion: 0.5, oversample: 1 },
  chorus: { frequency: 1.5, delayTime: 0.005, depth: 0.5, wet: 0.5, dry: 0.5 },
  phaser: { frequency: 0.5, octaves: 3, baseFrequency: 350, wet: 0.5, dry: 0.5 },
  tremolo: { frequency: 5, depth: 0.5, wet: 0.5, dry: 0.5 },
  eq: { low: 0, mid: 0, high: 0, lowFreq: 320, highFreq: 3200 },
};

let effectCounter = 0;

export const useAudioStore = create<AudioState & AudioActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    addTrack: (track) => set((state) => ({ tracks: [...state.tracks, track] })),

    removeTrack: (trackId) => set((state) => {
      const newWaveforms = new Map(state.waveforms);
      newWaveforms.delete(trackId);
      return { tracks: state.tracks.filter((t) => t.id !== trackId), waveforms: newWaveforms };
    }),

    updateTrack: (trackId, updates) => set((state) => ({
      tracks: state.tracks.map((t) => (t.id === trackId ? { ...t, ...updates } : t)),
    })),

    reorderTracks: (trackIds) => set((state) => {
      const trackMap = new Map(state.tracks.map((t) => [t.id, t]));
      return { tracks: trackIds.map((id) => trackMap.get(id)!).filter(Boolean) };
    }),

    setMasterVolume: (volume) => set({ masterVolume: Math.max(0, Math.min(1, volume)) }),

    setMasterMuted: (muted) => set({ masterMuted: muted }),

    setWaveform: (trackId, waveform) => set((state) => {
      const newWaveforms = new Map(state.waveforms);
      newWaveforms.set(trackId, waveform);
      return { waveforms: newWaveforms };
    }),

    getWaveform: (trackId) => get().waveforms.get(trackId),

    setPlaybackState: (playbackState) => set({ playbackState }),

    setCurrentTime: (currentTime) => set({ currentTime }),

    setDuration: (duration) => set({ duration }),

    addEffect: (trackId, effect) => set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === trackId ? { ...t, effects: [...t.effects, effect] } : t
      ),
    })),

    removeEffect: (trackId, effectId) => set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === trackId ? { ...t, effects: t.effects.filter((e) => e.id !== effectId) } : t
      ),
    })),

    updateEffect: (trackId, effectId, updates) => set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === trackId
          ? { ...t, effects: t.effects.map((e) => (e.id === effectId ? { ...e, ...updates } : e)) }
          : t
      ),
    })),

    toggleEffect: (trackId, effectId) => set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === trackId
          ? {
              ...t,
              effects: t.effects.map((e) =>
                e.id === effectId ? { ...e, enabled: !e.enabled } : e
              ),
            }
          : t
      ),
    })),

    createEffect: (type, params = {}) => {
      const id = `effect_${type}_${++effectCounter}_${Date.now()}`;
      return {
        id,
        type,
        params: { ...DEFAULT_EFFECT_PARAMS[type], ...params },
        enabled: true,
      };
    },

    reset: () => set(initialState),
  }))
);

export const useAudioTracks = () => useAudioStore((state) => state.tracks);
export const useMasterVolume = () => useAudioStore((state) => state.masterVolume);
export const useWaveform = (trackId: string) => useAudioStore((state) => state.waveforms.get(trackId));