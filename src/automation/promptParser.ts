import { z } from "zod";

/**
 * Video Specification Types for Natural Language Parsing
 * Parses prompts like "30s YouTube intro: spinning logo, particle burst, epic orchestral hit, title reveal"
 * into structured VideoSpec objects.
 */

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

const Vector3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

const ColorSchema = z.object({
  r: z.number().min(0).max(1),
  g: z.number().min(0).max(1),
  b: z.number().min(0).max(1),
});

const AssetSchema = z.object({
  id: z.string(),
  type: z.enum(["model", "texture", "audio", "video", "image", "font", "shader"]),
  src: z.string().url().or(z.string().refine(s => s.startsWith("./") || s.startsWith("../"))),
  name: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const AnimationSchema = z.object({
  id: z.string(),
  type: z.enum([
    "rotation",
    "position",
    "scale",
    "opacity",
    "color",
    "morph",
    "skeletal",
    "particle",
    "shader",
    "camera",
  ]),
  target: z.string(),
  property: z.string(),
  from: z.unknown(),
  to: z.unknown(),
  duration: z.number().positive(),
  delay: z.number().nonnegative(),
  easing: z.enum([
    "linear",
    "easeIn",
    "easeOut",
    "easeInOut",
    "easeInSine",
    "easeOutSine",
    "easeInOutSine",
    "easeInQuad",
    "easeOutQuad",
    "easeInOutQuad",
    "easeInCubic",
    "easeOutCubic",
    "easeInOutCubic",
    "easeInQuart",
    "easeOutQuart",
    "easeInOutQuart",
    "easeInQuint",
    "easeOutQuint",
    "easeInOutQuint",
    "easeInExpo",
    "easeOutExpo",
    "easeInOutExpo",
    "easeInCirc",
    "easeOutCirc",
    "easeInOutCirc",
    "easeInBack",
    "easeOutBack",
    "easeInOutBack",
    "easeInElastic",
    "easeOutElastic",
    "easeInOutElastic",
    "easeInBounce",
    "easeOutBounce",
    "easeInOutBounce",
  ]),
  loop: z.boolean(),
  yoyo: z.boolean(),
});

const TransitionSchema = z.object({
  id: z.string(),
  type: z.enum([
    "cut",
    "fade",
    "slide",
    "wipe",
    "zoom",
    "glitch",
    "morph",
    "dissolve",
    "push",
    "cover",
    "reveal",
  ]),
  duration: z.number().positive(),
  easing: z.string(),
  direction: z.enum(["in", "out", "both"]),
  params: z.record(z.string(), z.any()).optional(),
});

const SceneCameraSchema = z.object({
  position: Vector3Schema.optional(),
  target: Vector3Schema.optional(),
  fov: z.number(),
  near: z.number(),
  far: z.number(),
});

const SceneLightingSchema = z.object({
  ambient: ColorSchema.optional(),
  directional: z
    .array(
      z.object({
        color: ColorSchema,
        intensity: z.number(),
        position: Vector3Schema,
      })
    )
    .optional(),
  point: z
    .array(
      z.object({
        color: ColorSchema,
        intensity: z.number(),
        position: Vector3Schema,
        distance: z.number(),
        decay: z.number(),
      })
    )
    .optional(),
});

const SceneSpecSchema = z.object({
  id: z.string(),
  type: z.enum(["3d", "video", "text", "overlay"]),
  name: z.string().optional(),
  duration: z.number().positive(),
  startTime: z.number().nonnegative(),
  assets: z.array(AssetSchema),
  animations: z.array(AnimationSchema),
  transitions: z.array(TransitionSchema),
  camera: SceneCameraSchema.optional(),
  lighting: SceneLightingSchema.optional(),
});

const BackgroundMusicSchema = z.object({
  src: z.string(),
  volume: z.number().min(0).max(1),
  loop: z.boolean(),
  fadeIn: z.number().nonnegative(),
  fadeOut: z.number().nonnegative(),
  startTime: z.number().nonnegative(),
});

const VoiceoverSchema = z.object({
  src: z.string(),
  volume: z.number().min(0).max(1),
  startTime: z.number().nonnegative(),
  language: z.string(),
});

const SfxItemSchema = z.object({
  id: z.string(),
  src: z.string(),
  trigger: z.enum(["time", "event", "beat"]),
  time: z.number().nonnegative().optional(),
  event: z.string().optional(),
  volume: z.number().min(0).max(1),
  pitch: z.number(),
});

const AudioSpecSchema = z.object({
  backgroundMusic: BackgroundMusicSchema.optional(),
  voiceover: VoiceoverSchema.optional(),
  sfx: z.array(SfxItemSchema),
  beatSync: z.boolean(),
  masterVolume: z.number().min(0).max(1),
});

const ColorPaletteSchema = z.object({
  primary: z.array(ColorSchema).min(1).max(5),
  secondary: z.array(ColorSchema).max(5).optional(),
  accent: z.array(ColorSchema).max(3).optional(),
  background: ColorSchema.optional(),
  mode: z.enum(["light", "dark", "auto"]),
});

const PostProcessingSchema = z.object({
  bloom: z
    .object({
      enabled: z.boolean(),
      strength: z.number().min(0).max(1),
      radius: z.number().min(0).max(1),
      threshold: z.number().min(0).max(1),
    })
    .optional(),
  depthOfField: z
    .object({
      enabled: z.boolean(),
      focusDistance: z.number(),
      aperture: z.number().min(0.1).max(32),
      maxBlur: z.number(),
    })
    .optional(),
  motionBlur: z
    .object({
      enabled: z.boolean(),
      strength: z.number().min(0).max(1),
    })
    .optional(),
  colorGrading: z
    .object({
      enabled: z.boolean(),
      lut: z.string().optional(),
      exposure: z.number(),
      contrast: z.number(),
      saturation: z.number(),
      temperature: z.number(),
      tint: z.number(),
    })
    .optional(),
  vignette: z
    .object({
      enabled: z.boolean(),
      darkness: z.number().min(0).max(1),
      offset: z.number().min(0).max(1),
    })
    .optional(),
  filmGrain: z
    .object({
      enabled: z.boolean(),
      strength: z.number().min(0).max(1),
    })
    .optional(),
  chromaticAberration: z
    .object({
      enabled: z.boolean(),
      offset: z.number().min(0).max(0.01),
    })
    .optional(),
});

const StyleSpecSchema = z.object({
  colorPalette: ColorPaletteSchema.optional(),
  lighting: z.enum([
    "studio",
    "dramatic",
    "natural",
    "neon",
    "cinematic",
    "flat",
    "volumetric",
    "rim",
    "threePoint",
  ]),
  cameraStyle: z.enum([
    "static",
    "orbit",
    "dolly",
    "crane",
    "handheld",
    "drone",
    "firstPerson",
    "isometric",
  ]),
  postProcessing: PostProcessingSchema.optional(),
});

const RenderSettingsSchema = z.object({
  codec: z.enum(["h264", "h265", "vp8", "vp9", "prores"]).default("h264"),
  crf: z.number().min(0).max(51).default(20),
  preset: z.enum(["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow"]).default("medium"),
  pixelFormat: z.enum(["yuv420p", "yuv422p", "yuv444p"]).default("yuv420p"),
  concurrency: z.number().int().positive().max(16).default(4),
  imageFormat: z.enum(["png", "jpeg", "webp"]).default("png"),
  quality: z.number().int().min(1).max(100).default(80),
  timeout: z.number().positive().default(600000),
});

const VideoSpecSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  durationSeconds: z.number().positive().max(3600),
  aspectRatio: z.enum(["16:9", "9:16", "1:1", "4:3", "21:9"]),
  targetPlatform: z.enum(["youtube", "tiktok", "reels", "shorts", "generic", "twitch", "linkedin"]),
  fps: z.number().int().positive().max(120),
  scenes: z.array(SceneSpecSchema).min(1),
  audio: AudioSpecSchema,
  globalStyle: StyleSpecSchema,
  renderSettings: RenderSettingsSchema.optional(),
  metadata: z
    .object({
      author: z.string().optional(),
      tags: z.array(z.string()).optional(),
      description: z.string().optional(),
      createdAt: z.string().datetime().optional(),
      version: z.string(),
    })
    .optional(),
});

