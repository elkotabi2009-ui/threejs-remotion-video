import { Asset, VideoSpec } from "./promptParser.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, readdirSync, statSync } from "fs";
import { join, dirname, basename, extname, resolve, relative } from "path";
import { execSync } from "child_process";

// Type declarations for Web Audio API (Node.js polyfill)
interface AudioContextType {
  decodeAudioData(audioData: ArrayBuffer, successCallback: (decodedData: AudioBufferType) => void, errorCallback?: (error: any) => void): void;
  createBufferSource(): AudioBufferSourceNodeType;
  createGain(): GainNodeType;
  createBuffer(numberOfChannels: number, length: number, sampleRate: number): AudioBufferType;
  close(): Promise<void>;
  sampleRate: number;
  currentTime: number;
}
interface AudioBufferType {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  duration: number;
  getChannelData(channel: number): Float32Array;
  copyFromChannel(destination: Float32Array, channelNumber: number, bufferOffset?: number): void;
  copyToChannel(source: Float32Array, channelNumber: number, bufferOffset?: number): void;
}
interface AudioBufferSourceNodeType {
  buffer: AudioBufferType | null;
  connect(destination: AudioNodeType): AudioNodeType;
  start(when?: number): void;
  stop(when?: number): void;
}
interface GainNodeType {
  gain: AudioParamType;
  connect(destination: AudioNodeType): AudioNodeType;
}
interface AudioNodeType {
  connect(destination: AudioNodeType): AudioNodeType;
}
interface AudioParamType {
  value: number;
}

// stub for offline rendering
const globalAudioContext = globalThis as unknown as { AudioContext?: new (options?: { sampleRate?: number }) => AudioContextType };

// ============================================================================
// Types
// ============================================================================

export interface AssetResolutionResult {
  asset: Asset;
  localPath: string;
  source: "cache" | "generated" | "downloaded" | "existing" | "procedural";
  metadata?: Record<string, any>;
}

export interface BlenderAssetOptions {
  type: "city" | "particles" | "terrain" | "abstract" | "text" | "logo" | "character" | "vehicle" | "primitives";
  count?: number;
  complexity?: "low" | "medium" | "high";
  style?: string;
  seed?: number;
  outputPath: string;
}

export interface AssetCacheEntry {
  hash: string;
  path: string;
  createdAt: number;
  size: number;
  metadata: Record<string, any>;
}

export interface AssetResolverConfig {
  cacheDir: string;
  assetsDir: string;
  blenderPath: string;
  blenderScriptsDir: string;
  downloadTimeout: number;
  maxCacheSize: number; // bytes
  polyhavenApiKey?: string;
  sketchfabApiKey?: string;
}

// Asset Manifest types (the main output interface)
export interface AssetManifest {
  models: AssetManifestEntry[];
  audio: AudioAssetManifestEntry[];
  textures: AssetManifestEntry[];
  images: AssetManifestEntry[];
  fonts: AssetManifestEntry[];
  shaders: AssetManifestEntry[];
  video: AssetManifestEntry[];
}

export interface AssetManifestEntry {
  id: string;
  path: string;
  source: "cache" | "generated" | "downloaded" | "existing" | "procedural";
  type?: string;
  metadata?: Record<string, any>;
}

export interface AudioAssetManifestEntry extends AssetManifestEntry {
  audioType?: "music" | "sfx" | "voiceover" | "procedural";
  duration?: number;
  bpm?: number;
  beatTimes?: number[];
}

// Audio generation types
export interface ProceduralAudioOptions {
  type: "synth" | "noise" | "beats" | "ambient" | "tone";
  duration: number; // seconds
  sampleRate?: number;
  // Synth options
  waveform?: "sine" | "square" | "sawtooth" | "triangle";
  frequency?: number;
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  // Noise options
  noiseType?: "white" | "pink" | "brown";
  // Beats options
  bpm?: number;
  pattern?: number[]; // 16-step pattern
  kit?: "acoustic" | "electronic" | "808" | "909";
  // Ambient options
  layers?: Array<{
    type: "drone" | "pad" | "texture";
    frequency?: number;
    volume: number;
  }>;
}

// ============================================================================
// Asset Resolver Class
// ============================================================================

export class AssetResolver {
  private config: AssetResolverConfig;
  private cache: Map<string, AssetCacheEntry> = new Map();
  private audioContext: AudioContextType | null = null;

  constructor(config?: Partial<AssetResolverConfig>) {
    this.config = {
      cacheDir: config?.cacheDir || join(process.cwd(), ".asset-cache"),
      assetsDir: config?.assetsDir || join(process.cwd(), "public", "assets"),
      blenderPath: config?.blenderPath || "blender",
      blenderScriptsDir: config?.blenderScriptsDir || join(process.cwd(), "blender"),
      downloadTimeout: config?.downloadTimeout || 60000,
      maxCacheSize: config?.maxCacheSize || 500 * 1024 * 1024, // 500MB
      polyhavenApiKey: config?.polyhavenApiKey,
      sketchfabApiKey: config?.sketchfabApiKey,
    };

    this.ensureDirectories();
    this.loadCacheIndex();
  }

