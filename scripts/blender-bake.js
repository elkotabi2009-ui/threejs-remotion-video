#!/usr/bin/env node

import { spawn } from 'child_process';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function findBlender(): string {
  const candidates = [
    'blender',
    '/Applications/Blender.app/Contents/MacOS/Blender',
    'C:/Program Files/Blender Foundation/Blender 4.0/blender.exe',
    'C:/Program Files/Blender Foundation/Blender 3.6/blender.exe',
    '/usr/bin/blender',
    '/snap/bin/blender',
  ];
  return candidates[0];
}

async function runBlenderScript(scriptPath: string, configPath: string, args: string[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    const blender = findBlender();
    const scriptArgs = ['-b', '-P', scriptPath, '--', '--config', configPath, ...args];

    console.log(`Running: ${blender} ${scriptArgs.join(' ')}`);

    const proc = spawn(blender, scriptArgs, { stdio: 'inherit', cwd: join(__dirname, '..') });

    proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Exit code ${code}`)));
    proc.on('error', (err) => reject(new Error(`Spawn failed: ${err.message}`)));
  });
}

async function main() {
  const args = process.argv.slice(2);
  const configPath = args.find(a => a.startsWith('--config='))?.split('=')[1] || 'blender/configs/bake_example.json';
  const inputBlend = args.find(a => a.startsWith('--input='))?.split('=')[1];
  const outputBlend = args.find(a => a.startsWith('--output='))?.split('=')[1];
  const objects = args.find(a => a.startsWith('--objects='))?.split('=')[1];

  const resolvedConfig = resolve(configPath);
  const bakeScript = join(__dirname, '..', 'blender', 'bake_animations.py');

  if (!existsSync(resolvedConfig) || !existsSync(bakeScript)) {
    console.error(`Missing: ${!existsSync(resolvedConfig) ? 'config' : 'script'}`);
    process.exit(1);
  }

  try {
    const fs = await import('fs');
    const config = JSON.parse(fs.readFileSync(resolvedConfig, 'utf-8'));
    if (inputBlend) config.inputBlend = resolve(inputBlend);
    if (outputBlend) config.outputBlend = resolve(outputBlend);
    if (objects) config.objects = objects.split(',');

    fs.writeFileSync(resolvedConfig, JSON.stringify(config, null, 2));

    await runBlenderScript(bakeScript, resolvedConfig);
    console.log('Baking completed!');
  } catch (error) {
    console.error(`Bake failed: ${error}`);
    process.exit(1);
  }
}

main();