// ============================================================================
// TypeScript Types (inferred from Zod schemas)
// ============================================================================

export type Vector3 = z.infer<typeof Vector3Schema>;
export type Color = z.infer<typeof ColorSchema>;
export type Asset = z.infer<typeof AssetSchema>;
export type Animation = z.infer<typeof AnimationSchema>;
export type Transition = z.infer<typeof TransitionSchema>;
export type SceneSpec = z.infer<typeof SceneSpecSchema>;
export type RenderSettings = z.infer<typeof RenderSettingsSchema>;
export type AudioSpec = z.infer<typeof AudioSpecSchema>;
export type StyleSpec = z.infer<typeof StyleSpecSchema>;
export type VideoSpec = z.infer<typeof VideoSpecSchema>;

// ============================================================================
// Default Value Helpers (replacing Zod v3 .default() functionality)
// ============================================================================

const defaultVector3 = (): Vector3 => ({ x: 0, y: 0, z: 0 });
const defaultColor = (): Color => ({ r: 0, g: 0, b: 0 });

const defaultAsset = (): Asset => ({
  id: "",
  type: "model",
  src: "./assets/models/default.glb",
});

const defaultAnimation = (): Animation => ({
  id: "",
  type: "rotation",
  target: "main",
  property: "rotation.y",
  from: 0,
  to: Math.PI * 2,
  duration: 1000,
  delay: 0,
  easing: "easeInOut",
  loop: false,
  yoyo: false,
});

const defaultTransition = (): Transition => ({
  id: "",
  type: "fade",
  duration: 500,
  easing: "easeInOut",
  direction: "both",
});

const defaultSceneCamera = (): z.infer<typeof SceneCameraSchema> => ({
  position: defaultVector3(),
  target: defaultVector3(),
  fov: 50,
  near: 0.1,
  far: 1000,
});

const defaultSceneLighting = (): z.infer<typeof SceneLightingSchema> => ({
  ambient: { r: 0.3, g: 0.3, b: 0.35 },
  directional: [
    { color: { r: 1, g: 0.95, b: 0.9 }, intensity: 1, position: { x: 5, y: 10, z: 7 } },
    { color: { r: 0.5, g: 0.7, b: 1 }, intensity: 0.5, position: { x: -5, y: 5, z: -5 } },
  ],
  point: [],
});

