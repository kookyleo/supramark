#!/usr/bin/env bun
/**
 * License compliance check for the supramark super-monorepo.
 *
 * Two responsibilities:
 *   1. Every package.json under workspace declares `license` with an
 *      SPDX expression we know about.
 *   2. The declared license is on the allow-list documented in
 *      `docs/architecture/LICENSE_COMPATIBILITY.md` and `deny.toml`.
 *
 * Step 1 of the merge plan only enforces (1) + (2) on first-party
 * packages. Transitive node_modules scanning (via license-checker) and
 * cargo-deny on the rust workspace land in steps 2-4 once Cargo.toml
 * exists. This file is the reference implementation; CI runs it as part
 * of `bun run quality`.
 */

import fs from 'node:fs';
import path from 'node:path';

// ── Allow-list: must match deny.toml and LICENSE_COMPATIBILITY.md §2 ──
// Bare SPDX identifiers; expressions like "Apache-2.0 OR MIT" are
// expanded by ALLOWED_EXPRESSIONS below.
const ALLOWED_LICENSES = new Set<string>([
  'Apache-2.0',
  'MIT',
  'MIT-0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'Unicode-DFS-2016',
  'Unicode-3.0',
  'MPL-2.0',
  'EPL-1.0',
  'EPL-2.0',
  'LGPL-3.0-or-later',
  'Zlib',
  'CC0-1.0',
  'CC-BY-4.0',
]);

const ALLOWED_EXPRESSIONS = new Set<string>([
  'Apache-2.0 OR MIT',
  'Apache-2.0 WITH LLVM-exception',
  'MIT OR Apache-2.0',
]);

// Packages that may carry tighter license restrictions than the
// monorepo default. Listed for traceability — actual enforcement happens
// when these are introduced (steps 2-4).
const KNOWN_NON_DEFAULT: Record<string, string> = {
  '@kookyleo/plantuml-little-web': 'LGPL-3.0-or-later',
  '@kookyleo/graphviz-anywhere-web': 'EPL-1.0',
  '@kookyleo/graphviz-anywhere-rn': 'EPL-1.0',
  '@kookyleo/d2-little-web': 'MPL-2.0',
};

// ── Workspace discovery ────────────────────────────────────────────────
const ROOT = process.cwd();

function readJson<T = unknown>(p: string): T {
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as T;
}

interface PackageJson {
  name?: string;
  version?: string;
  license?: string;
  private?: boolean;
}

function findPackageJsons(): string[] {
  const found: string[] = [];
  const skip = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);

  function walk(dir: string, depth: number): void {
    if (depth > 6) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (skip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, depth + 1);
      } else if (entry.isFile() && entry.name === 'package.json') {
        found.push(full);
      }
    }
  }

  walk(ROOT, 0);
  return found.sort();
}

function isAllowed(license: string): boolean {
  if (ALLOWED_LICENSES.has(license)) return true;
  if (ALLOWED_EXPRESSIONS.has(license)) return true;
  // Tolerate "(A OR B)" parenthesised SPDX forms.
  const stripped = license.replace(/[()]/g, '').trim();
  if (ALLOWED_EXPRESSIONS.has(stripped)) return true;
  return false;
}

// ── Main ───────────────────────────────────────────────────────────────
const issues: string[] = [];
const seen: Array<{ path: string; name: string; license: string }> = [];

for (const pkgPath of findPackageJsons()) {
  const rel = path.relative(ROOT, pkgPath);
  let pkg: PackageJson;
  try {
    pkg = readJson<PackageJson>(pkgPath);
  } catch (e) {
    issues.push(`${rel}: failed to parse package.json (${(e as Error).message})`);
    continue;
  }

  const name = pkg.name ?? '<unnamed>';

  if (!pkg.license) {
    issues.push(`${rel} (${name}): missing "license" field`);
    continue;
  }

  if (!isAllowed(pkg.license)) {
    issues.push(
      `${rel} (${name}): license "${pkg.license}" is not on the allow-list. ` +
        `Update docs/architecture/LICENSE_COMPATIBILITY.md and deny.toml first.`
    );
    continue;
  }

  seen.push({ path: rel, name, license: pkg.license });
}

// Surface known non-default licenses (informational, not a violation).
const nonDefault = seen.filter(p => p.license !== 'Apache-2.0');

console.log(`\n📋 License audit · ${seen.length} package.json files\n`);

if (nonDefault.length > 0) {
  console.log('  Non-default-license packages:');
  for (const p of nonDefault) {
    const expected = KNOWN_NON_DEFAULT[p.name];
    const tag = expected
      ? expected === p.license
        ? '✓ matches expected'
        : `⚠️  expected ${expected}`
      : '(first-party override)';
    console.log(`    ${p.license.padEnd(20)} ${p.name}  ${tag}`);
  }
  console.log();
}

if (issues.length > 0) {
  console.error(`❌ ${issues.length} license issue(s):\n`);
  for (const issue of issues) console.error(`   • ${issue}`);
  console.error();
  process.exit(1);
}

console.log(`✅ All ${seen.length} packages declare an allow-listed license.\n`);
