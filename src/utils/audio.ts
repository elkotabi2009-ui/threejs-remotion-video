export interface AudioAnalysisResult {
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  rms: number;
  peak: number;
  centroid: number;
  rolloff: number;
  flux: number;
}

export interface BeatDetectionResult {
  isBeat: boolean;
  confidence: number;
  bpm: number;
}

export function createAudioContext(sampleRate = 48000): AudioContext {
  return new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
}

export async function loadAudioBuffer(
  context: AudioContext,
  url: string
): Promise<AudioBuffer> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return context.decodeAudioData(arrayBuffer);
}

export function createAnalyser(
  context: AudioContext,
  fftSize = 2048,
  smoothingTimeConstant = 0.8
): AnalyserNode {
  const analyser = context.createAnalyser();
  analyser.fftSize = fftSize;
  analyser.smoothingTimeConstant = smoothingTimeConstant;
  return analyser;
}

export function analyseAudio(analyser: AnalyserNode): AudioAnalysisResult {
  const frequencyData = new Uint8Array(analyser.frequencyBinCount);
  const timeDomainData = new Uint8Array(analyser.frequencyBinCount);

  analyser.getByteFrequencyData(frequencyData);
  analyser.getByteTimeDomainData(timeDomainData);

  const sampleRate = analyser.context?.sampleRate ?? 48000;

  let rms = 0;
  let peak = 0;
  let centroid = 0;
  let totalEnergy = 0;

  for (let i = 0; i < frequencyData.length; i++) {
    const magnitude = frequencyData[i]! / 255;
    const freq = (i * sampleRate) / (analyser.fftSize * 2);

    rms += magnitude * magnitude;
    peak = Math.max(peak, magnitude);
    centroid += freq * magnitude;
    totalEnergy += magnitude;
  }

  rms = Math.sqrt(rms / frequencyData.length);
  centroid = totalEnergy > 0 ? centroid / totalEnergy : 0;

  const rolloffThreshold = 0.85 * totalEnergy;
  let rolloffSum = 0;
  let rolloff = 0;
  for (let i = 0; i < frequencyData.length; i++) {
    rolloffSum += frequencyData[i]! / 255;
    if (rolloffSum >= rolloffThreshold) {
      rolloff = (i * sampleRate) / (analyser.fftSize * 2);
      break;
    }
  }

  return {
    frequencyData,
    timeDomainData,
    rms,
    peak,
    centroid,
    rolloff,
    flux: 0,
  };
}

export function detectBeats(
  analyser: AnalyserNode,
  history: number[],
  threshold = 1.3,
  minInterval = 200
): BeatDetectionResult {
  const analysis = analyseAudio(analyser);
  const now = Date.now();
  const energy = analysis.rms;

  history.push(energy);
  if (history.length > 43) history.shift();

  const avgEnergy = history.reduce((a, b) => a + b, 0) / history.length;
  const variance = history.reduce((sum, val) => sum + Math.pow(val - avgEnergy, 2), 0) / history.length;
  const dynamicThreshold = avgEnergy + threshold * Math.sqrt(variance);

  const isBeat = energy > dynamicThreshold;
  let confidence = 0;
  let bpm = 0;

  if (isBeat && history.length > 10) {
    const recentBeats = history.filter((_, i) => i > history.length - 10);
    const intervals = [];
    for (let i = 1; i < recentBeats.length; i++) {
      if (recentBeats[i]! > dynamicThreshold && recentBeats[i - 1]! <= dynamicThreshold) {
        intervals.push(i);
      }
    }
    if (intervals.length > 1) {
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      bpm = 60000 / (avgInterval * (1000 / 60));
      confidence = Math.min(1, intervals.length / 5);
    }
  }

  return { isBeat, confidence, bpm };
}

export function createGainNode(context: AudioContext, gain = 1): GainNode {
  const node = context.createGain();
  node.gain.value = gain;
  return node;
}

export function createFilterNode(
  context: AudioContext,
  type: BiquadFilterType,
  frequency: number,
  Q = 1
): BiquadFilterNode {
  const node = context.createBiquadFilter();
  node.type = type;
  node.frequency.value = frequency;
  node.Q.value = Q;
  return node;
}

export function createCompressorNode(
  context: AudioContext,
  options: {
    threshold?: number;
    knee?: number;
    ratio?: number;
    attack?: number;
    release?: number;
  } = {}
): DynamicsCompressorNode {
  const node = context.createDynamicsCompressor();
  node.threshold.value = options.threshold ?? -24;
  node.knee.value = options.knee ?? 30;
  node.ratio.value = options.ratio ?? 12;
  node.attack.value = options.attack ?? 0.003;
  node.release.value = options.release ?? 0.25;
  return node;
}

