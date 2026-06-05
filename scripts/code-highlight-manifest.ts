#!/usr/bin/env bun
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  createCodeHighlightCompileManifest,
  type SupramarkConfig,
  type SupramarkFeature,
  type SupramarkNode,
} from '../packages/core/src/index';
import { discoverFeaturePackages } from './lib-feature-layout';

interface CliArgs {
  config?: string;
  out?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--config') {
      args.config = argv[++i];
    } else if (arg === '--out') {
      args.out = argv[++i];
    }
  }

  return args;
}

function readConfig(configPath?: string): SupramarkConfig | undefined {
  if (!configPath) return undefined;

  const absPath = path.resolve(process.cwd(), configPath);
  return JSON.parse(fs.readFileSync(absPath, 'utf8')) as SupramarkConfig;
}

async function importFeature(featureDir: string): Promise<SupramarkFeature<SupramarkNode>[]> {
  const entry = path.join(featureDir, 'src/index.ts');
  const mod = await import(pathToFileURL(entry).href);
  const features: SupramarkFeature<SupramarkNode>[] = [];

  for (const value of Object.values(mod)) {
    if (
      value &&
      typeof value === 'object' &&
      'metadata' in value &&
      'syntax' in value &&
      'renderers' in value
    ) {
      features.push(value as SupramarkFeature<SupramarkNode>);
    }
  }

  return features;
}

function selectEnabledFeatures(
  features: SupramarkFeature<SupramarkNode>[],
  config?: SupramarkConfig
): SupramarkFeature<SupramarkNode>[] {
  if (!config || !config.features || config.features.length === 0) {
    return features;
  }

  const enabledIds = new Set(
    config.features.filter(feature => feature.enabled).map(feature => feature.id)
  );
  return features.filter(feature => enabledIds.has(feature.metadata.id));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = readConfig(args.config);
  const packages = discoverFeaturePackages();
  const allFeatures: SupramarkFeature<SupramarkNode>[] = [];

  for (const pkg of packages) {
    const featureSource = path.join(pkg.dir, 'src/feature.ts');
    if (
      !fs.existsSync(featureSource) ||
      !fs.readFileSync(featureSource, 'utf8').includes('codeHighlight')
    ) {
      continue;
    }

    allFeatures.push(...(await importFeature(pkg.dir)));
  }

  const enabledFeatures = selectEnabledFeatures(allFeatures, config);
  const manifest = createCodeHighlightCompileManifest(enabledFeatures);
  const json = JSON.stringify(manifest, null, 2) + '\n';

  if (args.out) {
    const outPath = path.resolve(process.cwd(), args.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, json, 'utf8');
    console.log(`[code-highlight] Wrote ${args.out}`);
  } else {
    process.stdout.write(json);
  }
}

await main();
