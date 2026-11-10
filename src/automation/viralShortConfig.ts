/**
 * VIRAL SHORT PIPELINE CONFIGURATION
 *
 * Ultra-realistic & viral 3D/2D short pipeline configuration
 * Implements the MASTER SYSTEM PROMPT specifications for TikTok/Reels/Shorts
 *
 * Target: 9:16, 1080x1920, 30fps - Professional quality, zero "AI Slop"
 */

export interface ViralShortConfig {
  // ============================================================================
  // MODULE 1: SCRIPT & NARRATION (COPYWRITING)
  // ============================================================================
  script: {
    // Hook formulas
    hookFormulas: {
      paradox: string;           // "Paradosso: ..."
      shockFact: string;         // "Fatto scioccante: ..."
      directAddress: string;     // "Se sei tu..."
      impossibleScale: string;   // "100.000 km di vasi..."
    };

    // Speech rate (words per second)
    speechRate: {
      photorealistic: 2.77;      // Calm, paced
      comic3D: 4.0;              // Fast, engaging
    };

    // Structure phases (frame-based for 30fps)
    structure: {
      hookFrames: number;        // 0-30 frames (1s) - Immediate hook
      setupFrames: number;       // 30-90 frames (1-3s) - Setup
      developmentFrames: number; // 90-300 frames (3-10s) - Data progression
      pivotFrames: number;       // 300-450 frames (10-15s) - The pivot
      payoffFrames: number;      // 450-600 frames (15-20s) - Payoff with twist
    };

    // Fact-checking requirements
    factChecking: {
      enabled: boolean;
      sources: string[];         // Verified databases, scientific sources
      requireCitations: boolean;
    };
  };

  // ============================================================================
  // MODULE 2: CAMERA & CINEMATOGRAPHY (ZERO AI SLOP)
  // ============================================================================
  camera: {
    // Movement analysis
    movementAnalysis: {
      // Cut rules (only 1 in 7 or less)
      maxCutsPerSecond: 0.14;
      preferTransitions: boolean;

      // Transition types (weighted)
      transitions: {
        whipPan: { weight: 0.3; minFrames: 20; maxFrames: 23; };
        zoomThrough: { weight: 0.25; minFrames: 20; maxFrames: 23; };
        slowDolly: { weight: 0.35; minFrames: 20; maxFrames: 23; ease: "slow-in-slow-out"; };
        static: { weight: 0.1; };
      };

      // Jerk minimization (derivative of acceleration)
      maxJerk: number;           // Threshold for smooth movement
      preferLinearDolly: boolean; // 65% of frames should be linear dolly/push-in
      avoidLateralRotation: boolean;
      avoidChaoticOrbits: boolean;
    };

    // Post-processing (mandatory for realism)
    postProcessing: {
      lensBlur: {
        enabled: boolean;
        intensity: number;       // Soft lens blur
        bokehQuality: "high" | "medium";
      };
      highlightControl: {
        enabled: boolean;
        preventPureWhite: boolean; // No blown whites without gradation
        rolloffCurve: "film" | "linear";
      };
      vignette: {
        enabled: boolean;
        intensity: number;       // Subtle
        color: string;           // Warm/cool based on scene
      };
      filmGrain: {
        enabled: boolean;
        intensity: number;       // Calibrated
        animated: boolean;       // Frame-varying
      };
      motionBlur: {
        enabled: boolean;
        shutterAngle: number;    // 180° standard
        samples: number;         // Quality
        calibratedPerMovement: boolean; // Per-movement calibration
      };
      colorGrading: {
        shadows: {
          neverPureBlack: boolean; // Never 100% black
          tintWarm: string;        // Warm tones for shadows
          tintCool: string;        // Cool tones for shadows
          tintPurple: string;      // Purple tones for sunset
        };
        highlights: {
          protected: boolean;
          rolloff: number;
        };
      };
    };

    // Lens characteristics
    lens: {
      focalLength: number;       // 24-35mm equivalent for shorts
      aperture: number;          // f/1.8-f/2.8 for shallow DOF
      sensorSize: "full-frame" | "aps-c";
      anamorphic: boolean;       // Optional cinematic squeeze
    };
  };