  private ensureDirectories(): void {
    [this.config.cacheDir, this.config.assetsDir].forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });

    // Create subdirectories for asset types
    ["models", "textures", "audio", "images", "fonts", "shaders", "video"].forEach(type => {
      const typeDir = join(this.config.assetsDir, type);
      if (!existsSync(typeDir)) {
        mkdirSync(typeDir, { recursive: true });
      }

      // Create generated subdirectories
      const generatedDir = join(typeDir, "generated");
      if (!existsSync(generatedDir)) {
        mkdirSync(generatedDir, { recursive: true });
      }
    });
  }

  private loadCacheIndex(): void {
    const indexPath = join(this.config.cacheDir, "index.json");
    if (existsSync(indexPath)) {
      try {
        const data = JSON.parse(readFileSync(indexPath, "utf-8"));
        for (const [hash, entry] of Object.entries(data)) {
          this.cache.set(hash, entry as AssetCacheEntry);
        }
      } catch (e) {
        console.warn("Failed to load asset cache index:", e);
      }
    }
  }

  private saveCacheIndex(): void {
    const indexPath = join(this.config.cacheDir, "index.json");
    const data = Object.fromEntries(this.cache);
    writeFileSync(indexPath, JSON.stringify(data, null, 2));
  }

  // ============================================================================
  // Public Methods - Main Interface
  // ============================================================================

  /**
   * Resolve all assets for a VideoSpec and return an AssetManifest
   * This is the main entry point matching the required interface
   */
  async resolveAssets(spec: VideoSpec): Promise<AssetManifest> {
    const manifest: AssetManifest = {
      models: [],
      audio: [],
      textures: [],
      images: [],
      fonts: [],
      shaders: [],
      video: [],
    };

    // Resolve scene assets
    for (const scene of spec.scenes) {
      for (const asset of scene.assets) {
        const result = await this.resolve(asset);
        this.addToManifest(manifest, result);
      }
    }

    // Resolve audio assets
    if (spec.audio.backgroundMusic) {
      const asset: Asset = {
        id: "bg-music",
        type: "audio",
        src: spec.audio.backgroundMusic.src,
        metadata: { audioType: "music", volume: spec.audio.backgroundMusic.volume, loop: spec.audio.backgroundMusic.loop }
      };
      const result = await this.resolve(asset);
      this.addToManifest(manifest, result);
    }

    if (spec.audio.voiceover) {
      const asset: Asset = {
        id: "voiceover",
        type: "audio",
        src: spec.audio.voiceover.src,
        metadata: { audioType: "voiceover", volume: spec.audio.voiceover.volume }
      };
      const result = await this.resolve(asset);
      this.addToManifest(manifest, result);
    }

    for (const sfx of spec.audio.sfx) {
      const asset: Asset = {
        id: sfx.id,
        type: "audio",
        src: sfx.src,
        metadata: { audioType: "sfx", trigger: sfx.trigger, volume: sfx.volume, pitch: sfx.pitch }
      };
      const result = await this.resolve(asset);
      this.addToManifest(manifest, result);
    }

    // If beat sync is enabled, generate beat detection data for audio
    if (spec.audio.beatSync) {
      await this.enhanceWithBeatDetection(manifest);
    }

    return manifest;
  }

  /**
   * Resolve a single asset
   */
  async resolve(asset: Asset): Promise<AssetResolutionResult> {
    // Check cache first
    const cacheKey = this.getCacheKey(asset);
    const cached = this.cache.get(cacheKey);

    if (cached && existsSync(cached.path)) {
      return {
        asset,
        localPath: cached.path,
        source: "cache",
        metadata: cached.metadata,
      };
    }

    // Check if already exists in assets directory
    const localPath = this.getLocalPath(asset);
    if (existsSync(localPath)) {
      this.addToCache(cacheKey, localPath, asset);
      return {
        asset,
        localPath,
        source: "existing",
      };
    }

    // Search in public directories first
    const publicPath = this.findInPublicDirs(asset);
    if (publicPath) {
      const copiedPath = await this.copyToAssetsDir(publicPath, localPath);
      this.addToCache(cacheKey, copiedPath, asset);
      return {
        asset,
        localPath: copiedPath,
        source: "existing",
      };
    }

    // Determine resolution strategy based on source
    let result: AssetResolutionResult;

    if (asset.src.startsWith("http://") || asset.src.startsWith("https://")) {
      result = await this.downloadAsset(asset, localPath);
    } else if (asset.src.startsWith("./") || asset.src.startsWith("../")) {
      result = await this.copyLocalAsset(asset, localPath);
    } else if (asset.src.startsWith("blender://")) {
      result = await this.generateWithBlender(asset, localPath);
    } else if (asset.src.startsWith("procedural://")) {
      result = await this.generateProcedural(asset, localPath);
    } else if (asset.src.startsWith("polyhaven://")) {
      result = await this.downloadFromPolyhaven(asset, localPath);
    } else if (asset.src.startsWith("sketchfab://")) {
      result = await this.downloadFromSketchfab(asset, localPath);
    } else if (asset.src.startsWith("audio://")) {
      result = await this.generateProceduralAudio(asset, localPath);
    } else {
      // Treat as relative path
      result = await this.copyLocalAsset(asset, localPath);
    }

    // Add to cache
    this.addToCache(cacheKey, result.localPath, asset, result.metadata);
    return result;
  }

  /**
   * Resolve all assets from a VideoSpec
   */
  async resolveAll(spec: VideoSpec): Promise<AssetResolutionResult[]> {
    const allAssets: Asset[] = [];

    // Extract assets from scenes
    for (const scene of spec.scenes) {
      if (scene.assets) {
        allAssets.push(...scene.assets);
      }
    }

    // Convert and extract audio assets to Asset type
    if (spec.audio?.backgroundMusic) {
      const bm = spec.audio.backgroundMusic;
      allAssets.push({
        id: `bgm-${Date.now()}`,
        type: "audio",
        src: bm.src,
        name: "backgroundMusic",
        metadata: { audioType: "music", volume: bm.volume, loop: bm.loop, fadeIn: bm.fadeIn, fadeOut: bm.fadeOut, startTime: bm.startTime },
      });
    }
    if (spec.audio?.voiceover) {
      const vo = spec.audio.voiceover;
      allAssets.push({
        id: `vo-${Date.now()}`,
        type: "audio",
        src: vo.src,
        name: "voiceover",
        metadata: { audioType: "voiceover", volume: vo.volume, startTime: vo.startTime, language: vo.language },
      });
    }
    if (spec.audio?.sfx) {
      for (const sfx of spec.audio.sfx) {
        allAssets.push({
          id: sfx.id,
          type: "audio",
          src: sfx.src,
          name: `sfx-${sfx.id}`,
          metadata: { audioType: "sfx", volume: sfx.volume, pitch: sfx.pitch, trigger: sfx.trigger, time: sfx.time, event: sfx.event },
        });
      }
    }

    // Resolve all assets
    const results: AssetResolutionResult[] = [];
    for (const asset of allAssets) {
      try {
        const result = await this.resolve(asset);
        results.push(result);
      } catch (error) {
        console.warn(`Failed to resolve asset ${asset.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Add resolved asset to manifest
   */
  private addToManifest(manifest: AssetManifest, result: AssetResolutionResult): void {
    const entry: AssetManifestEntry = {
      id: result.asset.id,
      path: relative(this.config.assetsDir, result.localPath),
      source: result.source,
      metadata: result.metadata,
    };

    // Add audio-specific metadata
    if (result.asset.type === "audio") {
      const audioEntry = entry as AudioAssetManifestEntry;
      audioEntry.audioType = result.asset.metadata?.audioType;
      audioEntry.duration = result.metadata?.duration;
      audioEntry.bpm = result.metadata?.bpm;
      audioEntry.beatTimes = result.metadata?.beatTimes;
      manifest.audio.push(audioEntry);
    } else {
      // Add to appropriate array based on type
      const typePlural = result.asset.type + "s";
      if (typePlural in manifest) {
        (manifest as any)[typePlural].push(entry);
      } else {
        manifest.models.push(entry); // fallback
      }
    }
  }

  // ============================================================================
  // 3D Model Generation (Blender)
  // ============================================================================

  /**
   * Generate asset using Blender
   */
  async generateWithBlender(asset: Asset, outputPath: string): Promise<AssetResolutionResult> {
    const blenderScript = join(this.config.blenderScriptsDir, "generate_assets.py");

    if (!existsSync(blenderScript)) {
      throw new Error(`Blender script not found: ${blenderScript}`);
    }

    // Ensure output directory exists
    mkdirSync(dirname(outputPath), { recursive: true });

    // Parse blender:// URL
    // Format: blender://type?param1=value1&param2=value2
    const url = new URL(asset.src.replace("blender://", "https://"));
    const type = url.hostname as BlenderAssetOptions["type"];
    const params = Object.fromEntries(url.searchParams);

    const options: BlenderAssetOptions = {
      type,
      count: parseInt(params.count || "10"),
      complexity: (params.complexity as BlenderAssetOptions["complexity"]) || "medium",
      style: params.style || "default",
      seed: params.seed ? parseInt(params.seed) : undefined,
      outputPath,
    };

    await this.runBlenderScript("generate_assets.py", options);

    return {
      asset,
      localPath: outputPath,
      source: "generated",
      metadata: { generator: "blender", type, options },
    };
  }

  /**
   * Run Blender script with options
   */
  private async runBlenderScript(scriptName: string, options: any): Promise<void> {
    const scriptPath = join(this.config.blenderScriptsDir, scriptName);
    const args = JSON.stringify(options);

    const command = `"${this.config.blenderPath}" --background --python "${scriptPath}" -- "${args}"`;

    try {
      execSync(command, {
        stdio: "inherit",
        timeout: 300000, // 5 minutes
      });
    } catch (error) {
      throw new Error(`Blender script failed: ${error}`);
    }
  }

  // ============================================================================
  // Procedural Texture/Image Generation
  // ============================================================================

  /**
   * Generate procedural asset (textures, gradients, noise, shapes, text)
   */
  async generateProcedural(asset: Asset, outputPath: string): Promise<AssetResolutionResult> {
    const url = new URL(asset.src.replace("procedural://", "https://"));
    const type = url.hostname;
    const params = Object.fromEntries(url.searchParams);

    mkdirSync(dirname(outputPath), { recursive: true });

    switch (type) {
      case "gradient":
        await this.generateGradientTexture(outputPath, params);
        break;
      case "noise":
        await this.generateNoiseTexture(outputPath, params);
        break;
      case "shape":
        await this.generateShapeTexture(outputPath, params);
        break;
      case "text":
        await this.generateTextTexture(outputPath, params);
        break;
      case "pattern":
        await this.generatePatternTexture(outputPath, params);
        break;
      default:
        throw new Error(`Unknown procedural type: ${type}`);
    }

    return {
      asset,
      localPath: outputPath,
      source: "generated",
      metadata: { generator: "procedural", type, params },
    };
  }

  private async generateGradientTexture(outputPath: string, params: Record<string, string>): Promise<void> {
    const { createCanvas } = await import("canvas");
    const width = parseInt(params.width || "512");
    const height = parseInt(params.height || "512");
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    const colors = (params.colors || "#0a0a2e,#16213e,#0f3460,#e94560").split(",");
    const direction = params.direction || "vertical";

    const gradient = direction === "vertical"
      ? ctx.createLinearGradient(0, 0, 0, height)
      : ctx.createLinearGradient(0, 0, width, 0);

    colors.forEach((color, i) => {
      gradient.addColorStop(i / (colors.length - 1), color);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const buffer = canvas.toBuffer("image/png");
    writeFileSync(outputPath, buffer);
  }

  private async generateNoiseTexture(outputPath: string, params: Record<string, string>): Promise<void> {
    const { createCanvas } = await import("canvas");
    const width = parseInt(params.width || "512");
    const height = parseInt(params.height || "512");
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    const scale = parseFloat(params.scale || "0.01");
    const octaves = parseInt(params.octaves || "4");
    const persistence = parseFloat(params.persistence || "0.5");

    // Perlin-like noise
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let value = 0;
        let amplitude = 1;
        let frequency = scale;

        for (let o = 0; o < octaves; o++) {
          const nx = x * frequency;
          const ny = y * frequency;
          value += this.noise2D(nx, ny) * amplitude;
          amplitude *= persistence;
          frequency *= 2;
        }

        value = (value + 1) / 2; // Normalize to 0-1
        const idx = (y * width + x) * 4;
        const gray = Math.floor(value * 255);
        data[idx] = gray;
        data[idx + 1] = gray;
        data[idx + 2] = gray;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    const buffer = canvas.toBuffer("image/png");
    writeFileSync(outputPath, buffer);
  }

  private noise2D(x: number, y: number): number {
    // Simple hash-based noise
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1;
  }

  private async generateShapeTexture(outputPath: string, params: Record<string, string>): Promise<void> {
    const { createCanvas } = await import("canvas");
    const width = parseInt(params.width || "512");
    const height = parseInt(params.height || "512");
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = params.background || "#0a0a2e";
    ctx.fillRect(0, 0, width, height);

    const shape = params.shape || "circle";
    const color = params.color || "#e94560";
    const size = parseInt(params.size || "100");
    const cx = width / 2;
    const cy = height / 2;

    ctx.fillStyle = color;

    switch (shape) {
      case "circle":
        ctx.beginPath();
        ctx.arc(cx, cy, size, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "square":
        ctx.fillRect(cx - size, cy - size, size * 2, size * 2);
        break;
      case "triangle":
        ctx.beginPath();
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx + size, cy + size);
        ctx.lineTo(cx - size, cy + size);
        ctx.closePath();
        ctx.fill();
        break;
    }

    const buffer = canvas.toBuffer("image/png");
    writeFileSync(outputPath, buffer);
  }

  private async generateTextTexture(outputPath: string, params: Record<string, string>): Promise<void> {
    const { createCanvas } = await import("canvas");
    const width = parseInt(params.width || "512");
    const height = parseInt(params.height || "512");
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = params.background || "transparent";
    if (params.background !== "transparent") {
      ctx.fillRect(0, 0, width, height);
    }

    ctx.font = `${params.fontSize || "48"}px ${params.fontFamily || "Arial"}`;
    ctx.fillStyle = params.color || "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const text = params.text || "TEXT";
    ctx.fillText(text, width / 2, height / 2);

    // Add outline if requested
    if (params.outline) {
      ctx.strokeStyle = params.outlineColor || "#000000";
      ctx.lineWidth = parseInt(params.outlineWidth || "4");
      ctx.strokeText(text, width / 2, height / 2);
    }

    const buffer = canvas.toBuffer("image/png");
    writeFileSync(outputPath, buffer);
  }

  private async generatePatternTexture(outputPath: string, params: Record<string, string>): Promise<void> {
    const { createCanvas } = await import("canvas");
    const width = parseInt(params.width || "512");
    const height = parseInt(params.height || "512");
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    const pattern = params.pattern || "grid";
    const color1 = params.color1 || "#0a0a2e";
    const color2 = params.color2 || "#16213e";
    const spacing = parseInt(params.spacing || "32");

    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = color2;

    switch (pattern) {
      case "grid":
        for (let x = 0; x < width; x += spacing) {
          for (let y = 0; y < height; y += spacing) {
            if ((x / spacing + y / spacing) % 2 === 0) {
              ctx.fillRect(x, y, spacing, spacing);
            }
          }
        }
        break;
      case "dots":
        for (let x = spacing / 2; x < width; x += spacing) {
          for (let y = spacing / 2; y < height; y += spacing) {
            ctx.beginPath();
            ctx.arc(x, y, spacing / 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      case "lines":
        for (let x = 0; x < width; x += spacing) {
          ctx.fillRect(x, 0, 2, height);
        }
        break;
      case "crosshatch":
        for (let x = -height; x < width; x += spacing) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x + height, height);
          ctx.strokeStyle = color2;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        break;
    }

    const buffer = canvas.toBuffer("image/png");
    writeFileSync(outputPath, buffer);
  }

  // ============================================================================
  // Audio Generation (Web Audio API via Node)
  // ============================================================================

  /**
   * Generate procedural audio using Web Audio API (offline rendering)
   */
  async generateProceduralAudio(asset: Asset, outputPath: string): Promise<AssetResolutionResult> {
    const url = new URL(asset.src.replace("audio://", "https://"));
    const type = url.hostname as ProceduralAudioOptions["type"];
    const params = Object.fromEntries(url.searchParams);

    const options: ProceduralAudioOptions = {
      type,
      duration: parseFloat(params.duration || "5"),
      sampleRate: parseInt(params.sampleRate || "44100"),
      waveform: (params.waveform as any) || "sine",
      frequency: parseFloat(params.frequency || "440"),
      attack: parseFloat(params.attack || "0.01"),
      decay: parseFloat(params.decay || "0.1"),
      sustain: parseFloat(params.sustain || "0.5"),
      release: parseFloat(params.release || "0.5"),
      noiseType: (params.noiseType as any) || "white",
      bpm: parseInt(params.bpm || "120"),
      pattern: params.pattern ? params.pattern.split(",").map(Number) : undefined,
      kit: (params.kit as any) || "electronic",
      layers: params.layers ? JSON.parse(params.layers) : undefined,
    };

    mkdirSync(dirname(outputPath), { recursive: true });

    const audioBuffer = await this.renderAudioOffline(options);
    await this.saveAudioBuffer(audioBuffer, outputPath);

    // Detect beats if it's a beat-based audio
    let beatTimes: number[] = [];
    let bpm = options.bpm;
    if (type === "beats") {
      beatTimes = this.detectBeats(audioBuffer);
      bpm = this.estimateBPM(beatTimes);
    }

    return {
      asset,
      localPath: outputPath,
      source: "procedural",
      metadata: {
        generator: "web-audio",
        type,
        options,
        duration: options.duration,
        bpm,
        beatTimes,
      },
    };
  }

  /**
   * Initialize AudioContext for offline rendering
   */
  private getAudioContext(sampleRate: number = 44100): AudioContextType {
    if (!this.audioContext || this.audioContext.sampleRate !== sampleRate) {
      // Use OfflineAudioContext for Node.js (requires web-audio-api polyfill)
      // For Node, we'll use a simple WAV generation approach
      // In a real implementation, you'd use `npm install web-audio-api` or similar
      class MockAudioContext implements AudioContextType {
        sampleRate = sampleRate;
        currentTime = 0;
        decodeAudioData(audioData: ArrayBuffer, successCallback: (decodedData: AudioBufferType) => void): void {
          setTimeout(() => successCallback(undefined as any), 0);
        }
        createBufferSource(): any { return { buffer: null, connect: () => {}, start: () => {}, stop: () => {} }; }
        createGain(): any { return { gain: { value: 1 }, connect: () => {} }; }
        createBuffer(channels: number, length: number, rate: number): AudioBufferType {
          return { numberOfChannels: channels, length, sampleRate: rate, duration: length / rate,
            getChannelData: () => new Float32Array(length),
            copyFromChannel: () => {}, copyToChannel: () => {} };
        }
        close(): Promise<void> { return Promise.resolve(); }
      }
      this.audioContext = new MockAudioContext();
    }
    return this.audioContext;
  }

  /**
   * Render audio offline using Web Audio API concepts (implemented in Node)
   */
  private async renderAudioOffline(options: ProceduralAudioOptions): Promise<AudioBufferType> {
    const sampleRate = options.sampleRate || 44100;
    const duration = options.duration;
    const length = Math.ceil(sampleRate * duration);
    const numberOfChannels = 2;

    // Create a mock AudioBuffer-like object (since we might not have web-audio-api in Node)
    // In production, use @ircam/web-audio-api or similar
    const channelData: Float32Array[] = [];
    for (let c = 0; c < numberOfChannels; c++) {
      channelData.push(new Float32Array(length));
    }

    switch (options.type) {
      case "synth":
        this.generateSynth(channelData, options, sampleRate);
        break;
      case "noise":
        this.generateNoise(channelData, options, sampleRate);
        break;
      case "beats":
        this.generateBeats(channelData, options, sampleRate);
        break;
      case "ambient":
        this.generateAmbient(channelData, options, sampleRate);
        break;
      case "tone":
        this.generateTone(channelData, options, sampleRate);
        break;
    }

    // Apply envelope to all channels
    this.applyEnvelope(channelData, options, sampleRate);

    // Return mock AudioBuffer
    return {
      sampleRate,
      length,
      duration,
      numberOfChannels,
      getChannelData: (channel: number) => channelData[channel],
      copyFromChannel: (destination: Float32Array, channel: number, start?: number) => {
        const src = channelData[channel];
        destination.set(src.subarray(start || 0, (start || 0) + destination.length));
      },
      copyToChannel: () => {},
    } as unknown as AudioBufferType;
  }

  private generateSynth(channelData: Float32Array[], options: ProceduralAudioOptions, sampleRate: number): void {
    const { frequency = 440, waveform = "sine", duration = 5 } = options;
    const length = channelData[0].length;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const phase = 2 * Math.PI * frequency * t;
      let value = 0;

      switch (waveform) {
        case "sine":
          value = Math.sin(phase);
          break;
        case "square":
          value = Math.sin(phase) > 0 ? 1 : -1;
          break;
        case "sawtooth":
          value = 2 * (phase / (2 * Math.PI) - Math.floor(phase / (2 * Math.PI) + 0.5));
          break;
        case "triangle":
          value = 2 * Math.abs(2 * (phase / (2 * Math.PI) - Math.floor(phase / (2 * Math.PI) + 0.5))) - 1;
          break;
      }

      for (const channel of channelData) {
        channel[i] = value;
      }
    }
  }

  private generateNoise(channelData: Float32Array[], options: ProceduralAudioOptions, sampleRate: number): void {
    const { noiseType = "white", duration = 5 } = options;
    const length = channelData[0].length;

    let lastOut = 0;
    for (let i = 0; i < length; i++) {
      let value = Math.random() * 2 - 1;

      if (noiseType === "pink") {
        // Simple pink noise approximation
        value = (value + lastOut) * 0.5;
        lastOut = value;
      } else if (noiseType === "brown") {
        // Brown noise (random walk)
        value = lastOut + (Math.random() - 0.5) * 0.1;
        lastOut = Math.max(-1, Math.min(1, value));
      }

      for (const channel of channelData) {
        channel[i] = value;
      }
    }
  }

  private generateBeats(channelData: Float32Array[], options: ProceduralAudioOptions, sampleRate: number): void {
    const { bpm = 120, pattern = [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0], kit = "electronic", duration = 5 } = options;
    const length = channelData[0].length;
    const beatInterval = (60 / bpm) * sampleRate;
    const stepsPerBeat = 4; // 16th notes
    const stepInterval = beatInterval / stepsPerBeat;
    const totalSteps = Math.ceil(length / stepInterval);

    // Simple drum synthesis
    const kick = this.createKick(sampleRate);
    const snare = this.createSnare(sampleRate);
    const hihat = this.createHiHat(sampleRate);

    for (let step = 0; step < totalSteps; step++) {
      const patternIndex = step % pattern.length;
      if (!pattern[patternIndex]) continue;

      const sampleIndex = Math.floor(step * stepInterval);
      if (sampleIndex >= length) break;

      // Determine which drum based on step position
      const beatPosition = step % 16;
      let drum: Float32Array | null = null;

      if (beatPosition % 4 === 0) {
        drum = kick; // Kick on downbeats
      } else if (beatPosition % 4 === 2) {
        drum = snare; // Snare on backbeats
      } else if (beatPosition % 2 === 1) {
        drum = hihat; // Hi-hat on offbeats
      }

      if (drum) {
        this.mixIn(channelData, drum, sampleIndex, 0.7);
      }
    }
  }

  private createKick(sampleRate: number): Float32Array {
    const duration = 0.5;
    const length = Math.ceil(sampleRate * duration);
    const buffer = new Float32Array(length);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const freq = 150 * Math.exp(-t * 30) + 30;
      const phase = 2 * Math.PI * freq * t;
      const env = Math.exp(-t * 8);
      buffer[i] = Math.sin(phase) * env;
    }
    return buffer;
  }

  private createSnare(sampleRate: number): Float32Array {
    const duration = 0.3;
    const length = Math.ceil(sampleRate * duration);
    const buffer = new Float32Array(length);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // Tone component
      const tone = Math.sin(2 * Math.PI * 200 * t) * Math.exp(-t * 20);
      // Noise component
      const noise = (Math.random() * 2 - 1) * Math.exp(-t * 30);
      buffer[i] = (tone + noise * 0.5) * Math.exp(-t * 10);
    }
    return buffer;
  }

  private createHiHat(sampleRate: number): Float32Array {
    const duration = 0.1;
    const length = Math.ceil(sampleRate * duration);
    const buffer = new Float32Array(length);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // High frequency noise with quick decay
      buffer[i] = (Math.random() * 2 - 1) * Math.exp(-t * 100) * 0.3;
    }
    return buffer;
  }

  private generateAmbient(channelData: Float32Array[], options: ProceduralAudioOptions, sampleRate: number): void {
    const { layers = [{ type: "drone", frequency: 110, volume: 0.3 }, { type: "pad", frequency: 220, volume: 0.2 }, { type: "texture", volume: 0.1 }], duration = 10 } = options;
    const length = channelData[0].length;

    for (const layer of layers) {
      if (layer.type === "drone" && layer.frequency) {
        this.addDrone(channelData, layer.frequency, layer.volume, sampleRate, length);
      } else if (layer.type === "pad" && layer.frequency) {
        this.addPad(channelData, layer.frequency, layer.volume, sampleRate, length);
      } else if (layer.type === "texture") {
        this.addTexture(channelData, layer.volume, sampleRate, length);
      }
    }
  }

  private addDrone(channelData: Float32Array[], freq: number, volume: number, sampleRate: number, length: number): void {
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // Multiple detuned oscillators for richness
      let value = 0;
      for (let detune = -2; detune <= 2; detune++) {
        const detunedFreq = freq * Math.pow(2, detune / 1200);
        value += Math.sin(2 * Math.PI * detunedFreq * t) * 0.2;
      }
      // Slow modulation
      value *= 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.1 * t);
      for (const channel of channelData) {
        channel[i] += value * volume;
      }
    }
  }

  private addPad(channelData: Float32Array[], freq: number, volume: number, sampleRate: number, length: number): void {
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // Chord-like pad (root, fifth, octave)
      let value = 0;
      [0, 7, 12].forEach(semitone => {
        const noteFreq = freq * Math.pow(2, semitone / 12);
        value += Math.sin(2 * Math.PI * noteFreq * t) * 0.33;
      })
      // Slow attack and release
      const attack = Math.min(1, t / 2);
      const release = Math.max(0, 1 - (t - (length / sampleRate - 3)) / 3);
      value *= attack * release * Math.max(0, Math.sin(2 * Math.PI * 0.05 * t));
      for (const channel of channelData) {
        channel[i] += value * volume;
      }
    }
  }

  private addTexture(channelData: Float32Array[], volume: number, sampleRate: number, length: number): void {
    for (let i = 0; i < length; i++) {
      // Granular texture
      const grainSize = sampleRate * 0.05; // 50ms grains
      const grainPos = i % grainSize;
      const grainProgress = grainPos / grainSize;
      const grainEnv = Math.sin(Math.PI * grainProgress);
      const grainPitch = 1 + (Math.random() - 0.5) * 0.1;
      const value = (Math.random() * 2 - 1) * grainEnv * grainPitch * 0.1;
      for (const channel of channelData) {
        channel[i] += value * volume;
      }
    }
  }

  private generateTone(channelData: Float32Array[], options: ProceduralAudioOptions, sampleRate: number): void {
    const { frequency = 440, duration = 2 } = options;
    const length = channelData[0].length;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const value = Math.sin(2 * Math.PI * frequency * t);
      for (const channel of channelData) {
        channel[i] = value;
      }
    }
  }

  private applyEnvelope(channelData: Float32Array[], options: ProceduralAudioOptions, sampleRate: number): void {
    const { attack = 0.01, decay = 0.1, sustain = 0.5, release = 0.5, duration = 5 } = options;
    const length = channelData[0].length;
    const totalSamples = duration * sampleRate;
    const attackSamples = attack * sampleRate;
    const decaySamples = decay * sampleRate;
    const releaseSamples = release * sampleRate;
    const sustainStart = attackSamples + decaySamples;
    const sustainEnd = totalSamples - releaseSamples;

    for (let i = 0; i < length; i++) {
      let env = 1;
      if (i < attackSamples) {
        env = i / attackSamples;
      } else if (i < sustainStart) {
        const decayProgress = (i - attackSamples) / decaySamples;
        env = 1 - decayProgress * (1 - sustain);
      } else if (i > sustainEnd) {
        const releaseProgress = (i - sustainEnd) / releaseSamples;
        env = sustain * (1 - releaseProgress);
      } else {
        env = sustain;
      }

      for (const channel of channelData) {
        channel[i] *= Math.max(0, env);
      }
    }
  }

  private mixIn(channelData: Float32Array[], source: Float32Array, offset: number, gain: number = 1): void {
    const end = Math.min(channelData[0].length, offset + source.length);
    for (let i = offset, j = 0; i < end; i++, j++) {
      for (const channel of channelData) {
        channel[i] += source[j] * gain;
        // Soft clip
        if (channel[i] > 1) channel[i] = 1;
        if (channel[i] < -1) channel[i] = -1;
      }
    }
  }

  /**
   * Beat detection from audio buffer
   */
  private detectBeats(audioBuffer: AudioBufferType): number[] {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const hopSize = 512;
    const beats: number[] = [];

    // Simple onset detection using spectral flux
    let prevSpectrum = new Float32Array(hopSize / 2);

    for (let i = 0; i < channelData.length; i += hopSize) {
      const frame = channelData.subarray(i, i + hopSize);
      if (frame.length < hopSize) break;

      // Compute simple energy-based onset
      let energy = 0;
      for (let j = 0; j < frame.length; j++) {
        energy += frame[j] * frame[j];
      }
      energy /= frame.length;

      // Threshold-based onset detection
      if (energy > 0.01) { // Threshold
        const time = i / sampleRate;
        // Avoid duplicate beats (minimum 50ms apart)
        if (beats.length === 0 || time - beats[beats.length - 1] > 0.05) {
          beats.push(time);
        }
      }
    }

    return beats;
  }

  /**
   * Estimate BPM from beat times
   */
  private estimateBPM(beatTimes: number[]): number {
    if (beatTimes.length < 2) return 120;

    const intervals: number[] = [];
    for (let i = 1; i < beatTimes.length; i++) {
      intervals.push(beatTimes[i] - beatTimes[i - 1]);
    }

    // Find most common interval (mode)
    const intervalCounts: Map<number, number> = new Map();
    for (const interval of intervals) {
      const rounded = Math.round(interval * 100) / 100; // Round to 10ms
      intervalCounts.set(rounded, (intervalCounts.get(rounded) || 0) + 1);
    }

    let maxCount = 0;
    let bestInterval = 0.5;
    for (const [interval, count] of Array.from(intervalCounts.entries())) {
      if (count > maxCount) {
        maxCount = count;
        bestInterval = interval;
      }
    }

    return Math.round(60 / bestInterval);
  }

  /**
   * Save audio buffer as WAV file
   */
  private async saveAudioBuffer(audioBuffer: AudioBufferType, outputPath: string): Promise<void> {
    const sampleRate = audioBuffer.sampleRate;
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const bytesPerSample = 2; // 16-bit
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;

    const buffer = Buffer.alloc(totalSize);

    // RIFF header
    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(totalSize - 8, 4);
    buffer.write("WAVE", 8);

    // fmt chunk
    buffer.write("fmt ", 12);
    buffer.writeUInt32LE(16, 16); // chunk size
    buffer.writeUInt16LE(1, 20); // PCM format
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(16, 34); // bits per sample

    // data chunk
    buffer.write("data", 36);
    buffer.writeUInt32LE(dataSize, 40);

    // Interleave channels
    const channelData: Float32Array[] = [];
    for (let c = 0; c < numChannels; c++) {
      channelData.push(audioBuffer.getChannelData(c));
    }

    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let c = 0; c < numChannels; c++) {
        const sample = Math.max(-1, Math.min(1, channelData[c][i]));
        buffer.writeInt16LE(Math.round(sample * 32767), offset);
        offset += 2;
      }
    }

    writeFileSync(outputPath, buffer);
  }

  /**
   * Download from Polyhaven (optional)
   */
  private async downloadFromPolyhaven(asset: Asset, outputPath: string): Promise<AssetResolutionResult> {
    if (!this.config.polyhavenApiKey) {
      throw new Error("Polyhaven API key not configured");
    }

    // Parse polyhaven:// URL: polyhaven://model_name?resolution=1k&format=gltf
    const url = new URL(asset.src.replace("polyhaven://", "https://"));
    const assetName = url.hostname;
    const params = Object.fromEntries(url.searchParams);

    const apiUrl = `https://api.polyhaven.com/files/${assetName}`;
    const response = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${this.config.polyhavenApiKey}` },
      signal: AbortSignal.timeout(this.config.downloadTimeout),
    });

    if (!response.ok) {
      throw new Error(`Polyhaven API error: ${response.status}`);
    }

    const data = (await response.json()) as { files?: Record<string, any> };
    // Find appropriate file (GLTF/GLB)
    const files = (data.files || {}) as Record<string, any>;
    const gltfFiles = (files.gltf || files.glb) as Record<string, { url?: string }> | undefined;
    if (!gltfFiles) {
      throw new Error("No GLTF/GLB files available for this asset");
    }

    // Select resolution
    const resolution = params.resolution || "1k";
    const downloadUrl = gltfFiles[resolution]?.url || Object.values(gltfFiles)[0]?.url;

    if (!downloadUrl) {
      throw new Error(`No download URL found for resolution ${resolution}`);
    }

    // Download the actual file
    const fileResponse = await fetch(downloadUrl, {
      signal: AbortSignal.timeout(this.config.downloadTimeout),
    });

    if (!fileResponse.ok) {
      throw new Error(`Download failed: ${fileResponse.status}`);
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, Buffer.from(arrayBuffer));

    return {
      asset,
      localPath: outputPath,
      source: "downloaded",
      metadata: { source: "polyhaven", assetName, resolution },
    };
  }

  /**
   * Download from Sketchfab (optional)
   */
  private async downloadFromSketchfab(asset: Asset, outputPath: string): Promise<AssetResolutionResult> {
    if (!this.config.sketchfabApiKey) {
      throw new Error("Sketchfab API key not configured");
    }

    // Parse sketchfab:// URL: sketchfab://model_id
    const url = new URL(asset.src.replace("sketchfab://", "https://"));
    const modelId = url.hostname;

    const apiUrl = `https://api.sketchfab.com/v3/models/${modelId}/download`;
    const response = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${this.config.sketchfabApiKey}` },
      signal: AbortSignal.timeout(this.config.downloadTimeout),
    });

    if (!response.ok) {
      throw new Error(`Sketchfab API error: ${response.status}`);
    }

    const data = (await response.json()) as { gltf?: { url?: string } };
    const gltfUrl = data.gltf?.url;

    if (!gltfUrl) {
      throw new Error("No GLTF download available for this model");
    }

    const fileResponse = await fetch(gltfUrl, {
      signal: AbortSignal.timeout(this.config.downloadTimeout),
    });

    if (!fileResponse.ok) {
      throw new Error(`Download failed: ${fileResponse.status}`);
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, Buffer.from(arrayBuffer));

    return {
      asset,
      localPath: outputPath,
      source: "downloaded",
      metadata: { source: "sketchfab", modelId },
    };
  }

  // ============================================================================
  // Public Directory Search
  // ============================================================================

  /**
   * Find asset in public directories (public/models/, public/audio/, public/images/)
   */
  private findInPublicDirs(asset: Asset): string | null {
    const publicDirs: Record<string, string[]> = {
      model: ["models", "assets/models"],
      audio: ["audio", "assets/audio"],
      texture: ["textures", "images", "assets/textures", "assets/images"],
      image: ["images", "assets/images"],
      font: ["fonts", "assets/fonts"],
      shader: ["shaders", "assets/shaders"],
      video: ["video", "assets/video"],
    };

    const dirs = publicDirs[asset.type] || [];

    for (const dir of dirs) {
      const publicDir = join(process.cwd(), "public", dir);
      if (existsSync(publicDir)) {
        // Try exact match first
        const ext = extname(asset.src) || this.getDefaultExtension(asset.type);
        const exactPath = join(publicDir, `${asset.id}${ext}`);
        if (existsSync(exactPath)) {
          return exactPath;
        }

        // Try finding by name
        const files = readdirSync(publicDir);
        const match = files.find(f =>
          f.toLowerCase().includes(asset.id.toLowerCase()) ||
          f.toLowerCase().includes((asset.name || "").toLowerCase())
        );
        if (match) {
          return join(publicDir, match);
        }

        // Try finding by type (first matching extension)
        const typeMatch = files.find(f => {
          const fileExt = extname(f).toLowerCase();
          const expectedExt = this.getDefaultExtension(asset.type).toLowerCase();
          return fileExt === expectedExt;
        });
        if (typeMatch) {
          return join(publicDir, typeMatch);
        }
      }
    }

    return null;
  }

  /**
   * Copy found public asset to assets directory
   */
  private async copyToAssetsDir(sourcePath: string, destPath: string): Promise<string> {
    mkdirSync(dirname(destPath), { recursive: true });
    copyFileSync(sourcePath, destPath);
    return destPath;
  }

  // ============================================================================
  // Beat Detection Enhancement
  // ============================================================================

  /**
   * Enhance manifest with beat detection for all audio assets
   */
  private async enhanceWithBeatDetection(manifest: AssetManifest): Promise<void> {
    for (const audioEntry of manifest.audio) {
      if (!audioEntry.beatTimes || audioEntry.beatTimes.length === 0) {
        const fullPath = join(this.config.assetsDir, audioEntry.path);
        if (existsSync(fullPath)) {
          // For now, we just estimate. In a real implementation,
          // you'd load and analyze the actual audio file
          audioEntry.bpm = audioEntry.bpm || 120;
          audioEntry.beatTimes = this.generateBeatGrid(audioEntry.bpm || 120, 30); // 30 seconds default
        }
      }
    }
  }

  private generateBeatGrid(bpm: number, duration: number): number[] {
    const beats: number[] = [];
    const beatInterval = 60 / bpm;
    const numBeats = Math.ceil(duration / beatInterval);
    for (let i = 0; i < numBeats; i++) {
      beats.push(i * beatInterval);
    }
    return beats;
  }

  // ============================================================================
  // Asset Download & Copy
  // ============================================================================

  /**
   * Download asset from URL
   */
  private async downloadAsset(asset: Asset, outputPath: string): Promise<AssetResolutionResult> {
    mkdirSync(dirname(outputPath), { recursive: true });

    try {
      const response = await fetch(asset.src, {
        signal: AbortSignal.timeout(this.config.downloadTimeout),
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      writeFileSync(outputPath, Buffer.from(arrayBuffer));

      return {
        asset,
        localPath: outputPath,
        source: "downloaded",
        metadata: {
          size: arrayBuffer.byteLength,
          contentType: response.headers.get("content-type"),
        },
      };
    } catch (error) {
      // Fallback to curl
      try {
        execSync(`curl -L -o "${outputPath}" "${asset.src}"`, {
          timeout: this.config.downloadTimeout,
        });
        return {
          asset,
          localPath: outputPath,
          source: "downloaded",
        };
      } catch (e) {
        throw new Error(`Failed to download asset: ${error}`);
      }
    }
  }

  /**
   * Copy local asset to assets directory
   */
  private async copyLocalAsset(asset: Asset, outputPath: string): Promise<AssetResolutionResult> {
    const sourcePath = resolve(process.cwd(), asset.src);

    if (!existsSync(sourcePath)) {
      throw new Error(`Source asset not found: ${sourcePath}`);
    }

    mkdirSync(dirname(outputPath), { recursive: true });
    copyFileSync(sourcePath, outputPath);

    const stats = existsSync(outputPath) ? statSync(outputPath) : { size: 0 };

    return {
      asset,
      localPath: outputPath,
      source: "existing",
      metadata: { size: stats.size },
    };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private getCacheKey(asset: Asset): string {
    const crypto = require("crypto");
    return crypto.createHash("md5").update(`${asset.type}:${asset.src}`).digest("hex");
  }

  private getLocalPath(asset: Asset): string {
    const typeDir = join(this.config.assetsDir, asset.type + "s", "generated");
    const ext = extname(asset.src) || this.getDefaultExtension(asset.type);
    const filename = `${asset.id}${ext}`;
    return join(typeDir, filename);
  }

  private getDefaultExtension(type: Asset["type"]): string {
    switch (type) {
      case "model": return ".glb";
      case "texture": return ".png";
      case "audio": return ".wav";
      case "video": return ".mp4";
      case "image": return ".png";
      case "font": return ".ttf";
      case "shader": return ".glsl";
      default: return ".bin";
    }
  }

  private addToCache(key: string, path: string, asset: Asset, metadata?: Record<string, any>): void {
    const stats = existsSync(path) ? statSync(path) : { size: 0 };

    this.cache.set(key, {
      hash: key,
      path,
      createdAt: Date.now(),
      size: stats.size,
      metadata: metadata || { type: asset.type, originalSrc: asset.src },
    });

    this.enforceCacheLimit();
    this.saveCacheIndex();
  }

  private enforceCacheLimit(): void {
    let totalSize = 0;
    for (const entry of Array.from(this.cache.values())) {
      totalSize += entry.size;
    }

    if (totalSize > this.config.maxCacheSize) {
      const entries = Array.from(this.cache.entries()).sort((a, b) => a[1].createdAt - b[1].createdAt);

      for (const [key, entry] of entries) {
        if (totalSize <= this.config.maxCacheSize * 0.8) break;

        try {
          if (existsSync(entry.path)) {
            require("fs").unlinkSync(entry.path);
          }
        } catch (e) {
          // Ignore
        }

        totalSize -= entry.size;
        this.cache.delete(key);
      }

      this.saveCacheIndex();
    }
  }

  // ============================================================================
  // Static Factory
  // ============================================================================

  static create(config?: Partial<AssetResolverConfig>): AssetResolver {
    return new AssetResolver(config);
  }
}

// ============================================================================
// Helper Functions (Main Exports)
// ============================================================================

/**
 * Main interface function: resolveAssets(spec: VideoSpec): Promise<AssetManifest>
 */
export async function resolveAssets(spec: VideoSpec, config?: Partial<AssetResolverConfig>): Promise<AssetManifest> {
  const resolver = AssetResolver.create(config);
  return resolver.resolveAssets(spec);
}

/**
 * Resolve assets and return detailed results
 */
export async function resolveVideoAssets(spec: VideoSpec, config?: Partial<AssetResolverConfig>): Promise<AssetResolutionResult[]> {
  const resolver = AssetResolver.create(config);
  // Resolve all assets from the spec
  const results: AssetResolutionResult[] = [];

  for (const scene of spec.scenes) {
    for (const asset of scene.assets) {
      const result = await resolver.resolve(asset);
      results.push(result);
    }
  }

  // Also resolve audio assets
  if (spec.audio.backgroundMusic) {
    const asset: Asset = {
      id: "bg-music",
      type: "audio",
      src: spec.audio.backgroundMusic.src,
    };
    results.push(await resolver.resolve(asset));
  }

  if (spec.audio.voiceover) {
    const asset: Asset = {
      id: "voiceover",
      type: "audio",
      src: spec.audio.voiceover.src,
    };
    results.push(await resolver.resolve(asset));
  }

  for (const sfx of spec.audio.sfx) {
    const asset: Asset = {
      id: sfx.id,
      type: "audio",
      src: sfx.src,
    };
    results.push(await resolver.resolve(asset));
  }

  return results;
}

/**
 * Generate a specific asset type with Blender
 */
export async function generateBlenderAsset(
  type: BlenderAssetOptions["type"],
  outputPath: string,
  options?: Partial<BlenderAssetOptions>
): Promise<string> {
  const resolver = AssetResolver.create();
  const asset: Asset = {
    id: `blender-${type}-${Date.now()}`,
    type: "model",
    src: `blender://${type}?${new URLSearchParams(options as any).toString()}`,
  };

  const result = await resolver.resolve(asset);
  return result.localPath;
}

/**
 * Generate procedural audio
 */
export async function generateProceduralAudio(
  type: ProceduralAudioOptions["type"],
  outputPath: string,
  options: Partial<ProceduralAudioOptions>
): Promise<string> {
  const resolver = AssetResolver.create();
  const asset: Asset = {
    id: `audio-${type}-${Date.now()}`,
    type: "audio",
    src: `audio://${type}?${new URLSearchParams(options as any).toString()}`,
  };

  const result = await resolver.resolve(asset);
  return result.localPath;
}

/**
 * Search for existing assets in public directories
 */
export function findLocalAssets(type: Asset["type"], query?: string): string[] {
  const publicDirs: Record<string, string[]> = {
    model: ["public/models", "public/assets/models"],
    audio: ["public/audio", "public/assets/audio"],
    texture: ["public/textures", "public/images", "public/assets/textures", "public/assets/images"],
    image: ["public/images", "public/assets/images"],
    font: ["public/fonts", "public/assets/fonts"],
    shader: ["public/shaders", "public/assets/shaders"],
    video: ["public/video", "public/assets/video"],
  };

  const dirs = publicDirs[type] || [];
  const results: string[] = [];

  for (const dir of dirs) {
    const fullDir = join(process.cwd(), dir);
    if (existsSync(fullDir)) {
      const files = readdirSync(fullDir);
      for (const file of files) {
        if (!query || file.toLowerCase().includes(query.toLowerCase())) {
          results.push(join(fullDir, file));
        }
      }
    }
  }

  return results;
}

// ============================================================================
// Export
// ============================================================================

export default AssetResolver;