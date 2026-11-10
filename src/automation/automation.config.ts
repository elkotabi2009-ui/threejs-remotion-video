/**
 * Automation Configuration
 * Central configuration for the prompt-to-video pipeline
 */

export interface LLMConfig {
  provider: "openai" | "anthropic" | "local" | "mock";
  apiKey?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  baseURL?: string;
}

export interface BlenderConfig {
  blenderPath: string;
  scriptsDir: string;
  tempDir: string;
  timeout: number;
  gpuEnabled: boolean;
  verbose: boolean;
}

export interface BuildConfig {
  workDir: string;
  outputDir: string;
  cacheDir: string;
  verbose: boolean;
  parallelJobs: number;
}

export interface RemotionConfig {
  cliPath: string;
  defaultComposition: string;
  chromiumPath?: string;
  renderConcurrency: number;
  imageFormat: "png" | "jpeg" | "webp";
  quality: number;
  timeout: number;
  lambda?: {
    region: string;
    functionName: string;
    bucketName: string;
  };
}

export interface AssetConfig {
  cacheDir: string;
  assetsDir: string;
  blenderPath: string;
  blenderScriptsDir: string;
  downloadTimeout: number;
  maxCacheSize: number;
  proceduralGenerators: {
    canvas: boolean;
    threejs: boolean;
  };
}

export interface QueueConfig {
  enabled: boolean;
  redisUrl?: string;
  concurrency: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface AutomationConfig {
  llm: LLMConfig;
  blender: BlenderConfig;
  build: BuildConfig;
  remotion: RemotionConfig;
  assets: AssetConfig;
  queue: QueueConfig;
  features: {
    audioEnabled: boolean;
    timelineEnabled: boolean;
    blenderEnabled: boolean;
    lambdaEnabled: boolean;
    cacheEnabled: boolean;
  };
}

// Default configuration
export const defaultConfig: AutomationConfig = {
  llm: {
    provider: "mock", // Use mock parser for testing
    model: "gpt-4-turbo-preview",
    temperature: 0.3,
    maxTokens: 8000,
  },
  blender: {
    blenderPath: "blender",
    scriptsDir: "./blender",
    tempDir: ".blender-temp",
    timeout: 300000,
    gpuEnabled: true,
    verbose: false,
  },
  build: {
    workDir: ".build",
    outputDir: "out",
    cacheDir: ".cache",
    verbose: true,
    parallelJobs: 4,
  },
  remotion: {
    cliPath: "npx remotion",
    defaultComposition: "MainVideo",
    renderConcurrency: 4,
    imageFormat: "png",
    quality: 80,
    timeout: 600000,
  },
  assets: {
    cacheDir: ".asset-cache",
    assetsDir: "public/assets",
    blenderPath: "blender",
    blenderScriptsDir: "./blender",
    downloadTimeout: 60000,
    maxCacheSize: 500 * 1024 * 1024, // 500MB
    proceduralGenerators: {
      canvas: true,
      threejs: true,
    },
  },
  queue: {
    enabled: false,
    redisUrl: "redis://localhost:6379",
    concurrency: 2,
    retryAttempts: 3,
    retryDelay: 5000,
  },
  features: {
    audioEnabled: true,
    timelineEnabled: true,
    blenderEnabled: true,
    lambdaEnabled: false,
    cacheEnabled: true,
  },
};

// Configuration presets for different platforms
export const platformPresets: Record<string, Partial<AutomationConfig>> = {
  tiktok: {
    remotion: {
      defaultComposition: "VerticalVideo",
      renderConcurrency: 4,
    } as RemotionConfig,
    build: {
      parallelJobs: 4,
    } as BuildConfig,
  },
  reels: {
    remotion: {
      defaultComposition: "VerticalVideo",
      renderConcurrency: 4,
    } as RemotionConfig,
  },
  shorts: {
    remotion: {
      defaultComposition: "VerticalVideo",
      renderConcurrency: 4,
    } as RemotionConfig,
  },
  youtube: {
    remotion: {
      defaultComposition: "MainVideo",
      renderConcurrency: 4,
    } as RemotionConfig,
  },
  instagram: {
    remotion: {
      defaultComposition: "SquareVideo",
      renderConcurrency: 4,
    } as RemotionConfig,
  },
  preview: {
    remotion: {
      defaultComposition: "PreviewVideo",
      renderConcurrency: 2,
      quality: 50,
    } as RemotionConfig,
    build: {
      parallelJobs: 2,
    } as BuildConfig,
  },
};

// Environment-based configuration overrides
export function loadConfigFromEnv(): Partial<AutomationConfig> {
  const config: Partial<AutomationConfig> = {};

  // LLM
  if (process.env.LLM_PROVIDER) {
    config.llm = {
      ...defaultConfig.llm,
      provider: process.env.LLM_PROVIDER as any,
      apiKey: process.env.LLM_API_KEY,
      model: process.env.LLM_MODEL || defaultConfig.llm.model,
    };
  }

  // Blender
  if (process.env.BLENDER_PATH) {
    config.blender = {
      ...defaultConfig.blender,
      blenderPath: process.env.BLENDER_PATH,
    };
  }

  // Build
  if (process.env.BUILD_WORK_DIR) {
    config.build = {
      ...defaultConfig.build,
      workDir: process.env.BUILD_WORK_DIR,
      outputDir: process.env.BUILD_OUTPUT_DIR || defaultConfig.build.outputDir,
    };
  }

  // Remotion
  if (process.env.REMOTION_CLI_PATH) {
    config.remotion = {
      ...defaultConfig.remotion,
      cliPath: process.env.REMOTION_CLI_PATH,
    };
  }

  if (process.env.REMOTION_CHROMIUM_PATH) {
    config.remotion = {
      ...config.remotion,
      ...defaultConfig.remotion,
      chromiumPath: process.env.REMOTION_CHROMIUM_PATH,
    };
  }

  // Lambda
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    config.remotion = {
      ...config.remotion,
      ...defaultConfig.remotion,
      lambda: {
        region: process.env.AWS_REGION || "us-east-1",
        functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
        bucketName: process.env.AWS_S3_BUCKET || "",
      },
    };
    config.features = {
      ...defaultConfig.features,
      lambdaEnabled: true,
    };
  }