  // ============================================================================
  // MODULE 3: 3D ENGINE, ASSETS & BLENDER HEADLESS
  // ============================================================================
  assets3D: {
    // Golden rule: Use real-world assets when available
    assetAcquisition: {
      preferRealWorldAssets: boolean;
      databases: {
        anatomical: string[];    // Japanese public DBs for vessels, organs
        architectural: string[]; // Facade kits, city buildings
        vegetation: string[];    // Plant libraries
        vehicles: string[];      // Car/vehicle libraries
        props: string[];         // General prop libraries
      };
      downloadAndImport: boolean; // Auto-download via Blender scripts
      fallbackToProcedural: boolean; // Only if real asset unavailable
    };

    // Character & Rigging
    characters: {
      photorealistic: {
        useRealScans: boolean;   // Real human 3D scans
        nativeWalkCycles: boolean;
        skinClothDeformation: boolean; // Anchor skin/cloth to vertices
        faceRig: {
          blendshapes: number;   // 52 blendshapes (iPhone FaceCapture compatible)
          localOnly: boolean;    // No cloud dependencies
          library: "blender-native" | "custom";
        };
      };
      comic3D: {
        style2DIn3D: boolean;    // 2D characters lit as 3D objects
        inkLines: {
          enabled: boolean;
          minSides: 3;           // At least 3 of 4 sides
          thickness: number;
          color: string;         // Pure black #000000
        };
        proportions: {
          roundHeads: boolean;
          proportionalLimbs: boolean;
        };
      };
    };

    // Procedural Generation (Three.js / Remotion)
    procedural: {
      enabled: boolean;
      generators: {
        branchingStructures: boolean; // Blood vessels, trees, rivers
        particleFields: boolean;      // Atmospheric, magical
        geometricCities: boolean;     // Building footprints -> extruded
        organicShapes: boolean;       // Noise-based displacement
      };
      // Map directly to 3D world coordinates
      worldSpaceMapping: boolean;
    };

    // Blender Headless Optimization
    blenderHeadless: {
      parallelInstances: number; // 2 simultaneous sessions if RAM permits
      gpuAcceleration: boolean;
      renderOptimization: {
        // Module 6: Render time optimization
        lightOptimization: {
          avoidSuperfluousLights: boolean;
          particleLightCulling: boolean; // Particles don't cast global light
          flameLightCulling: boolean;    // Flames don't light every brick
          staticLightBaking: boolean;    // Bake static lights
        };
        resolutionStrategy: {
          nativeRender: "1080p";         // Native 1080p
          upscaleMethod: "lanczos" | "fsr" | "dlss"; // Intelligent upscale
          targetDisplay: "mobile-high-dpi"; // Phone displays
        };
        targetRenderTime: {
          maxHours: 1;                   // From 8h to <1h
          parallelBlender: boolean;
        };
      };
    };
  };

  // ============================================================================
  // MODULE 4: MULTI-AGENT ARCHITECTURE (Already implemented in buildOrchestrator)
  // ============================================================================
  multiAgent: {
    fileSplitStrategy: "isolated-copies"; // Each agent gets isolated project copy
    agentRoles: {
      camera: string[];
      world: string[];
      characters: string[];
      styleColors: string[];
      audio: string[];
    };
    mergeStrategy: "sequential-one-by-one";
    qualityGate: {
      frameByFrameCheck: boolean;
      checkLighting: boolean;
      checkInkLines: boolean;
      checkClipping: boolean;
      checkContrast: boolean;
    };
  };

  // ============================================================================
  // MODULE 5: AUDIO DYNAMIC & MIXING PROFESSIONAL
  // ============================================================================
  audio: {
    // Track structure (up to 19 tracks for complex projects)
    trackStructure: {
      maxTracks: 19;
      layers: {
        ambientBed: { count: 1; description: "Coherent world ambience"; };
        punctualSFX: { count: "variable"; description: "Millisecond-synced to key actions"; };
        musicBed: { count: 1; description: "Stable but balanced"; };
        narrator: { count: 1; description: "Clean, deep, compressed"; };
        Foley: { count: "variable"; description: "Footsteps, cloth, interactions"; };
        risersImpacts: { count: "variable"; description: "Transition emphasis"; };
      };
    };

    // Mix rules
    mix: {
      musicLevel: number;        // dBFS - stable bed
      sfxLevel: number;          // dBFS - incisive
      narratorLevel: number;     // dBFS - target -15 LUFS
      narratorCompression: {
        targetLUFS: -15;
        ratio: number;           // High ratio for minimum dynamics
        attack: number;          // Fast
        release: number;         // Medium
        maxGainReduction: number;
      };
      syncRule: "peaks-aligned-to-visual-changes"; // Audio peaks = visual changes
    };

    // Dynamic audio generation
    procedural: {
      enabled: boolean;
      generators: {
        ambientDrones: boolean;
        proceduralBeats: boolean;
        syntheticSFX: boolean;   // Web Audio API
        voiceoverTTS: boolean;   // Optional TTS integration
      };
    };
  };