export function createConvolverNode(
  context: AudioContext,
  impulseResponse: AudioBuffer
): ConvolverNode {
  const node = context.createConvolver();
  node.buffer = impulseResponse;
  node.normalize = true;
  return node;
}

export function createDelayNode(
  context: AudioContext,
  delayTime = 0.5,
  feedback = 0.3
): DelayNode {
  const delay = context.createDelay();
  delay.delayTime.value = delayTime;

  const feedbackGain = context.createGain();
  feedbackGain.gain.value = feedback;

  delay.connect(feedbackGain);
  feedbackGain.connect(delay);

  return delay;
}

export function createWaveShaperNode(
  context: AudioContext,
  curve: Float32Array
): WaveShaperNode {
  const node = context.createWaveShaper();
  node.curve = new Float32Array(curve.buffer as ArrayBuffer);
  node.oversample = '4x';
  return node;
}

export function createDistortionCurve(amount: number): Float32Array {
  const samples = 44100;
  const curve = new Float32Array(samples);
  const maxGain = 100;

  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = (maxGain * Math.atan(amount * x)) / (maxGain * Math.atan(amount));
  }

  return curve;
}

export function createImpulseResponse(
  context: AudioContext,
  duration = 2,
  decay = 1
): AudioBuffer {
  const sampleRate = context.sampleRate;
  const length = sampleRate * duration;
  const buffer = context.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * decay);
      channelData[i] = (Math.random() * 2 - 1) * envelope * Math.pow(1 - t / duration, 2);
    }
  }

  return buffer;
}

export function getFrequencyAtBin(analyser: AnalyserNode, bin: number): number {
  return (bin * analyser.context.sampleRate) / analyser.fftSize;
}

export function getBinAtFrequency(analyser: AnalyserNode, frequency: number): number {
  return Math.round((frequency * analyser.fftSize) / analyser.context.sampleRate);
}

export function frequencyToMidiNote(frequency: number): number {
  return 69 + 12 * Math.log2(frequency / 440);
}

export function midiNoteToFrequency(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

export function hzToOctaves(hz: number, reference = 440): number {
  return Math.log2(hz / reference);
}

export function octavesToHz(octaves: number, reference = 440): number {
  return reference * Math.pow(2, octaves);
}

export function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

export function gainToDb(gain: number): number {
  return 20 * Math.log10(gain);
}

export function mixAudioBuffers(
  buffers: AudioBuffer[],
  weights: number[] = []
): Promise<AudioBuffer> {
  if (buffers.length === 0) return Promise.reject(new Error("No buffers provided"));
  const firstBuffer = buffers[0]!;
  const ctx = new OfflineAudioContext(
    firstBuffer.numberOfChannels,
    firstBuffer.length,
    firstBuffer.sampleRate
  );

  const sources = buffers.map((buffer, i) => {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = weights[i] ?? 1;
    source.connect(gain).connect(ctx.destination);
    source.start(0);
    return source;
  });

  return ctx.startRendering();
}

export function trimAudioBuffer(buffer: AudioBuffer, start: number, end: number): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(
    buffer.numberOfChannels,
    (end - start) * buffer.sampleRate,
    buffer.sampleRate
  );

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0, start);

  return ctx.startRendering();
}

export function reverseAudioBuffer(buffer: AudioBuffer): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  );

  const reversed = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const input = buffer.getChannelData(ch)!;
    const output = reversed.getChannelData(ch)!;
    for (let i = 0; i < buffer.length; i++) {
      output[i] = input[buffer.length - 1 - i]!;
    }
  }

  const source = ctx.createBufferSource();
  source.buffer = reversed;
  source.connect(ctx.destination);
  source.start(0);

  return ctx.startRendering();
}

export function normalizeAudioBuffer(buffer: AudioBuffer, targetPeak = 1): Promise<AudioBuffer> {
  let peak = 0;

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch)!;
    for (let i = 0; i < data.length; i++) {
      peak = Math.max(peak, Math.abs(data[i]!));
    }
  }

  if (peak === 0) return Promise.resolve(buffer);

  const gain = targetPeak / peak;
  const ctx = new OfflineAudioContext(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  );

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gainNode = ctx.createGain();
  gainNode.gain.value = gain;
  source.connect(gainNode).connect(ctx.destination);
  source.start(0);

  return ctx.startRendering();
}