import type { AudioTrack, AudioEffect, AudioEffectType } from "@/types";

export class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNodes: Map<string, AudioBufferSourceNode> = new Map();
  private trackGains: Map<string, GainNode> = new Map();
  private trackPanners: Map<string, StereoPannerNode> = new Map();
  private effectChains: Map<string, AudioNode[]> = new Map();
  private buffers: Map<string, AudioBuffer> = new Map();
  private onEndedCallbacks: Map<string, () => void> = new Map();

  private sampleRate = 48000;
  private bufferSize = 4096;

  async initialize(): Promise<AudioContext> {
    if (this.context) return this.context;

    this.context = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: this.sampleRate,
    });

    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 1;

    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.context.destination);

    return this.context;
  }

  async resume(): Promise<void> {
    if (this.context?.state === "suspended") {
      await this.context.resume();
    }
  }

  async loadBuffer(id: string, url: string): Promise<AudioBuffer> {
    if (!this.context) await this.initialize();
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await this.context!.decodeAudioData(arrayBuffer);
    this.buffers.set(id, buffer);
    return buffer;
  }

  getBuffer(id: string): AudioBuffer | undefined {
    return this.buffers.get(id);
  }

  createEffectChain(trackId: string, effects: AudioEffect[]): AudioNode[] {
    if (!this.context) throw new Error("AudioEngine not initialized");

    const chain: AudioNode[] = [];
    let lastNode: AudioNode = this.context.createGain();

    for (const effect of effects) {
      if (!effect.enabled) continue;

      let node: AudioNode;

      switch (effect.type) {
        case "gain": {
          node = this.context.createGain();
          (node as GainNode).gain.value = effect.params.gain ?? 1;
          break;
        }
        case "filter": {
          node = this.context.createBiquadFilter();
          const filter = node as BiquadFilterNode;
          filter.type = ["lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "peaking", "notch", "allpass"][effect.params.type ?? 0] as BiquadFilterType;
          filter.frequency.value = effect.params.frequency ?? 1000;
          filter.Q.value = effect.params.Q ?? 1;
          break;
        }
        case "compressor": {
          node = this.context.createDynamicsCompressor();
          const comp = node as DynamicsCompressorNode;
          comp.threshold.value = effect.params.threshold ?? -24;
          comp.knee.value = effect.params.knee ?? 30;
          comp.ratio.value = effect.params.ratio ?? 12;
          comp.attack.value = effect.params.attack ?? 0.003;
          comp.release.value = effect.params.release ?? 0.25;
          break;
        }
        case "reverb": {
          const convolver = this.context.createConvolver();
          const reverbBuffer = this.createImpulseResponse(effect.params.roomSize ?? 0.5, effect.params.dampening ?? 0.5);
          convolver.buffer = reverbBuffer;
          const wetGain = this.context.createGain();
          wetGain.gain.value = effect.params.wet ?? 0.3;
          const dryGain = this.context.createGain();
          dryGain.gain.value = effect.params.dry ?? 0.7;
          chain.push(wetGain, dryGain);
          this.effectChains.set(`${trackId}_reverb_wet`, [convolver, wetGain]);
          this.effectChains.set(`${trackId}_reverb_dry`, [dryGain]);
          node = convolver;
          break;
        }
        case "delay": {
          const delayNode = this.context.createDelay();
          delayNode.delayTime.value = effect.params.delayTime ?? 0.5;
          const feedback = this.context.createGain();
          feedback.gain.value = effect.params.feedback ?? 0.3;
          delayNode.connect(feedback);
          feedback.connect(delayNode);
          const wetGain = this.context.createGain();
          wetGain.gain.value = effect.params.wet ?? 0.3;
          const dryGain = this.context.createGain();
          dryGain.gain.value = effect.params.dry ?? 0.7;
          chain.push(wetGain, dryGain);
          node = delayNode;
          break;
        }
        case "eq": {
          const lowFilter = this.context.createBiquadFilter();
          lowFilter.type = "lowshelf";
          lowFilter.frequency.value = effect.params.lowFreq ?? 320;
          lowFilter.gain.value = effect.params.low ?? 0;

          const midFilter = this.context.createBiquadFilter();
          midFilter.type = "peaking";
          midFilter.frequency.value = 1000;
          midFilter.Q.value = 1;
          midFilter.gain.value = effect.params.mid ?? 0;

          const highFilter = this.context.createBiquadFilter();
          highFilter.type = "highshelf";
          highFilter.frequency.value = effect.params.highFreq ?? 3200;
          highFilter.gain.value = effect.params.high ?? 0;

          lowFilter.connect(midFilter);
          midFilter.connect(highFilter);
          chain.push(lowFilter, midFilter);
          node = highFilter;
          break;
        }
        case "distortion": {
          const shaper = this.context.createWaveShaper();
          const curve = this.createDistortionCurve(effect.params.distortion ?? 0.5);
          shaper.curve = new Float32Array(curve.buffer as ArrayBuffer);
          shaper.oversample = "4x";
          node = shaper;
          break;
        }
        case "chorus": {
          const delay = this.context.createDelay();
          delay.delayTime.value = effect.params.delayTime ?? 0.005;
          const lfo = this.context.createOscillator();
          const lfoGain = this.context.createGain();
          lfo.frequency.value = effect.params.frequency ?? 1.5;
          lfoGain.gain.value = effect.params.depth ?? 0.5;
          lfo.connect(lfoGain).connect(delay.delayTime);
          lfo.start();
          const wetGain = this.context.createGain();
          wetGain.gain.value = effect.params.wet ?? 0.5;
          const dryGain = this.context.createGain();
          dryGain.gain.value = effect.params.dry ?? 0.5;
          chain.push(wetGain, dryGain, delay);
          node = delay;
          break;
        }
        case "phaser": {
          const filters: BiquadFilterNode[] = [];
          for (let i = 0; i < (effect.params.octaves ?? 3); i++) {
            const filter = this.context.createBiquadFilter();
            filter.type = "allpass";
            filter.frequency.value = (effect.params.baseFrequency ?? 350) * Math.pow(2, i);
            filters.push(filter);
          }
          for (let i = 0; i < filters.length - 1; i++) {
            const filter = filters[i];
            const nextFilter = filters[i + 1];
            if (filter && nextFilter) {
              filter.connect(nextFilter);
            }
          }
          const wetGain = this.context.createGain();
          wetGain.gain.value = effect.params.wet ?? 0.5;
          const dryGain = this.context.createGain();
          dryGain.gain.value = effect.params.dry ?? 0.5;
          chain.push(wetGain, dryGain, ...filters);
          node = filters[0] as AudioNode;
          break;
        }
        case "tremolo": {
          const gain = this.context.createGain();
          const lfo = this.context.createOscillator();
          const lfoGain = this.context.createGain();
          lfo.frequency.value = effect.params.frequency ?? 5;
          lfoGain.gain.value = effect.params.depth ?? 0.5;
          lfo.connect(lfoGain).connect(gain.gain);
          lfo.start();
          const wetGain = this.context.createGain();
          wetGain.gain.value = effect.params.wet ?? 0.5;
          const dryGain = this.context.createGain();
          dryGain.gain.value = effect.params.dry ?? 0.5;
          chain.push(wetGain, dryGain, gain);
          node = gain;
          break;
        }
        default:
          continue;
      }

      lastNode.connect(node);
      lastNode = node;
      chain.push(node);
    }

    lastNode.connect(this.masterGain!);
    this.effectChains.set(trackId, chain);
    return chain;
  }

  async playTrack(track: AudioTrack, startTime = 0): Promise<void> {
    await this.resume();
    if (!this.context) throw new Error("AudioEngine not initialized");

    let buffer = this.buffers.get(track.id);
    if (!buffer) {
      buffer = await this.loadBuffer(track.id, track.src);
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = track.playbackRate;

    const trackGain = this.context.createGain();
    trackGain.gain.value = track.volume;
    this.trackGains.set(track.id, trackGain);

    const panNode = this.context.createStereoPanner();
    panNode.pan.value = track.pan;
    this.trackPanners.set(track.id, panNode);

    this.createEffectChain(track.id, track.effects);

    source.connect(trackGain);
    trackGain.connect(panNode);
    panNode.connect(this.effectChains.get(track.id)?.[0] ?? this.masterGain!);

    const offset = Math.max(0, startTime - track.startFrame / 30);
    source.start(this.context.currentTime, offset);

    this.sourceNodes.set(track.id, source);

    source.onended = () => {
      this.sourceNodes.delete(track.id);
      this.onEndedCallbacks.get(track.id)?.();
    };
  }

  stopTrack(trackId: string): void {
    const source = this.sourceNodes.get(trackId);
    if (source) {
      try {
        source.stop();
      } catch {}
      this.sourceNodes.delete(trackId);
    }
  }

  stopAll(): void {
    this.sourceNodes.forEach((source) => {
      try { source.stop(); } catch {}
    });
    this.sourceNodes.clear();
  }

  setTrackVolume(trackId: string, volume: number): void {
    const gain = this.trackGains.get(trackId);
    if (gain && this.context) {
      gain.gain.setValueAtTime(volume, this.context.currentTime);
    }
  }

  setTrackPan(trackId: string, pan: number): void {
    const panner = this.trackPanners.get(trackId);
    if (panner && this.context) {
      panner.pan.setValueAtTime(pan, this.context.currentTime);
    }
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain && this.context) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.context.currentTime);
    }
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  getFrequencyData(): Uint8Array | null {
    if (!this.analyser) return null;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  getTimeDomainData(): Uint8Array | null {
    if (!this.analyser) return null;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);
    return data;
  }

  onTrackEnded(trackId: string, callback: () => void): void {
    this.onEndedCallbacks.set(trackId, callback);
  }

  private createImpulseResponse(roomSize: number, dampening: number): AudioBuffer {
    if (!this.context) throw new Error("No context");
    const sampleRate = this.context.sampleRate;
    const length = sampleRate * 2;
    const buffer = this.context.createBuffer(2, length, sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const envelope = Math.exp(-t * (1 + dampening * 10));
        data[i] = (Math.random() * 2 - 1) * envelope * (1 - roomSize * 0.5);
      }
    }
    return buffer;
  }

  private createDistortionCurve(amount: number): Float32Array {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    const maxGain = 100;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = (maxGain * Math.atan(amount * x)) / (maxGain * Math.atan(amount));
    }
    return curve;
  }

  dispose(): void {
    this.stopAll();
    this.buffers.clear();
    this.effectChains.clear();
    this.trackGains.clear();
    this.trackPanners.clear();
    if (this.context) {
      this.context.close();
      this.context = null;
    }
  }
}

export const audioEngine = new AudioEngine();