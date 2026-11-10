import { Configuration } from "webpack";

export const webpackOverride = (config: Configuration): Configuration => {
  config.resolve ??= {};
  config.resolve.alias ??= {};
  config.resolve.alias["three"] = "three";
  config.resolve.alias["three/examples/jsm/"] = "three-stdlib/";

  config.module ??= { rules: [] };
  config.module.rules.push(
    {
      test: /\.(glsl|vs|fs|vert|frag)$/,
      type: "asset/source",
    },
    {
      test: /\.(gltf|glb)$/,
      type: "asset/resource",
      generator: { filename: "assets/models/[hash][ext][query]" },
    },
    {
      test: /\.(hdr|exr)$/,
      type: "asset/resource",
      generator: { filename: "assets/textures/[hash][ext][query]" },
    },
    {
      test: /\.(mp3|wav|ogg|flac)$/,
      type: "asset/resource",
      generator: { filename: "assets/audio/[hash][ext][query]" },
    }
  );

  config.experiments ??= {};
  config.experiments.asyncWebAssembly = true;
  config.experiments.topLevelAwait = true;

  config.performance ??= {};
  config.performance.maxAssetSize = 50_000_000;
  config.performance.maxEntrypointSize = 100_000_000;

  return config;
};