const defaultBackgroundMusic = (): z.infer<typeof BackgroundMusicSchema> => ({
  src: "./assets/audio/ambient-default.mp3",
  volume: 0.4,
  loop: true,
  fadeIn: 2,
  fadeOut: 2,
  startTime: 0,
});

const defaultVoiceover = (): z.infer<typeof VoiceoverSchema> => ({
  src: "./assets/audio/voiceover-placeholder.mp3",
  volume: 1,
  startTime: 0,
  language: "en",
});

const defaultColorPalette = (): z.infer<typeof ColorPaletteSchema> => ({
  primary: [
    { r: 0x1a / 255, g: 0x1a / 255, b: 0x2e / 255 },
    { r: 0x16 / 255, g: 0x21 / 255, b: 0x3e / 255 },
    { r: 0x0f / 255, g: 0x34 / 255, b: 0x60 / 255 },
  ],
  secondary: [
    { r: 0xe9 / 255, g: 0x45 / 255, b: 0x60 / 255 },
    { r: 1, g: 1, b: 1 },
  ],
  accent: [{ r: 0x16 / 255, g: 0x21 / 255, b: 0x3e / 255 }],
  background: { r: 0x1a / 255, g: 0x1a / 255, b: 0x2e / 255 },
  mode: "dark",
});

const defaultPostProcessing = (): z.infer<typeof PostProcessingSchema> => ({
  bloom: { enabled: false, strength: 0.5, radius: 0.5, threshold: 0.8 },
  depthOfField: { enabled: false, focusDistance: 10, aperture: 2.8, maxBlur: 1 },
  motionBlur: { enabled: false, strength: 0.5 },
  colorGrading: { enabled: true, exposure: 0, contrast: 1.1, saturation: 1.1, temperature: 0, tint: 0 },
  vignette: { enabled: true, darkness: 0.3, offset: 0 },
  filmGrain: { enabled: false, strength: 0.1 },
  chromaticAberration: { enabled: false, offset: 0.002 },
});

const defaultStyleSpec = (): StyleSpec => ({
  colorPalette: defaultColorPalette(),
  lighting: "studio",
  cameraStyle: "static",
  postProcessing: defaultPostProcessing(),
});

const defaultAudioSpec = (): AudioSpec => ({
  backgroundMusic: defaultBackgroundMusic(),
  voiceover: undefined,
  sfx: [],
  beatSync: false,
  masterVolume: 1,
});

const defaultVideoMetadata = (): z.infer<typeof VideoSpecSchema>["metadata"] => ({
  author: "Prompt Parser",
  tags: [],
  description: "",
  createdAt: new Date().toISOString(),
  version: "1.0.0",
});

// ============================================================================
// Natural Language Parsing
// ============================================================================

interface ParsedPrompt {
  duration?: number;
  platform?: string;
  aspectRatio?: string;
  scenes: Array<{
    type: string;
    keywords: string[];
    duration?: number;
  }>;
  audio: {
    music?: string;
    voiceover?: string;
    sfx: string[];
    beatSync?: boolean;
  };
  style: {
    colors?: string[];
    lighting?: string;
    camera?: string;
    effects?: string[];
  };
}

const DURATION_REGEX = /(\d+(?:\.\d+)?)\s*(s|sec|seconds?|m|min|minutes?|h|hr|hours?)/gi;
const PLATFORM_KEYWORDS: Record<string, string[]> = {
  youtube: ["youtube", "yt", "long-form", "horizontal"],
  tiktok: ["tiktok", "tt", "vertical", "9:16"],
  reels: ["reels", "instagram reels", "ig reels"],
  shorts: ["shorts", "youtube shorts", "yt shorts"],
  twitch: ["twitch", "stream", "overlay"],
  linkedin: ["linkedin", "li", "professional"],
  generic: ["generic", "custom", "default"],
};

const ASPECT_RATIO_KEYWORDS: Record<string, string[]> = {
  "16:9": ["16:9", "16x9", "horizontal", "landscape", "widescreen", "hd", "fullhd", "4k"],
  "9:16": ["9:16", "9x16", "vertical", "portrait", "mobile", "phone", "tiktok", "reels", "shorts"],
  "1:1": ["1:1", "1x1", "square", "instagram", "post"],
  "4:3": ["4:3", "4x3", "standard", "classic"],
  "21:9": ["21:9", "21x9", "ultrawide", "cinematic", "anamorphic"],
};

const SCENE_TYPE_KEYWORDS: Record<string, string[]> = {
  "3d": ["3d", "three.js", "threejs", "model", "mesh", "geometry", "spinning", "rotating", "particle", "particles"],
  video: ["video", "clip", "footage", "b-roll", "stock", "recording"],
  text: ["text", "title", "caption", "subtitle", "typography", "reveal", "typewriter", "kinetic"],
  overlay: ["overlay", "ui", "hud", "graphics", "lower third", "watermark", "logo"],
};

