#!/usr/bin/env node

import { spawn } from 'child_process';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function findBlender(): string {
  return 'blender';
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
  const configPath = args.find(a => a.startsWith('--config='))?.split('=')[1] || 'blender/configs/generate_example.json';
  const outputDir = args.find(a => a.startsWith('--output='))?.split('=')[1];
  const count = args.find(a => a.startsWith('--count='))?.split('=')[1];
  const seed = args.find(a => a.startsWith('--seed='))?.split('=')[1];
  const type = args.find(a => a.startsWith('--type='))?.split('=')[1] || 'all';

  const resolvedConfig = resolve(configPath);
  const genScript = join(__dirname, '..', 'blender', 'generate_assets.py');

  if (!existsSync(resolvedConfig) || !existsSync(genScript)) {
    console.error(`Missing: ${!existsSync(resolvedConfig) ? 'config' : 'script'}`);
    process.exit(1);
  }

  try {
    const fs = await import('fs');
    const config = JSON.parse(fs.readFileSync(resolvedConfig, 'utf-8'));
    if (outputDir) config.outputDir = resolve(outputDir);
    if (count) config.count = parseInt(count);
    if (seed) config.seed = parseInt(seed);
    config.assetTypes = [type];
    fs.writeFileSync(resolvedConfig, JSON.stringify(config, null, 2));

    await runBlenderScript(genScript, resolvedConfig, ['--type', type]);
    console.log('Asset generation completed!');
  } catch (error) {
    console.error(`Generation failed: ${error}`);
    process.exit(1);
  }
}

main();