  // ============================================================================
  // MODULE 6: RENDER OPTIMIZATION (SPEED & UPSCALE)
  // ============================================================================
  render: {
    // Integrated with assets3D.blenderHeadless.renderOptimization
    optimization: {
      // Light culling strategies
      lightCulling: {
        particleSystems: boolean; // No dynamic light per particle
        flameEffects: boolean;    // No dynamic light per flame
        distantObjects: boolean;  // No light calc for far objects
        staticSceneBaking: boolean; // Bake once, reuse
      };

      // Resolution & upscale
      resolution: {
        nativeWidth: 1080;
        nativeHeight: 1920;
        upscaleFactor: 2;         // 2x for 4K phone displays
        upscaleAlgorithm: "lanczos" | "bicubic" | "ai";
        maintainAspectRatio: boolean;
      };

      // Parallel processing
      parallel: {
        blenderInstances: number; // Based on GPU VRAM / RAM
        remotionConcurrency: number;
        frameDistribution: "round-robin" | "chunked";
      };

      // Quality vs Speed targets
      targets: {
        maxRenderTimeMinutes: 60; // < 1 hour
        qualityThreshold: "visually-indistinguishable-on-mobile";
        acceptableArtifacts: "none-visible-at-viewing-distance";
      };
    };
  };

  // ============================================================================
  // PLATFORM PRESETS (Extended)
  // ============================================================================
  platforms: {
    tiktok: ViralShortPlatformPreset;
    reels: ViralShortPlatformPreset;
    shorts: ViralShortPlatformPreset;
  };
}

export interface ViralShortPlatformPreset {
  aspectRatio: "9:16";
  resolution: { width: 1080; height: 1920 };
  fps: 30;
  maxDurationSeconds: number;   // 60 for Shorts, 180 for TikTok, 90 for Reels
  composition: string;          // "VerticalVideo"

  // Platform-specific optimizations
  encoding: {
    codec: "h264" | "hevc";
    bitrate: number;            // Mbps
    profile: "high" | "main";
    level: string;
  };

  // Audio specs per platform
  audioSpec: {
    sampleRate: 48000;
    channels: 2;
    bitrate: number;            // kbps
    loudnessTarget: -14;        // LUFS (platform normalization)
    truePeakMax: -1;            // dBTP
  };

  // Hook timing per platform algorithm
  hookTiming: {
    firstFrameCritical: boolean; // TikTok: first 0.5s critical
    retentionPoints: number[];   // Frames where hooks should land
  };
}

// ============================================================================
// DEFAULT VIRAL SHORT CONFIGURATION
// ============================================================================