const ANIMATION_KEYWORDS: Record<string, string[]> = {
  rotation: ["spin", "rotate", "rotation", "spinning", "twirl"],
  position: ["move", "slide", "pan", "fly", "float", "drift", "translate"],
  scale: ["scale", "zoom", "grow", "shrink", "pulse", "pop"],
  opacity: ["fade", "fade in", "fade out", "appear", "disappear", "transparent"],
  color: ["color change", "color shift", "hue", "tint"],
  particle: ["particle", "particles", "burst", "explosion", "sparkle", "magic", "dust", "smoke", "fire"],
  camera: ["camera move", "dolly", "crane", "orbit", "zoom in", "zoom out", "push in", "pull out"],
};

const TRANSITION_KEYWORDS: Record<string, string[]> = {
  cut: ["cut", "hard cut", "jump cut", "straight cut"],
  fade: ["fade", "fade to black", "fade in", "fade out", "crossfade", "dissolve"],
  slide: ["slide", "push", "wipe left", "wipe right", "swipe"],
  wipe: ["wipe", "iris", "clock wipe", "radial"],
  zoom: ["zoom transition", "zoom cut", "match cut"],
  glitch: ["glitch", "digital glitch", "datamosh", "corrupt"],
  morph: ["morph", "transform", "metamorphosis", "shape shift"],
  dissolve: ["dissolve", "cross dissolve", "blend"],
  push: ["push", "slide push"],
  cover: ["cover", "cover transition"],
  reveal: ["reveal", "uncover", "reveal transition"],
};

const LIGHTING_KEYWORDS: Record<string, string[]> = {
  studio: ["studio", "soft", "even", "clean", "professional"],
  dramatic: ["dramatic", "contrast", "chiaroscuro", "moody", "noir", "dark"],
  natural: ["natural", "sunlight", "daylight", "outdoor", "golden hour"],
  neon: ["neon", "cyberpunk", "synthwave", "glowing", "vibrant", "electric"],
  cinematic: ["cinematic", "film", "movie", "hollywood", "teal orange"],
  flat: ["flat", "minimal", "clean", "simple", "ui"],
  volumetric: ["volumetric", "god rays", "light shafts", "fog", "atmosphere"],
  rim: ["rim", "rim light", "backlight", "edge light", "silhouette"],
  threePoint: ["three point", "3-point", "key fill back", "classic lighting"],
};

const CAMERA_STYLE_KEYWORDS: Record<string, string[]> = {
  static: ["static", "fixed", "locked", "tripod", "still"],
  orbit: ["orbit", "rotate around", "circular", "spin around"],
  dolly: ["dolly", "track", "push in", "pull out", "dolly zoom"],
  crane: ["crane", "jib", "high angle", "low angle", "sweep"],
  handheld: ["handheld", "shake", "shaky", "documentary", "run and gun"],
  drone: ["drone", "aerial", "flyover", "bird's eye", "top down"],
  firstPerson: ["first person", "pov", "point of view", "subjective"],
  isometric: ["isometric", "iso", "2.5d", "fixed angle"],
};

const COLOR_KEYWORDS: Record<string, string[]> = {
  red: ["red", "crimson", "scarlet", "ruby", "blood"],
  orange: ["orange", "amber", "tangerine", "sunset"],
  yellow: ["yellow", "gold", "golden", "sun", "lemon"],
  green: ["green", "emerald", "forest", "mint", "lime", "nature"],
  blue: ["blue", "cyan", "azure", "navy", "ocean", "sky", "teal"],
  purple: ["purple", "violet", "magenta", "indigo", "royal"],
  pink: ["pink", "rose", "fuchsia", "salmon", "blush"],
  white: ["white", "pure", "clean", "bright", "light"],
  black: ["black", "dark", "night", "midnight", "obsidian"],
  gray: ["gray", "grey", "silver", "slate", "stone", "neutral"],
  brown: ["brown", "bronze", "copper", "chocolate", "earth"],
};

const AUDIO_KEYWORDS: Record<string, string[]> = {
  orchestral: ["orchestral", "orchestra", "symphonic", "epic", "cinematic music", "strings", "brass"],
  electronic: ["electronic", "edm", "synth", "synthesizer", "beat", "drop", "bass", "techno"],
  ambient: ["ambient", "atmospheric", "drone", "pad", "texture", "mood"],
  rock: ["rock", "guitar", "drums", "band", "energetic", "aggressive"],
  hiphop: ["hip hop", "hiphop", "rap", "beat", "boom bap", "trap"],
  jazz: ["jazz", "saxophone", "piano", "smooth", "swing"],
  corporate: ["corporate", "business", "upbeat", "positive", "inspiring", "motivational"],
  lofi: ["lofi", "lo-fi", "chill", "relaxed", "study", "calm"],
  horror: ["horror", "scary", "creepy", "tense", "suspense", "dark ambient"],
  fantasy: ["fantasy", "magical", "ethereal", "mystical", "enchanted"],
};

const SFX_KEYWORDS: Record<string, string[]> = {
  whoosh: ["whoosh", "swoosh", "swish", "air", "wind"],
  impact: ["impact", "hit", "boom", "crash", "bang", "thud", "slam"],
  pop: ["pop", "click", "tick", "snap", "pluck"],
  chime: ["chime", "bell", "ding", "notification", "sparkle", "magic"],
  riser: ["riser", "rise", "build up", "tension", "swell"],
  downer: ["downer", "drop", "fall", "release"],
  glitch: ["glitch", "digital", "error", "corrupt", "static"],
  nature: ["bird", "water", "rain", "fire", "wind", "forest"],
};

