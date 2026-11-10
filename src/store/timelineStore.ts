import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { Track, Keyframe, TimelineState, Vector3, Euler, Color } from "@/types";

interface TimelineActions {
  setCurrentFrame: (frame: number) => void;
  setPlaybackRate: (rate: number) => void;
  setIsPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  setLoop: (loop: boolean) => void;
  setInPoint: (frame: number) => void;
  setOutPoint: (frame: number) => void;
  addTrack: (track: Track) => void;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<Track>) => void;
  reorderTracks: (trackIds: string[]) => void;
  addKeyframe: (trackId: string, keyframe: Keyframe) => void;
  removeKeyframe: (trackId: string, frame: number) => void;
  updateKeyframe: (trackId: string, frame: number, updates: Partial<Keyframe>) => void;
  moveKeyframe: (trackId: string, fromFrame: number, toFrame: number) => void;
  selectTracks: (trackIds: string[]) => void;
  toggleTrackSelection: (trackId: string) => void;
  clearSelection: () => void;
  copyTracks: (trackIds: string[]) => void;
  pasteTracks: (targetFrame: number) => void;
  duplicateTracks: (trackIds: string[]) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  reset: () => void;
}

type TimelineStore = TimelineState & TimelineActions;

const initialState: TimelineState = {
  currentFrame: 0,
  playbackRate: 1,
  isPlaying: false,
  loop: true,
  inPoint: 0,
  outPoint: 300,
  tracks: [],
  selection: [],
  clipboard: null,
};

const MAX_HISTORY = 50;

