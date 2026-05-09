import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const workspacePaths = process.argv.slice(2);

if (workspacePaths.length === 0) {
  console.error('Usage: node scripts/check-npm-publish.mjs <workspace> [workspace...]');
  process.exit(1);
}

function readPackageVersion(name) {
  const result = spawnSync(
    'npm',
    ['view', name, 'versions', '--json', '--registry=https://registry.npmjs.org/'],
    { encoding: 'utf8' },
  );

  if (result.status === 0) {
    const output = result.stdout.trim();
    if (!output) {
      return [];
    }

    const parsed = JSON.parse(output);
    return Array.isArray(parsed) ? parsed : [parsed];
  }

  const stderr = `${result.stderr ?? ''}${result.stdout ?? ''}`;
  if (stderr.includes('E404')) {
    return [];
  }

  console.error(stderr.trim() || `Failed to query npm for ${name}`);
  process.exit(result.status ?? 1);
}

const alreadyPublished = [];

for (const workspacePath of workspacePaths) {
  const manifestPath = path.resolve(workspacePath, 'package.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const publishedVersions = readPackageVersion(manifest.name);

  if (publishedVersions.includes(manifest.version)) {
    alreadyPublished.push(`${manifest.name}@${manifest.version}`);
  } else {
    console.log(`ok ${manifest.name}@${manifest.version}`);
  }
}

if (alreadyPublished.length > 0) {
  console.error('The following npm package versions already exist:');
  for (const spec of alreadyPublished) {
    console.error(`- ${spec}`);
  }
  console.error('Bump the package version before publishing.');
  process.exit(1);
}

console.log('All npm package versions are unpublished.');