function matchKeywords(text: string, keywords: Record<string, string[]>): string | undefined {
  const lowerText = text.toLowerCase();
  for (const [category, words] of Object.entries(keywords)) {
    for (const word of words) {
      if (lowerText.includes(word.toLowerCase())) {
        return category;
      }
    }
  }
  return undefined;
}

function extractDuration(text: string): number | undefined {
  const matches = Array.from(text.matchAll(DURATION_REGEX));
  let totalSeconds = 0;
  for (const match of matches) {
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    if (unit.startsWith("s")) totalSeconds += value;
    else if (unit.startsWith("m")) totalSeconds += value * 60;
    else if (unit.startsWith("h")) totalSeconds += value * 3600;
  }
  return totalSeconds > 0 ? totalSeconds : undefined;
}

function extractPlatform(text: string): string | undefined {
  return matchKeywords(text, PLATFORM_KEYWORDS);
}

function extractAspectRatio(text: string): string | undefined {
  return matchKeywords(text, ASPECT_RATIO_KEYWORDS);
}

function parseScenes(text: string): ParsedPrompt["scenes"] {
  const scenes: ParsedPrompt["scenes"] = [];
  const lowerText = text.toLowerCase();

  const segments = text
    .split(/[,;:|]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);

  for (const segment of segments) {
    const sceneType = matchKeywords(segment, SCENE_TYPE_KEYWORDS) || "3d";
    const keywords = segment
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);

    const durationMatch = segment.match(DURATION_REGEX);
    const duration = durationMatch ? extractDuration(durationMatch[0]) : undefined;

    scenes.push({
      type: sceneType,
      keywords,
      duration,
    });
  }

  if (scenes.length === 0) {
    const sceneType = matchKeywords(text, SCENE_TYPE_KEYWORDS) || "3d";
    scenes.push({
      type: sceneType,
      keywords: text.toLowerCase().split(/\s+/).filter((w) => w.length > 2),
    });
  }

  return scenes;
}

function parseAudio(text: string): ParsedPrompt["audio"] {
  const lowerText = text.toLowerCase();
  const music = matchKeywords(lowerText, AUDIO_KEYWORDS);
  const beatSync = /\bbeat.?sync\b|\bsync.?to.?beat\b|\bon.?beat\b/i.test(text);

  const sfx: string[] = [];
  for (const [category, words] of Object.entries(SFX_KEYWORDS)) {
    for (const word of words) {
      if (lowerText.includes(word.toLowerCase())) {
        sfx.push(category);
        break;
      }
    }
  }

  return {
    music,
    voiceover: lowerText.includes("voiceover") || lowerText.includes("voice over") || lowerText.includes("narration")
      ? "voiceover"
      : undefined,
    sfx: Array.from(new Set(sfx)),
    beatSync,
  };
}

function parseStyle(text: string): ParsedPrompt["style"] {
  const lowerText = text.toLowerCase();
  return {
    colors: Object.entries(COLOR_KEYWORDS)
      .filter(([_, words]) => words.some((w) => lowerText.includes(w.toLowerCase())))
      .map(([color]) => color),
    lighting: matchKeywords(lowerText, LIGHTING_KEYWORDS),
    camera: matchKeywords(lowerText, CAMERA_STYLE_KEYWORDS),
    effects: [],
  };
}

function parsePrompt(text: string): ParsedPrompt {
  return {
    duration: extractDuration(text),
    platform: extractPlatform(text),
    aspectRatio: extractAspectRatio(text),
    scenes: parseScenes(text),
    audio: parseAudio(text),
    style: parseStyle(text),
  };
}

// ============================================================================
// Default Generators
// ============================================================================

