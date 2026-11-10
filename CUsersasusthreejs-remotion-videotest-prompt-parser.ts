import { parseVideoPrompt, parseVideoPromptSafe, VideoSpec } from "./src/automation/promptParser.ts";

// Test 1: Basic prompt
const prompt1 = "30s YouTube intro: spinning logo, particle burst, epic orchestral hit, title reveal";
console.log("Test 1:", prompt1);
try {
  const spec1 = parseVideoPrompt(prompt1);
  console.log("  Success! Duration:", spec1.durationSeconds, "Platform:", spec1.targetPlatform, "Aspect:", spec1.aspectRatio, "Scenes:", spec1.scenes.length);
  console.log("  Audio:", spec1.audio.backgroundMusic?.src, "BeatSync:", spec1.audio.beatSync);
  console.log("  Style:", spec1.globalStyle.lighting, spec1.globalStyle.cameraStyle);
} catch (e) {
  console.log("  Error:", e);
}

// Test 2: TikTok vertical
const prompt2 = "15s tiktok: dancing character, neon colors, electronic beat, fast cuts";
console.log("\nTest 2:", prompt2);
try {
  const spec2 = parseVideoPrompt(prompt2);
  console.log("  Success! Duration:", spec2.durationSeconds, "Platform:", spec2.targetPlatform, "Aspect:", spec2.aspectRatio);
  console.log("  Scenes:", spec2.scenes.map(s => s.type + "(" + s.duration + "s)").join(", "));
} catch (e) {
  console.log("  Error:", e);
}

// Test 3: Minimal prompt with defaults
const prompt3 = "spinning cube";
console.log("\nTest 3:", prompt3);
try {
  const spec3 = parseVideoPrompt(prompt3);
  console.log("  Success! Duration:", spec3.durationSeconds, "Platform:", spec3.targetPlatform, "Aspect:", spec3.aspectRatio);
  console.log("  Scenes:", spec3.scenes.map(s => s.type).join(", "));
} catch (e) {
  console.log("  Error:", e);
}

// Test 4: Safe parsing
const prompt4 = ""; // empty
console.log("\nTest 4 (safe):", prompt4);
const spec4 = parseVideoPromptSafe(prompt4);
console.log("  Result:", spec4);

// Test 5: Complex prompt
const prompt5 = "60s cinematic trailer: dramatic lighting, orchestral music, epic title reveal, slow camera dolly, particle effects";
console.log("\nTest 5:", prompt5);
try {
  const spec5 = parseVideoPrompt(prompt5);
  console.log("  Success! Duration:", spec5.durationSeconds);
  console.log("  Aspect:", spec5.aspectRatio, "Lighting:", spec5.globalStyle.lighting);
  console.log("  Camera:", spec5.globalStyle.cameraStyle);
  console.log("  Music:", spec5.audio.backgroundMusic?.src);
  console.log("  Palette primary count:", spec5.globalStyle.colorPalette?.primary.length);
} catch (e) {
  console.log("  Error:", e);
}

console.log("\nAll tests completed!");