export const useTimelineStore = create<TimelineStore>()(
  subscribeWithSelector((set, get) => {
    let history: TimelineState[] = [initialState];
    let historyIndex = 0;

    const saveToHistory = (newState: TimelineState) => {
      history = history.slice(0, historyIndex + 1);
      history.push(newState);
      if (history.length > MAX_HISTORY) {
        history.shift();
      } else {
        historyIndex++;
      }
    };

    return {
      ...initialState,

      setCurrentFrame: (frame) => {
        const clamped = Math.max(get().inPoint, Math.min(frame, get().outPoint));
        set({ currentFrame: clamped });
      },

      setPlaybackRate: (rate) => set({ playbackRate: Math.max(0.01, Math.min(rate, 10)) }),

      setIsPlaying: (playing) => set({ isPlaying: playing }),

      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

      setLoop: (loop) => set({ loop }),

      setInPoint: (frame) => set((state) => ({ inPoint: Math.min(frame, state.outPoint - 1) })),

      setOutPoint: (frame) => set((state) => ({ outPoint: Math.max(frame, state.inPoint + 1) })),

      addTrack: (track) => set((state) => {
        const newState = { tracks: [...state.tracks, track] };
        saveToHistory({ ...state, ...newState });
        return newState;
      }),

      removeTrack: (trackId) => set((state) => {
        const newState = {
          tracks: state.tracks.filter((t) => t.id !== trackId),
          selection: state.selection.filter((id) => id !== trackId),
        };
        saveToHistory({ ...state, ...newState });
        return newState;
      }),

      updateTrack: (trackId, updates) => set((state) => {
        const newState = {
          tracks: state.tracks.map((t) => (t.id === trackId ? { ...t, ...updates } : t)),
        };
        saveToHistory({ ...state, ...newState });
        return newState;
      }),

      reorderTracks: (trackIds) => set((state) => {
        const trackMap = new Map(state.tracks.map((t) => [t.id, t]));
        const newState = {
          tracks: trackIds.map((id) => trackMap.get(id)!).filter(Boolean),
        };
        saveToHistory({ ...state, ...newState });
        return newState;
      }),

      addKeyframe: (trackId, keyframe) => set((state) => {
        const track = state.tracks.find((t) => t.id === trackId);
        if (!track) return state;

        const exists = track.keyframes.findIndex((k) => k.frame === keyframe.frame);
        let newKeyframes: Keyframe[];
        if (exists >= 0) {
          newKeyframes = [...track.keyframes];
          newKeyframes[exists] = keyframe;
        } else {
          newKeyframes = [...track.keyframes, keyframe].sort((a, b) => a.frame - b.frame);
        }

        const newState = {
          tracks: state.tracks.map((t) =>
            t.id === trackId ? { ...t, keyframes: newKeyframes } : t
          ),
        };
        saveToHistory({ ...state, ...newState });
        return newState;
      }),

      removeKeyframe: (trackId, frame) => set((state) => {
        const newState = {
          tracks: state.tracks.map((t) =>
            t.id === trackId ? { ...t, keyframes: t.keyframes.filter((k) => k.frame !== frame) } : t
          ),
        };
        saveToHistory({ ...state, ...newState });
        return newState;
      }),

      updateKeyframe: (trackId, frame, updates) => set((state) => {
        const newState = {
          tracks: state.tracks.map((t) =>
            t.id === trackId
              ? {
                  ...t,
                  keyframes: t.keyframes.map((k) =>
                    k.frame === frame ? { ...k, ...updates, value: updates.value ?? k.value } : k
                  ),
                }
              : t
          ),
        };
        saveToHistory({ ...state, ...newState });
        return newState;
      }),

      moveKeyframe: (trackId, fromFrame, toFrame) => set((state) => {
        const track = state.tracks.find((t) => t.id === trackId);
        if (!track) return state;

        const keyframeIndex = track.keyframes.findIndex((k) => k.frame === fromFrame);
        if (keyframeIndex === -1) return state;

        const originalKeyframe = track.keyframes[keyframeIndex];
        const keyframe: Keyframe = { ...originalKeyframe!, frame: toFrame };
        const newKeyframes = [
          ...track.keyframes.slice(0, keyframeIndex),
          ...track.keyframes.slice(keyframeIndex + 1),
          keyframe,
        ].sort((a, b) => a.frame - b.frame);

        const newState = {
          tracks: state.tracks.map((t) =>
            t.id === trackId ? { ...t, keyframes: newKeyframes } : t
          ),
        };
        saveToHistory({ ...state, ...newState });
        return newState;
      }),

      selectTracks: (trackIds) => set({ selection: trackIds }),

      toggleTrackSelection: (trackId) => set((state) => ({
        selection: state.selection.includes(trackId)
          ? state.selection.filter((id) => id !== trackId)
          : [...state.selection, trackId],
      })),

      clearSelection: () => set({ selection: [] }),

      copyTracks: (trackIds) => set((state) => ({
        clipboard: state.tracks.filter((t) => trackIds.includes(t.id)).map((t) => ({ ...t })),
      })),

      pasteTracks: (targetFrame) => set((state) => {
        if (!state.clipboard || state.clipboard.length === 0) return state;

        const newTracks = state.clipboard.map((track, index) => ({
          ...track,
          id: `${track.id}_copy_${Date.now()}_${index}`,
          name: `${track.name} (copy)`,
          keyframes: track.keyframes.map((k) => ({
            ...k,
            frame: k.frame + targetFrame,
          })),
        }));

        const newState = { tracks: [...state.tracks, ...newTracks] };
        saveToHistory({ ...state, ...newState });
        return newState;
      }),

      duplicateTracks: (trackIds) => set((state) => {
        const tracksToDuplicate = state.tracks.filter((t) => trackIds.includes(t.id));
        const newTracks = tracksToDuplicate.map((track, index) => ({
          ...track,
          id: `${track.id}_dup_${Date.now()}_${index}`,
          name: `${track.name} (dup)`,
        }));

        const newState = { tracks: [...state.tracks, ...newTracks] };
        saveToHistory({ ...state, ...newState });
        return newState;
      }),

      undo: () => {
        if (historyIndex > 0) {
          historyIndex--;
          const state = history[historyIndex];
          if (state) set(state);
        }
      },

      redo: () => {
        if (historyIndex < history.length - 1) {
          historyIndex++;
          const state = history[historyIndex];
          if (state) set(state);
        }
      },

      canUndo: () => historyIndex > 0,

      canRedo: () => historyIndex < history.length - 1,

      reset: () => {
        history = [initialState];
        historyIndex = 0;
        set(initialState);
      },
    };
  })
);

export const useCurrentFrame = () => useTimelineStore((state) => state.currentFrame);
export const useIsPlaying = () => useTimelineStore((state) => state.isPlaying);
export const useTracks = () => useTimelineStore((state) => state.tracks);
export const useSelection = () => useTimelineStore((state) => state.selection);