function generateId(prefix: string = ""): string {
  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

function createDefaultColor(r: number, g: number, b: number): Color {
  return { r: r / 255, g: g / 255, b: b / 255 };
}

const DEFAULT_PALETTES: Record<string, Color[]> = {
  default: [
    createDefaultColor(0x1a, 0x1a, 0x2e),
    createDefaultColor(0x16, 0x21, 0x3e),
    createDefaultColor(0x0f, 0x34, 0x60),
    createDefaultColor(0xe9, 0x45, 0x60),
    createDefaultColor(0xff, 0xff, 0xff),
  ],
  cinematic: [
    createDefaultColor(0x0d, 0x0d, 0x0d),
    createDefaultColor(0x1a, 0x1a, 0x2e),
    createDefaultColor(0x16, 0x21, 0x3e),
    createDefaultColor(0xf5, 0xf5, 0xf5),
    createDefaultColor(0xff, 0xd7, 0x00),
  ],
  neon: [
    createDefaultColor(0x0d, 0x0d, 0x0d),
    createDefaultColor(0xff, 0x00, 0x6e),
    createDefaultColor(0x83, 0x38, 0xec),
    createDefaultColor(0x3a, 0x86, 0xff),
    createDefaultColor(0x06, 0xff, 0xa5),
  ],
  nature: [
    createDefaultColor(0x1b, 0x43, 0x32),
    createDefaultColor(0x2d, 0x6a, 0x4f),
    createDefaultColor(0x40, 0x91, 0x6c),
    createDefaultColor(0x52, 0xb7, 0x88),
    createDefaultColor(0xd8, 0xf3, 0xdc),
  ],
  warm: [
    createDefaultColor(0x3d, 0x1a, 0x0d),
    createDefaultColor(0x7b, 0x3f, 0x1a),
    createDefaultColor(0xc4, 0x6c, 0x2a),
    createDefaultColor(0xe8, 0x9c, 0x4e),
    createDefaultColor(0xff, 0xdc, 0xb8),
  ],
};

function getColorPalette(style: ParsedPrompt["style"]): StyleSpec["colorPalette"] {
  const colors = style.colors || ["default"];

  for (const color of colors) {
    const palette = DEFAULT_PALETTES[color];
    if (palette) {
      return {
        primary: palette.slice(0, 3),
        secondary: palette.slice(3, 5),
        accent: [palette[1] ?? palette[0]],
        background: palette[0],
        mode: "dark",
      };
    }
  }

  const primary: Color[] = [];
  for (const colorName of colors.slice(0, 3)) {
    const colorMap: Record<string, Color> = {
      red: createDefaultColor(0xe9, 0x45, 0x60),
      orange: createDefaultColor(0xff, 0x9f, 0x1c),
      yellow: createDefaultColor(0xff, 0xdd, 0x00),
      green: createDefaultColor(0x2e, 0xcc, 0x71),
      blue: createDefaultColor(0x34, 0x98, 0xdb),
      purple: createDefaultColor(0x9b, 0x59, 0xb6),
      pink: createDefaultColor(0xe8, 0x43, 0x93),
      white: createDefaultColor(0xec, 0xf0, 0xf1),
      black: createDefaultColor(0x2c, 0x3e, 0x50),
      gray: createDefaultColor(0x95, 0xa5, 0xa6),
      brown: createDefaultColor(0x8b, 0x45, 0x13),
    };
    const colorValue = colorMap[colorName];
    if (colorValue) {
      primary.push(colorValue);
    }
  }

  if (primary.length === 0) {
    primary.push(...DEFAULT_PALETTES.default.slice(0, 3));
  }

  return {
    primary,
    secondary: primary.slice(1, 3),
    accent: [primary[0]],
    background: createDefaultColor(0x1a, 0x1a, 0x2e),
    mode: "dark",
  };
}

function createDefaultAssets(sceneType: SceneSpec["type"], keywords: string[]): Asset[] {
  const assets: Asset[] = [];
  const baseId = generateId("asset-");

  switch (sceneType) {
    case "3d":
      assets.push({
        id: `${baseId}-model`,
        type: "model",
        src: "./assets/models/default.glb",
        name: "Main 3D Model",
      });
      if (keywords.some((k) => ["particle", "burst", "sparkle", "magic"].includes(k))) {
        assets.push({
          id: `${baseId}-particles`,
          type: "shader",
          src: "./assets/shaders/particles.glsl",
          name: "Particle System",
        });
      }
      break;
    case "video":
      assets.push({
        id: `${baseId}-video`,
        type: "video",
        src: "./assets/video/placeholder.mp4",
        name: "Video Clip",
      });
      break;
    case "text":
      assets.push({
        id: `${baseId}-font`,
        type: "font",
        src: "./assets/fonts/Inter-Bold.ttf",
        name: "Title Font",
      });
      break;
    case "overlay":
      assets.push({
        id: `${baseId}-overlay`,
        type: "image",
        src: "./assets/images/overlay.png",
        name: "Overlay Graphic",
      });
      break;
  }

  return assets;
}

function createDefaultAnimations(
  sceneType: SceneSpec["type"],
  keywords: string[],
  duration: number
): Animation[] {
  const animations: Animation[] = [];
  const baseId = generateId("anim-");

  for (const [animType, animKeywords] of Object.entries(ANIMATION_KEYWORDS)) {
    if (keywords.some((k) => animKeywords.some((ak) => k.includes(ak)))) {
      const isRotation = animType === "rotation";
      const isScale = animType === "scale";
      const isParticle = animType === "particle";

      animations.push({
        id: `${baseId}-${animType}`,
        type: animType as Animation["type"],
        target: "main",
        property: isRotation ? "rotation.y" : animType,
        from: isRotation ? 0 : isScale ? 1 : 0,
        to: isRotation ? Math.PI * 2 : isScale ? 1.2 : 1,
        duration: duration * 1000,
        delay: 0,
        easing: "easeInOut",
        loop: isRotation || isParticle,
        yoyo: isScale,
      });
    }
  }

  if (animations.length === 0) {
    if (sceneType === "3d") {
      animations.push({
        id: `${baseId}-rotation`,
        type: "rotation",
        target: "main",
        property: "rotation.y",
        from: 0,
        to: Math.PI * 2,
        duration: duration * 1000,
        delay: 0,
        easing: "linear",
        loop: true,
        yoyo: false,
      });
    } else if (sceneType === "text") {
      animations.push({
        id: `${baseId}-fade`,
        type: "opacity",
        target: "main",
        property: "opacity",
        from: 0,
        to: 1,
        duration: 500,
        delay: 0,
        easing: "easeOut",
        loop: false,
        yoyo: false,
      });
    }
  }

  return animations;
}

function createDefaultTransitions(keywords: string[]): Transition[] {
  const transitions: Transition[] = [];
  const baseId = generateId("trans-");

  for (const [transType, transKeywords] of Object.entries(TRANSITION_KEYWORDS)) {
    if (keywords.some((k) => transKeywords.some((tk) => k.includes(tk)))) {
      transitions.push({
        id: `${baseId}-${transType}`,
        type: transType as Transition["type"],
        duration: 1000,
        easing: "easeInOut",
        direction: "both",
      });
      break;
    }
  }

  if (transitions.length === 0) {
    transitions.push({
      id: `${baseId}-fade`,
      type: "fade",
      duration: 500,
      easing: "easeInOut",
      direction: "both",
    });
  }

  return transitions;
}

function createSceneSpecs(parsed: ParsedPrompt, totalDuration: number): SceneSpec[] {
  const scenes: SceneSpec[] = [];
  let currentTime = 0;

  const scenesWithDuration = parsed.scenes.map((scene, index) => {
    const explicitDuration = scene.duration;
    const remainingScenes = parsed.scenes.length - index;
    const remainingTime = totalDuration - currentTime;
    const avgDuration = remainingTime / remainingScenes;
    return {
      ...scene,
      duration: explicitDuration ?? avgDuration,
    };
  });

  for (let i = 0; i < scenesWithDuration.length; i++) {
    const sceneData = scenesWithDuration[i];
    const sceneId = generateId("scene-");
    const duration = Math.max(1, Math.min(sceneData.duration, totalDuration - currentTime));

    const sceneType = sceneData.type as SceneSpec["type"];
    const scene: SceneSpec = {
      id: sceneId,
      type: sceneType,
      name: `Scene ${i + 1}`,
      duration,
      startTime: currentTime,
      assets: createDefaultAssets(sceneType, sceneData.keywords),
      animations: createDefaultAnimations(sceneType, sceneData.keywords, duration),
      transitions: i > 0 ? createDefaultTransitions(sceneData.keywords) : [],
      camera: sceneData.type === "3d" ? {
        position: { x: 0, y: 2, z: 5 },
        target: { x: 0, y: 0, z: 0 },
        fov: 50,
        near: 0.1,
        far: 1000,
      } : undefined,
      lighting: sceneData.type === "3d" ? {
        ambient: { r: 0.3, g: 0.3, b: 0.35 },
        directional: [
          { color: { r: 1, g: 0.95, b: 0.9 }, intensity: 1, position: { x: 5, y: 10, z: 7 } },
          { color: { r: 0.5, g: 0.7, b: 1 }, intensity: 0.5, position: { x: -5, y: 5, z: -5 } },
        ],
      } : undefined,
    };

    scenes.push(scene);
    currentTime += duration;
  }

  return scenes;
}

function createAudioSpec(parsed: ParsedPrompt, duration: number): AudioSpec {
  const musicGenres: Record<string, { src: string; volume: number }> = {
    orchestral: { src: "./assets/audio/orchestral-epic.mp3", volume: 0.6 },
    electronic: { src: "./assets/audio/electronic-beat.mp3", volume: 0.5 },
    ambient: { src: "./assets/audio/ambient-drone.mp3", volume: 0.4 },
    rock: { src: "./assets/audio/rock-energy.mp3", volume: 0.5 },
    hiphop: { src: "./assets/audio/hiphop-beat.mp3", volume: 0.5 },
    jazz: { src: "./assets/audio/jazz-smooth.mp3", volume: 0.4 },
    corporate: { src: "./assets/audio/corporate-upbeat.mp3", volume: 0.4 },
    lofi: { src: "./assets/audio/lofi-chill.mp3", volume: 0.3 },
    horror: { src: "./assets/audio/horror-tense.mp3", volume: 0.5 },
    fantasy: { src: "./assets/audio/fantasy-magical.mp3", volume: 0.4 },
    default: { src: "./assets/audio/ambient-default.mp3", volume: 0.4 },
  };

  const musicKey = parsed.audio.music && musicGenres[parsed.audio.music] ? parsed.audio.music : "default";
  const musicConfig = musicGenres[musicKey];

  const sfxMap: Record<string, { src: string; trigger: "time" | "event" | "beat" }> = {
    whoosh: { src: "./assets/sfx/whoosh.mp3", trigger: "time" },
    impact: { src: "./assets/sfx/impact.mp3", trigger: "beat" },
    pop: { src: "./assets/sfx/pop.mp3", trigger: "event" },
    chime: { src: "./assets/sfx/chime.mp3", trigger: "beat" },
    riser: { src: "./assets/sfx/riser.mp3", trigger: "time" },
    downer: { src: "./assets/sfx/downer.mp3", trigger: "time" },
    glitch: { src: "./assets/sfx/glitch.mp3", trigger: "event" },
    nature: { src: "./assets/sfx/nature.mp3", trigger: "time" },
  };

  const sfxList = parsed.audio.sfx.map((sfx, index) => {
    const config = sfxMap[sfx] ?? sfxMap.whoosh;
    return {
      id: generateId(`sfx-${sfx}-`),
      src: config.src,
      trigger: config.trigger,
      time: config.trigger === "time" ? (index + 1) * (duration / (parsed.audio.sfx.length + 1)) : undefined,
      event: config.trigger === "event" ? sfx : undefined,
      volume: 0.8,
      pitch: 1,
    };
  });

  return {
    backgroundMusic: {
      src: musicConfig.src,
      volume: musicConfig.volume,
      loop: true,
      fadeIn: 2,
      fadeOut: 2,
      startTime: 0,
    },
    voiceover: parsed.audio.voiceover
      ? {
          src: "./assets/audio/voiceover-placeholder.mp3",
          volume: 1,
          startTime: 0,
          language: "en",
        }
      : undefined,
    sfx: sfxList,
    beatSync: parsed.audio.beatSync ?? false,
    masterVolume: 1,
  };
}

function createStyleSpec(parsed: ParsedPrompt): StyleSpec {
  const style = parsed.style;
  const hasGlowKeywords = style.effects?.some((k: string) => ["glow", "bloom", "neon", "bright"].includes(k)) ?? false;

  return {
    colorPalette: getColorPalette(style),
    lighting: (style.lighting as StyleSpec["lighting"]) ?? "studio",
    cameraStyle: (style.camera as StyleSpec["cameraStyle"]) ?? "static",
    postProcessing: {
      bloom: {
        enabled: hasGlowKeywords,
        strength: 0.5,
        radius: 0.5,
        threshold: 0.8,
      },
      colorGrading: {
        enabled: true,
        exposure: 0,
        contrast: 1.1,
        saturation: 1.1,
        temperature: 0,
        tint: 0,
      },
      vignette: {
        enabled: style.lighting === "cinematic" || style.lighting === "dramatic",
        darkness: 0.3,
        offset: 0,
      },
    },
  };
}

// ============================================================================
// Main Parser Functions
// ============================================================================

/**
 * Parses a natural language prompt into a validated VideoSpec
 * @param prompt - Natural language description of the video
 * @returns Validated VideoSpec object
 * @throws ZodError if the parsed result fails validation
 */
export function parseVideoPrompt(prompt: string): VideoSpec {
  if (!prompt || typeof prompt !== "string") {
    throw new Error("Prompt must be a non-empty string");
  }

  const trimmedPrompt = prompt.trim();
  if (trimmedPrompt.length === 0) {
    throw new Error("Prompt cannot be empty or whitespace only");
  }

  const parsed = parsePrompt(trimmedPrompt);

  const duration = parsed.duration ?? 30;
  const platform = (parsed.platform as VideoSpec["targetPlatform"]) ?? "generic";
  const aspectRatio = (parsed.aspectRatio as VideoSpec["aspectRatio"]) ??
    (platform === "tiktok" || platform === "reels" || platform === "shorts" ? "9:16" : "16:9");

  const scenes = createSceneSpecs(parsed, duration);
  const audio = createAudioSpec(parsed, duration);
  const globalStyle = createStyleSpec(parsed);

  const videoSpec: VideoSpec = {
    id: crypto.randomUUID(),
    title: trimmedPrompt.length > 100 ? trimmedPrompt.substring(0, 97) + "..." : trimmedPrompt,
    durationSeconds: duration,
    aspectRatio,
    targetPlatform: platform,
    fps: 30,
    scenes,
    audio,
    globalStyle,
    renderSettings: {
      codec: "h264",
      crf: 20,
      preset: "medium",
      pixelFormat: "yuv420p",
      concurrency: 4,
      imageFormat: "png",
      quality: 80,
      timeout: 600000,
    },
    metadata: {
      author: "Prompt Parser",
      tags: parsed.scenes.flatMap((s) => s.keywords).slice(0, 10),
      description: trimmedPrompt,
      createdAt: new Date().toISOString(),
      version: "1.0.0",
    },
  };

  return VideoSpecSchema.parse(videoSpec);
}

/**
 * Parses a prompt with relaxed validation - returns partial result on failure
 * @param prompt - Natural language description
 * @returns Parsed VideoSpec or null if completely unparseable
 */
export function parseVideoPromptSafe(prompt: string): VideoSpec | null {
  try {
    return parseVideoPrompt(prompt);
  } catch (error) {
    console.warn("Failed to parse prompt:", error);
    return null;
  }
}

/**
 * Validates an existing VideoSpec object
 * @param spec - VideoSpec to validate
 * @returns Validated VideoSpec
 * @throws ZodError if invalid
 */
export function validateVideoSpec(spec: unknown): VideoSpec {
  return VideoSpecSchema.parse(spec);
}

/**
 * Creates a minimal VideoSpec from basic parameters
 * @param options - Basic video options
 * @returns Validated VideoSpec
 */
export function createVideoSpec(options: {
  title: string;
  durationSeconds: number;
  aspectRatio?: VideoSpec["aspectRatio"];
  targetPlatform?: VideoSpec["targetPlatform"];
  sceneType?: SceneSpec["type"];
}): VideoSpec {
  const prompt = `${options.durationSeconds}s ${options.targetPlatform ?? "generic"} ${options.sceneType ?? "3d"} video: ${options.title}`;
  return parseVideoPrompt(prompt);
}

// ============================================================================
// Export all schemas
// ============================================================================

export {
  VideoSpecSchema,
  SceneSpecSchema,
  AudioSpecSchema,
  StyleSpecSchema,
  AssetSchema,
  AnimationSchema,
  TransitionSchema,
  Vector3Schema,
  ColorSchema,
};