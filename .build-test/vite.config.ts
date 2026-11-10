import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@scenes": path.resolve(__dirname, "src/scenes"),
      "@compositions": path.resolve(__dirname, "src/compositions"),
      "@timeline": path.resolve(__dirname, "src/timeline"),
      "@audio": path.resolve(__dirname, "src/audio"),
      "@editing": path.resolve(__dirname, "src/editing"),
      "@utils": path.resolve(__dirname, "src/utils"),
      "@hooks": path.resolve(__dirname, "src/hooks"),
      "@store": path.resolve(__dirname, "src/store"),
      "@types": path.resolve(__dirname, "src/types"),
      "three": "three",
      "three/examples/jsm/": "three-stdlib/",
    },
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    sourcemap: true,
    rollupOptions: {
      external: [],
      output: {
        manualChunks: {
          three: ["three", "three-stdlib", "@react-three/fiber", "@react-three/drei", "@react-three/postprocessing", "@react-three/rapier"],
          remotion: ["remotion", "@remotion/player", "@remotion/renderer", "@remotion/bundler", "@remotion/cli", "@remotion/lambda", "@remotion/media-parser", "@remotion/three", "@remotion/zod-types", "@remotion/tailwind", "@remotion/shapes", "@remotion/compositor"],
          audio: ["tone", "@tonejs/midi"],
          ui: ["react", "react-dom", "framer-motion", "zustand", "jotai"],
        },
      },
    },
  },
  optimizeDeps: {
    include: ["three", "three-stdlib", "@react-three/fiber", "@react-three/drei", "remotion", "tone", "zustand", "jotai"],
  },
  server: {
    port: 3000,
    hmr: true,
  },
  define: {
    "process.env": {},
  },
});