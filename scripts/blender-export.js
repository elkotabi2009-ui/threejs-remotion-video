#!/usr/bin/env node

import { spawn } from 'child_process';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface BlenderConfig {
  inputBlend: string;
  outputDir: string;
  format: 'GLTF' | 'GLB';
  exportSettings: Record<string, any>;
}

function findBlender(): string {
  const candidates = [
    'blender',
    '/Applications/Blender.app/Contents/MacOS/Blender',
    'C:/Program Files/Blender Foundation/Blender 4.0/blender.exe',
    'C:/Program Files/Blender Foundation/Blender 3.6/blender.exe',
    '/usr/bin/blender',
    '/snap/bin/blender',
  ];

  for (const candidate of candidates) {
    try {
      return candidate;
    } catch {}
  }

  return 'blender';
}

async function runBlenderScript(scriptPath: string, configPath: string, args: string[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    const blender = findBlender();
    const scriptArgs = [
      '-b',
      '-P', scriptPath,
      '--',
      '--config', configPath,
      ...args
    ];

    console.log(`Running: ${blender} ${scriptArgs.join(' ')}`);

    const proc = spawn(blender, scriptArgs, {
      stdio: 'inherit',
      cwd: join(__dirname, '..'),
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Blender exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn Blender: ${err.message}`));
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const configPath = args.find(a => a.startsWith('--config='))?.split('=')[1] || 'blender/configs/export_example.json';
  const inputBlend = args.find(a => a.startsWith('--input='))?.split('=')[1];
  const outputDir = args.find(a => a.startsWith('--output='))?.split('=')[1];

  const resolvedConfig = resolve(configPath);
  const exportScript = join(__dirname, '..', 'blender', 'export_gltf.py');

  if (!existsSync(resolvedConfig)) {
    console.error(`Config not found: ${resolvedConfig}`);
    process.exit(1);
  }

  if (!existsSync(exportScript)) {
    console.error(`Export script not found: ${exportScript}`);
    process.exit(1);
  }

  let config: BlenderConfig;
  try {
    const fs = await import('fs');
    config = JSON.parse(fs.readFileSync(resolvedConfig, 'utf-8'));
  } catch (e) {
    console.error(`Failed to parse config: ${e}`);
    process.exit(1);
  }

  if (inputBlend) config.inputBlend = resolve(inputBlend);
  if (outputDir) config.outputDir = resolve(outputDir);

  config.inputBlend = resolve(config.inputBlend);
  config.outputDir = resolve(config.outputDir);

  console.log('Blender Export Configuration:');
  console.log(JSON.stringify(config, null, 2));

  try {
    await runBlenderScript(exportScript, resolvedConfig);
    console.log('Export completed successfully!');
  } catch (error) {
    console.error(`Export failed: ${error}`);
    process.exit(1);
  }
}

main();