  // Assets
  if (process.env.ASSETS_CACHE_DIR) {
    config.assets = {
      ...defaultConfig.assets,
      cacheDir: process.env.ASSETS_CACHE_DIR,
      assetsDir: process.env.ASSETS_DIR || defaultConfig.assets.assetsDir,
    };
  }

  // Queue
  if (process.env.REDIS_URL) {
    config.queue = {
      ...defaultConfig.queue,
      enabled: true,
      redisUrl: process.env.REDIS_URL,
    };
  }

  return config;
}

// Merge configurations with priority: env > preset > default
export function getConfig(platform?: string): AutomationConfig {
  let config = { ...defaultConfig };

  // Apply platform preset
  if (platform && platformPresets[platform]) {
    config = deepMerge(config, platformPresets[platform]);
  }

  // Apply environment overrides
  const envConfig = loadConfigFromEnv();
  config = deepMerge(config, envConfig);

  return config;
}

// Deep merge utility
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === "object" &&
      !Array.isArray(targetValue)
    ) {
      (result as any)[key] = deepMerge(targetValue, sourceValue);
    } else if (sourceValue !== undefined) {
      (result as any)[key] = sourceValue;
    }
  }

  return result;
}

// Validate configuration
export function validateConfig(config: AutomationConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.blender.blenderPath) {
    errors.push("Blender path is required");
  }

  if (!config.build.workDir) {
    errors.push("Build work directory is required");
  }

  if (!config.build.outputDir) {
    errors.push("Build output directory is required");
  }

  if (config.remotion.renderConcurrency < 1) {
    errors.push("Render concurrency must be at least 1");
  }

  if (config.remotion.quality < 1 || config.remotion.quality > 100) {
    errors.push("Quality must be between 1 and 100");
  }

  if (config.assets.maxCacheSize < 1024 * 1024) {
    errors.push("Max cache size must be at least 1MB");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Export default config and utilities
export default defaultConfig;