export const defaultViralShortConfig: ViralShortConfig = {
  script: {
    hookFormulas: {
      paradox: "Paradosso: {statement}",
      shockFact: "Non crederai a questo: {fact}",
      directAddress: "Se sei {audience}, allora {revelation}",
      impossibleScale: "{impossibleNumber} {unit} - {context}",
    },
    speechRate: {
      photorealistic: 2.77,
      comic3D: 4.0,
    },
    structure: {
      hookFrames: 30,      // 1 second
      setupFrames: 60,     // 2 seconds
      developmentFrames: 210, // 7 seconds
      pivotFrames: 150,    // 5 seconds
      payoffFrames: 150,   // 5 seconds
    },
    factChecking: {
      enabled: true,
      sources: [
        "pubmed.ncbi.nlm.nih.gov",
        "arxiv.org",
        "nasa.gov",
        "who.int",
        "banca-dati-giapponesi-anatomia",
        "openstreetmap.org",
        "sketchfab.com",
        "polyhaven.com",
      ],
      requireCitations: true,
    },
  },

  camera: {
    movementAnalysis: {
      maxCutsPerSecond: 0.14,
      preferTransitions: true,
      transitions: {
        whipPan: { weight: 0.3, minFrames: 20, maxFrames: 23 },
        zoomThrough: { weight: 0.25, minFrames: 20, maxFrames: 23 },
        slowDolly: { weight: 0.35, minFrames: 20, maxFrames: 23, ease: "slow-in-slow-out" },
        static: { weight: 0.1 },
      },
      maxJerk: 0.5,
      preferLinearDolly: true,
      avoidLateralRotation: true,
      avoidChaoticOrbits: true,
    },
    postProcessing: {
      lensBlur: { enabled: true, intensity: 0.15, bokehQuality: "high" },
      highlightControl: { enabled: true, preventPureWhite: true, rolloffCurve: "film" },
      vignette: { enabled: true, intensity: 0.1, color: "warm" },
      filmGrain: { enabled: true, intensity: 0.03, animated: true },
      motionBlur: { enabled: true, shutterAngle: 180, samples: 16, calibratedPerMovement: true },
      colorGrading: {
        shadows: {
          neverPureBlack: true,
          tintWarm: "#1a1510",
          tintCool: "#0a0f1a",
          tintPurple: "#1a0a15",
        },
        highlights: { protected: true, rolloff: 0.85 },
      },
    },
    lens: {
      focalLength: 28, // 28mm equivalent
      aperture: 2.0,
      sensorSize: "full-frame",
      anamorphic: false,
    },
  },

  assets3D: {
    assetAcquisition: {
      preferRealWorldAssets: true,
      databases: {
        anatomical: [
          "https://bodyparts3d.lifesciencedb.jp/",
          "https://www.zanatomy.com/",
          "https://github.com/AnatomyData",
        ],
        architectural: [
          "https://www.kitbash3d.com/",
          "https://polyhaven.com/models",
          "https://ambientcg.com/",
        ],
        vegetation: [
          "https://polyhaven.com/models?category=nature",
          "https://github.com/nasa/trees",
        ],
        vehicles: [
          "https://polyhaven.com/models?category=vehicle",
          "https://github.com/3d-vehicles",
        ],
        props: [
          "https://polyhaven.com/models?category=props",
          "https://ambientcg.com/",
        ],
      },
      downloadAndImport: true,
      fallbackToProcedural: true,
    },
    characters: {
      photorealistic: {
        useRealScans: true,
        nativeWalkCycles: true,
        skinClothDeformation: true,
        faceRig: {
          blendshapes: 52,
          localOnly: true,
          library: "blender-native",
        },
      },
      comic3D: {
        style2DIn3D: true,
        inkLines: { enabled: true, minSides: 3, thickness: 2, color: "#000000" },
        proportions: { roundHeads: true, proportionalLimbs: true },
      },
    },
    procedural: {
      enabled: true,
      generators: {
        branchingStructures: true,
        particleFields: true,
        geometricCities: true,
        organicShapes: true,
      },
      worldSpaceMapping: true,
    },
    blenderHeadless: {
      parallelInstances: 2,
      gpuAcceleration: true,
      renderOptimization: {
        lightOptimization: {
          avoidSuperfluousLights: true,
          particleLightCulling: true,
          flameLightCulling: true,
          staticLightBaking: true,
        },
        resolutionStrategy: {
          nativeRender: "1080p",
          upscaleMethod: "lanczos",
          targetDisplay: "mobile-high-dpi",
        },
        targetRenderTime: {
          maxHours: 1,
          parallelBlender: true,
        },
      },
    },
  },

  multiAgent: {
    fileSplitStrategy: "isolated-copies",
    agentRoles: {
      camera: ["cameraRig.ts", "cameraPaths.ts", "transitions.ts"],
      world: ["worldGeometry.ts", "environment.ts", "proceduralGenerators.ts"],
      characters: ["characterRigs.ts", "animations.ts", "faceRigs.ts"],
      styleColors: ["colorGrading.ts", "postProcessing.ts", "inkLines.ts"],
      audio: ["audioEngine.ts", "mixing.ts", "sfxGenerator.ts"],
    },
    mergeStrategy: "sequential-one-by-one",
    qualityGate: {
      frameByFrameCheck: true,
      checkLighting: true,
      checkInkLines: true,
      checkClipping: true,
      checkContrast: true,
    },
  },

  audio: {
    trackStructure: {
      maxTracks: 19,
      layers: {
        ambientBed: { count: 1, description: "Coherent world ambience" },
        punctualSFX: { count: "variable", description: "Millisecond-synced to key actions" },
        musicBed: { count: 1, description: "Stable but balanced" },
        narrator: { count: 1, description: "Clean, deep, compressed" },
        Foley: { count: "variable", description: "Footsteps, cloth, interactions" },
        risersImpacts: { count: "variable", description: "Transition emphasis" },
      },
    },
    mix: {
      musicLevel: -24,     // dBFS
      sfxLevel: -12,       // dBFS
      narratorLevel: -18,  // dBFS (pre-compression)
      narratorCompression: {
        targetLUFS: -15,
        ratio: 8,
        attack: 0.003,  // 3ms
        release: 0.1,   // 100ms
        maxGainReduction: 12,
      },
      syncRule: "peaks-aligned-to-visual-changes",
    },
    procedural: {
      enabled: true,
      generators: {
        ambientDrones: true,
        proceduralBeats: true,
        syntheticSFX: true,
        voiceoverTTS: false, // Requires external API
      },
    },
  },

  render: {
    optimization: {
      lightCulling: {
        particleSystems: true,
        flameEffects: true,
        distantObjects: true,
        staticSceneBaking: true,
      },
      resolution: {
        nativeWidth: 1080,
        nativeHeight: 1920,
        upscaleFactor: 2,
        upscaleAlgorithm: "lanczos",
        maintainAspectRatio: true,
      },
      parallel: {
        blenderInstances: 2,
        remotionConcurrency: 4,
        frameDistribution: "chunked",
      },
      targets: {
        maxRenderTimeMinutes: 60,
        qualityThreshold: "visually-indistinguishable-on-mobile",
        acceptableArtifacts: "none-visible-at-viewing-distance",
      },
    },
  },

  platforms: {
    tiktok: {
      aspectRatio: "9:16",
      resolution: { width: 1080, height: 1920 },
      fps: 30,
      maxDurationSeconds: 180,
      composition: "VerticalVideo",
      encoding: { codec: "h264", bitrate: 16, profile: "high", level: "5.1" },
      audioSpec: { sampleRate: 48000, channels: 2, bitrate: 128, loudnessTarget: -14, truePeakMax: -1 },
      hookTiming: { firstFrameCritical: true, retentionPoints: [0, 15, 30, 90, 180] },
    },
    reels: {
      aspectRatio: "9:16",
      resolution: { width: 1080, height: 1920 },
      fps: 30,
      maxDurationSeconds: 90,
      composition: "VerticalVideo",
      encoding: { codec: "h264", bitrate: 12, profile: "high", level: "5.0" },
      audioSpec: { sampleRate: 48000, channels: 2, bitrate: 128, loudnessTarget: -14, truePeakMax: -1 },
      hookTiming: { firstFrameCritical: true, retentionPoints: [0, 15, 45, 90] },
    },
    shorts: {
      aspectRatio: "9:16",
      resolution: { width: 1080, height: 1920 },
      fps: 30,
      maxDurationSeconds: 60,
      composition: "VerticalVideo",
      encoding: { codec: "h264", bitrate: 10, profile: "high", level: "5.0" },
      audioSpec: { sampleRate: 48000, channels: 2, bitrate: 128, loudnessTarget: -14, truePeakMax: -1 },
      hookTiming: { firstFrameCritical: true, retentionPoints: [0, 10, 30, 60] },
    },
  },
};

// ============================================================================
// TYPE EXPORTS FOR INTEGRATION
// ============================================================================

export type ViralShortScriptStyle = "photorealistic" | "comic3D";
export type ViralShortPlatform = "tiktok" | "reels" | "shorts";
export type CameraTransitionType = "whipPan" | "zoomThrough" | "slowDolly" | "static";
export type AssetSource = "real-world" | "procedural" | "hybrid";
export type RenderTarget = "mobile" | "desktop" | "both";

export default defaultViralShortConfig;