import { useEffect, useRef, useCallback } from "react";
import { useAudioStore, useWaveform } from "@/store/audioStore";
import type { AudioTrack, AudioEffect } from "@/types";

export function useAudioEngine() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map());
  const effectChainsRef = useRef<Map<string, AudioNode[]>>(new Map());
  const animationFrameRef = useRef<number>();

  const {
    tracks,
    masterVolume,
    masterMuted,
    playbackState,
    currentTime,
    setPlaybackState,
    setCurrentTime,
    setDuration,
  } = useAudioStore();

  const initAudioContext = useCallback(() => {
    if (audioContextRef.current) return audioContextRef.current;

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 48000,
    });

    const gainNode = ctx.createGain();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;

    gainNode.connect(analyser);
    analyser.connect(ctx.destination);

    audioContextRef.current = ctx;
    gainNodeRef.current = gainNode;
    analyserRef.current = analyser;

    return ctx;
  }, []);

  const resumeAudioContext = useCallback(async () => {
    const ctx = initAudioContext();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    return ctx;
  }, [initAudioContext]);

  const loadAudioBuffer = useCallback(async (url: string): Promise<AudioBuffer> => {
    const ctx = initAudioContext();
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return ctx.decodeAudioData(arrayBuffer);
  }, [initAudioContext]);

  const createEffectChain = useCallback((
    trackId: string,
    effects: AudioEffect[]
  ): AudioNode[] => {
    const ctx = initAudioContext();
    const chain: AudioNode[] = [];
    let lastNode: AudioNode = ctx.createGain();

    for (const effect of effects) {
      if (!effect.enabled) continue;

      let node: AudioNode;

      switch (effect.type) {
        case "gain": {
          node = ctx.createGain();
          (node as GainNode).gain.value = effect.params.gain ?? 1;
          break;
        }
        case "filter": {
          node = ctx.createBiquadFilter();
          const filterNode = node as BiquadFilterNode;
          filterNode.type = ["lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "peaking", "notch", "allpass"][effect.params.type ?? 0] as BiquadFilterType;
          filterNode.frequency.value = effect.params.frequency ?? 1000;
          filterNode.Q.value = effect.params.Q ?? 1;
          break;
        }
        case "compressor": {
          node = ctx.createDynamicsCompressor();
          const comp = node as DynamicsCompressorNode;
          comp.threshold.value = effect.params.threshold ?? -24;
          comp.knee.value = effect.params.knee ?? 30;
          comp.ratio.value = effect.params.ratio ?? 12;
          comp.attack.value = effect.params.attack ?? 0.003;
          comp.release.value = effect.params.release ?? 0.25;
          break;
        }
        case "reverb": {
          const convolver = ctx.createConvolver();
          const reverbBuffer = createImpulseResponse(ctx, effect.params.roomSize ?? 0.5, effect.params.dampening ?? 0.5);
          convolver.buffer = reverbBuffer;
          const wetGain = ctx.createGain();
          wetGain.gain.value = effect.params.wet ?? 0.3;
          const dryGain = ctx.createGain();
          dryGain.gain.value = effect.params.dry ?? 0.7;
          chain.push(wetGain, dryGain);
          effectChainsRef.current.set(`${trackId}_reverb_wet`, [convolver, wetGain]);
          effectChainsRef.current.set(`${trackId}_reverb_dry`, [dryGain]);
          node = convolver;
          break;
        }
        case "delay": {
          const delayNode = ctx.createDelay();
          delayNode.delayTime.value = effect.params.delayTime ?? 0.5;
          const feedback = ctx.createGain();
          feedback.gain.value = effect.params.feedback ?? 0.3;
          delayNode.connect(feedback);
          feedback.connect(delayNode);
          const wetGain = ctx.createGain();
          wetGain.gain.value = effect.params.wet ?? 0.3;
          const dryGain = ctx.createGain();
          dryGain.gain.value = effect.params.dry ?? 0.7;
          chain.push(wetGain, dryGain);
          node = delayNode;
          break;
        }
        case "eq": {
          const lowFilter = ctx.createBiquadFilter();
          lowFilter.type = "lowshelf";
          lowFilter.frequency.value = effect.params.lowFreq ?? 320;
          lowFilter.gain.value = effect.params.low ?? 0;

          const midFilter = ctx.createBiquadFilter();
          midFilter.type = "peaking";
          midFilter.frequency.value = 1000;
          midFilter.Q.value = 1;
          midFilter.gain.value = effect.params.mid ?? 0;

          const highFilter = ctx.createBiquadFilter();
          highFilter.type = "highshelf";
          highFilter.frequency.value = effect.params.highFreq ?? 3200;
          highFilter.gain.value = effect.params.high ?? 0;

          lowFilter.connect(midFilter);
          midFilter.connect(highFilter);
          chain.push(lowFilter, midFilter);
          node = highFilter;
          break;
        }
        default:
          continue;
      }

      lastNode.connect(node);
      lastNode = node;
      chain.push(node);
    }

    lastNode.connect(gainNodeRef.current!);
    effectChainsRef.current.set(trackId, chain);
    return chain;
  }, [initAudioContext]);

  const playTrack = useCallback(async (track: AudioTrack) => {
    await resumeAudioContext();
    const ctx = audioContextRef.current!;
    const buffer = await loadAudioBuffer(track.src);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = track.playbackRate;

    const trackGain = ctx.createGain();
    trackGain.gain.value = track.volume;

    const panNode = ctx.createStereoPanner();
    panNode.pan.value = track.pan;

    createEffectChain(track.id, track.effects);

    source.connect(trackGain);
    trackGain.connect(panNode);
    panNode.connect(effectChainsRef.current.get(track.id)?.[0] ?? gainNodeRef.current!);

    const startOffset = Math.max(0, currentTime - track.startFrame / 30);
    source.start(ctx.currentTime, startOffset);

    sourceNodesRef.current.set(track.id, source);

    source.onended = () => {
      sourceNodesRef.current.delete(track.id);
      if (sourceNodesRef.current.size === 0 && playbackState === "playing") {
        setPlaybackState("stopped");
      }
    };
  }, [resumeAudioContext, loadAudioBuffer, createEffectChain, currentTime, playbackState, setPlaybackState]);

  const stopTrack = useCallback((trackId: string) => {
    const source = sourceNodesRef.current.get(trackId);
    if (source) {
      source.stop();
      sourceNodesRef.current.delete(trackId);
    }
  }, []);

  const stopAll = useCallback(() => {
    sourceNodesRef.current.forEach((source) => {
      try { source.stop(); } catch {}
    });
    sourceNodesRef.current.clear();
    setPlaybackState("stopped");
    setCurrentTime(0);
  }, [setPlaybackState, setCurrentTime]);

  const updateTrackVolume = useCallback((trackId: string, volume: number) => {
    // Would need to track gain nodes per track
  }, []);

  const updateMasterVolume = useCallback((volume: number) => {
    gainNodeRef.current?.gain.setValueAtTime(volume, audioContextRef.current?.currentTime ?? 0);
  }, []);

  const analyseWaveform = useCallback((trackId: string) => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    const waveform = new Float32Array(dataArray.length);
    for (let i = 0; i < dataArray.length; i++) {
      waveform[i] = dataArray[i]! / 255;
    }

    return waveform;
  }, []);

  return {
    initAudioContext,
    resumeAudioContext,
    loadAudioBuffer,
    playTrack,
    stopTrack,
    stopAll,
    updateTrackVolume,
    updateMasterVolume,
    analyseWaveform,
    audioContext: audioContextRef.current!,
    analyser: analyserRef.current!,
  };
}

function createImpulseResponse(ctx: AudioContext, roomSize: number, dampening: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * 2;
  const buffer = ctx.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * (1 + dampening * 10));
      channelData[i] = (Math.random() * 2 - 1) * envelope * (1 - roomSize * 0.5);
    }
  }

  return buffer;
}