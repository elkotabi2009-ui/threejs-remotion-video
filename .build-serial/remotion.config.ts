import { Config } from "@remotion/cli/config";
import * as path from "path";

const __dirname = process.cwd();

Config.VideoImageFormat = "png";
Config.Concurrency = 4;
Config.OverwriteOutput = true;
Config.PublicDir = "public";
Config.EnableOpusAudio = true;
Config.AudioBitrate = "192k";

// Usa l'API corretta: overrideBundlerConfig funziona per entrambi webpack e rspack
Config.overrideBundlerConfig((config) => {
  config.resolve = config.resolve || {};
  config.resolve.alias = config.resolve.alias || {};

  const alias = config.resolve.alias as Record<string, string>;
  alias["@"] = path.resolve(__dirname, "src");
  alias["@scenes"] = path.resolve(__dirname, "src/scenes");
  alias["@compositions"] = path.resolve(__dirname, "src/compositions");
  alias["@timeline"] = path.resolve(__dirname, "src/timeline");
  alias["@audio"] = path.resolve(__dirname, "src/audio");
  alias["@editing"] = path.resolve(__dirname, "src/editing");
  alias["@utils"] = path.resolve(__dirname, "src/utils");
  alias["@hooks"] = path.resolve(__dirname, "src/hooks");
  alias["@store"] = path.resolve(__dirname, "src/store");
  alias["@types"] = path.resolve(__dirname, "src/types");
  alias["three"] = "three";
  alias["three-stdlib"] = "three-stdlib";

  config.module = config.module || { rules: [] };
  config.module.rules.push(
    { test: /\.(glsl|vs|fs|vert|frag)$/, type: "asset/source" },
    { test: /\.(gltf|glb)$/, type: "asset/resource", generator: { filename: "assets/models/[hash][ext][query]" } },
    { test: /\.(hdr|exr)$/, type: "asset/resource", generator: { filename: "assets/textures/[hash][ext][query]" } },
    { test: /\.(mp3|wav|ogg|flac)$/, type: "asset/resource", generator: { filename: "assets/audio/[hash][ext][query]" } }
  );

  config.experiments = { asyncWebAssembly: true, topLevelAwait: true };
  config.performance = { maxAssetSize: 50_000_000, maxEntrypointSize: 100_000_000 };

  return config;
});

export const remotionConfig = Config;