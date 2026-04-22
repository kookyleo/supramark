#!/usr/bin/env node
/**
 * generate_ref.mjs — Deterministic reference SVG generator for mermaid-little.
 *
 * Two modes:
 *   1. single-file:  node generate_ref.mjs <input.mmd> [-o <out.svg>]
 *        Writes to stdout if -o is omitted. Exit 0 on success.
 *   2. batch:        node generate_ref.mjs --batch
 *        Walks ../fixtures and ../ext_fixtures under the project's tests/
 *        dir, renders every *.mmd, mirrors the relative path into
 *        ../reference/ with a .svg suffix. Prints per-file status.
 *
 * Determinism notes:
 *   - We feed a stable id (derived from the fixture path in batch mode,
 *     or the basename in single-file mode) to mermaid.render, so element
 *     id's do not drift across runs.
 *   - Text measurement is currently an 8px-per-char / 14px-per-line
 *     placeholder. Phase 2 will replace this with a DejaVu-Sans-baked
 *     shim matching plantuml-little's font_data.rs. Until then the
 *     reference SVGs are locked to the current placeholder geometry —
 *     regenerate after the shim lands.
 */

import { JSDOM } from 'jsdom';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, appendFileSync } from 'node:fs';
import { dirname, basename, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { textWidth, lineHeight, measureTextBlock } from './font_metrics.mjs';

// Install process-level error handlers BEFORE any other imports that
// could throw during initialisation (mermaid's module load path can
// synchronously die deep inside its DOM globals / cytoscape setup).
// The handlers need a side-channel to record WHICH worker died and on
// WHICH fixture — that state is wired up later inside runWorker().
let __workerCrashSink = null; // set by runWorker to a fs path
let __workerCrashTag = 'pre-init';
process.on('uncaughtException', (err) => {
  const line = `${__workerCrashTag}\t__CRASH__ ${err?.message ?? err}`;
  try {
    if (__workerCrashSink) appendFileSync(__workerCrashSink, line + '\n');
  } catch {}
  process.stderr.write(`[crash ${__workerCrashTag}] ${err?.stack ?? err?.message ?? err}\n`);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  const line = `${__workerCrashTag}\t__REJECT__ ${err?.message ?? err}`;
  try {
    if (__workerCrashSink) appendFileSync(__workerCrashSink, line + '\n');
  } catch {}
  process.stderr.write(`[reject ${__workerCrashTag}] ${err?.stack ?? err?.message ?? err}\n`);
  process.exit(1);
});

// ---------- DOM globals ----------
const dom = new JSDOM(
  `<!DOCTYPE html><html><body><div id="container"></div></body></html>`,
  { pretendToBeVisual: true },
);
const W = dom.window;
// jsdom exposes these on W but not on globalThis; mermaid and its
// runtime deps reach for them as bare globals in various code paths.
for (const k of [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'SVGElement',
  'Element',
  'Node',
  'DOMParser',
  'XMLSerializer',
  'getComputedStyle',
  'screen',
  'location',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'MutationObserver',
  'Image',
  'CSS',
]) {
  if (W[k] !== undefined) globalThis[k] = W[k];
}
if (!globalThis.screen) globalThis.screen = { availWidth: 1024, availHeight: 768, width: 1024, height: 768 };

// jsdom ships HTMLCanvasElement but throws on getContext unless the
// native `canvas` npm package is installed. cytoscape (used by
// architecture + mindmap-cose-bilkent + some flowchart code paths)
// initialises a canvas renderer eagerly — returning null makes it
// throw "Could not create canvas of type 2d". So return a silent
// no-op 2d context good enough to let cytoscape's renderer
// initialise. We don't actually draw via canvas; mermaid's SVG
// output comes from its own DOM tree, not canvas pixels.
// Prevent jsdom from trying to fetch remote images for label tags
// like <img src="https://..."> inside mermaid diagrams. Without this,
// mermaid.render() hangs forever on network IO; even with the
// RENDER_TIMEOUT_MS guard, it wastes real time per fixture.
if (W.HTMLImageElement) {
  Object.defineProperty(W.HTMLImageElement.prototype, 'src', {
    set(_v) {
      // Drop the URL on the floor; fire synthetic error so any
      // onload/onerror observer wakes up.
      setTimeout(() => {
        this.dispatchEvent && this.dispatchEvent(new W.Event('error'));
      }, 0);
    },
    get() {
      return '';
    },
  });
}

// Block fetch globally in the jsdom env — another avenue mermaid can
// use to pull icon SVGs or similar. Return a resolved response that
// looks like a 200 to keep callers happy, but with empty body.
globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  text: async () => '',
  json: async () => ({}),
  arrayBuffer: async () => new ArrayBuffer(0),
  blob: async () => new W.Blob([], { type: 'text/plain' }),
});

if (W.HTMLCanvasElement) {
  const noop = () => {};
  const measureText = () => ({ width: 0 });
  const makeCtx = () => ({
    canvas: { width: 0, height: 0 },
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    globalAlpha: 1,
    save: noop,
    restore: noop,
    translate: noop,
    rotate: noop,
    scale: noop,
    setTransform: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    rect: noop,
    fill: noop,
    stroke: noop,
    clip: noop,
    fillText: noop,
    strokeText: noop,
    fillRect: noop,
    strokeRect: noop,
    clearRect: noop,
    measureText,
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    drawImage: noop,
    getImageData: () => ({ data: new Uint8ClampedArray(0) }),
    putImageData: noop,
  });
  W.HTMLCanvasElement.prototype.getContext = function () {
    return makeCtx();
  };
}

// Text-metric shim backed by DejaVu Sans / DejaVu Sans Bold TTFs via
// opentype.js. Both sides of the pipeline (this generator + the Rust
// renderer) consume the same TTFs, so getBBox output here matches the
// Rust font_metrics module byte-for-byte — the anchor that makes the
// byte-exact reference tests work.
//
// Patched on SVGElement, HTMLElement, and Element (fallback) — block,
// mindmap, and treemap reach for getBBox on HTML labels inside
// <foreignObject>, not just SVG text.
function resolveFont(el) {
  // Walk up the tree looking for the closest font-family / font-size /
  // font-weight declaration. Attributes first, then inline style.
  let size = 14;
  let family = 'sans-serif';
  let bold = false;
  let sizeSet = false,
    familySet = false,
    weightSet = false;
  let node = el;
  while (node && node.nodeType === 1) {
    const g = (k) => (node.getAttribute ? node.getAttribute(k) : null);
    const style = node.style ?? {};
    if (!sizeSet) {
      const s = g('font-size') ?? style.fontSize ?? null;
      if (s) {
        const m = /([0-9.]+)/.exec(String(s));
        if (m) {
          size = parseFloat(m[1]);
          sizeSet = true;
        }
      }
    }
    if (!familySet) {
      const f = g('font-family') ?? style.fontFamily ?? null;
      if (f) {
        family = String(f);
        familySet = true;
      }
    }
    if (!weightSet) {
      const w = g('font-weight') ?? style.fontWeight ?? null;
      if (w) {
        const s = String(w).trim().toLowerCase();
        bold = s === 'bold' || s === 'bolder' || (parseInt(s, 10) >= 600);
        weightSet = true;
      }
    }
    if (sizeSet && familySet && weightSet) break;
    node = node.parentNode;
  }
  return { size, family, bold };
}

function attrNum(el, k, d = 0) {
  const v = el?.getAttribute ? el.getAttribute(k) : null;
  if (v == null || v === '') return d;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : d;
}

// Non-visible SVG elements contribute zero to a parent's bbox, even
// though they have textContent. Measuring their text as "layout width"
// inflates <svg>.getBBox by tens of thousands of pixels because id
// prefixes in <style>...</style> balloon the inner CSS source.
const NON_VISIBLE_TAGS = new Set([
  'style',
  'defs',
  'metadata',
  'title',
  'desc',
  'script',
  'marker',
  'pattern',
  'mask',
  'clippath',
  'symbol',
  'lineargradient',
  'radialgradient',
  'filter',
]);

function intrinsicBox(el) {
  // Per-tag bbox without descending. For <g>, returns null so the
  // caller recurses into children.
  const tag = (el.tagName ?? '').toLowerCase();
  if (NON_VISIBLE_TAGS.has(tag)) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  if (tag === 'rect') {
    return {
      x: attrNum(el, 'x'),
      y: attrNum(el, 'y'),
      width: attrNum(el, 'width'),
      height: attrNum(el, 'height'),
    };
  }
  if (tag === 'circle') {
    const r = attrNum(el, 'r');
    return { x: attrNum(el, 'cx') - r, y: attrNum(el, 'cy') - r, width: r * 2, height: r * 2 };
  }
  if (tag === 'ellipse') {
    const rx = attrNum(el, 'rx'), ry = attrNum(el, 'ry');
    return { x: attrNum(el, 'cx') - rx, y: attrNum(el, 'cy') - ry, width: rx * 2, height: ry * 2 };
  }
  if (tag === 'line') {
    const x1 = attrNum(el, 'x1'), y1 = attrNum(el, 'y1');
    const x2 = attrNum(el, 'x2'), y2 = attrNum(el, 'y2');
    return {
      x: Math.min(x1, x2), y: Math.min(y1, y2),
      width: Math.abs(x2 - x1), height: Math.abs(y2 - y1),
    };
  }
  if (tag === 'foreignobject') {
    // Use explicit width/height if set, else fall back to the HTML
    // content's measurement.
    const w = attrNum(el, 'width', -1), h = attrNum(el, 'height', -1);
    if (w >= 0 && h >= 0) return { x: attrNum(el, 'x'), y: attrNum(el, 'y'), width: w, height: h };
    const { size, family, bold } = resolveFont(el);
    const { width, height } = measureTextBlock(el.textContent ?? '', family, size, bold);
    return { x: 0, y: 0, width, height };
  }
  if (tag === 'text' || tag === 'tspan') {
    const { size, family, bold } = resolveFont(el);
    const { width, height } = measureTextBlock(el.textContent ?? '', family, size, bold);
    return { x: 0, y: 0, width, height };
  }
  if (tag === 'g' || tag === 'svg') {
    return null; // recurse
  }
  // HTML in foreignObject, or anything else measurable via textContent.
  const { size, family, bold } = resolveFont(el);
  const { width, height } = measureTextBlock(el.textContent ?? '', family, size, bold);
  return { x: 0, y: 0, width, height };
}

function unionBox(boxes) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let found = false;
  for (const b of boxes) {
    if (!b) continue;
    if (b.width === 0 && b.height === 0) continue;
    found = true;
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.width > maxX) maxX = b.x + b.width;
    if (b.y + b.height > maxY) maxY = b.y + b.height;
  }
  if (!found) return { x: 0, y: 0, width: 0, height: 0 };
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function elementBBox() {
  const intrinsic = intrinsicBox(this);
  if (intrinsic) return intrinsic;
  // <g> / <svg>: union of descendant intrinsic boxes. Skip transforms
  // for now (mermaid places geometry in local coords by default).
  const stack = [this];
  const boxes = [];
  let depth = 0;
  while (stack.length && depth++ < 5000) {
    const n = stack.pop();
    for (const c of n.children ?? []) {
      const ib = intrinsicBox(c);
      if (ib) boxes.push(ib);
      else stack.push(c); // <g>/<svg> - descend
    }
  }
  return unionBox(boxes);
}
function textLen() {
  const { size, family, bold } = resolveFont(this);
  return textWidth(this.textContent ?? '', family, size, bold);
}
const textBBox = elementBBox;

W.SVGElement.prototype.getBBox = textBBox;
W.SVGElement.prototype.getComputedTextLength = textLen;
if (W.HTMLElement) W.HTMLElement.prototype.getBBox = textBBox;
if (W.Element && !W.Element.prototype.getBBox) W.Element.prototype.getBBox = textBBox;

const mermaid = (await import('mermaid')).default;
mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' });

// ---------- render one source ----------
// Guarded against mermaid.render() promises that never settle (seen
// on fixtures with remote <img src>, fa: icons, or certain flowchart
// syntax variants). Also flush document.body between calls — without
// this, some renders pollute the DOM such that subsequent renders
// also hang.
const RENDER_TIMEOUT_MS = 3_000;
async function renderOne(source, id) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`render timeout after ${RENDER_TIMEOUT_MS}ms`)), RENDER_TIMEOUT_MS);
  });
  try {
    // Clean state: mermaid leaves stray nodes (tooltips, id-scoped
    // foreignObject labels) that accumulate across renders.
    const body = W.document.body;
    while (body.firstChild) body.removeChild(body.firstChild);
    const { svg } = await Promise.race([mermaid.render(id, source), timeout]);
    return svg;
  } finally {
    clearTimeout(timer);
  }
}

// ---------- mode dispatch ----------
const argv = process.argv.slice(2);
if (argv.includes('-h') || argv.includes('--help')) {
  console.log(
    'usage:\n  generate_ref.mjs <input.mmd> [-o <out.svg>]\n  generate_ref.mjs --batch',
  );
  process.exit(0);
}

const HERE = dirname(fileURLToPath(import.meta.url));
const TESTS_DIR = resolve(HERE, '..');

function idForPath(mmdPath) {
  // Stable id derived from relative path under tests/. No chars that
  // would confuse mermaid's id-as-css-selector usage.
  const rel = relative(TESTS_DIR, mmdPath).replace(extname(mmdPath), '');
  return 'ref-' + rel.replace(/[^a-zA-Z0-9]+/g, '-');
}

if (argv[0] === '--batch') {
  // --batch has two modes:
  //   1. Coordinator: `--batch` or `--batch --workers N`
  //      Forks N workers, each gets --chunk i/N, merges results.
  //   2. Worker:      `--batch --chunk K/N`
  //      Processes only fixtures whose index mod N === K.
  const chunkArgIdx = argv.indexOf('--chunk');
  const workersArgIdx = argv.indexOf('--workers');
  const isWorker = chunkArgIdx !== -1;

  const sources = [join(TESTS_DIR, 'fixtures'), join(TESTS_DIR, 'ext_fixtures')];
  const refRoot = join(TESTS_DIR, 'reference');

  // Enumerate all fixtures up front so workers have a stable, shared
  // indexing. Sort for determinism, then deterministically shuffle —
  // consecutive fixtures from the same diagram type tend to fail in
  // bursts (e.g. all flowchart/1*.mmd hit remote-image timeouts). The
  // shuffle spreads those hot spots across workers so no single
  // worker dominates wall-clock.
  const allFixtures = [];
  for (const root of sources) {
    if (!existsSync(root)) continue;
    for (const mmdPath of walk(root)) {
      if (mmdPath.endsWith('.mmd')) allFixtures.push({ root, mmdPath });
    }
  }
  allFixtures.sort((a, b) => a.mmdPath.localeCompare(b.mmdPath));
  // Mulberry32 deterministic PRNG, seeded by fixture count so the
  // order is reproducible but spreads pathological bursts.
  let seed = allFixtures.length;
  const rand = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = allFixtures.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [allFixtures[i], allFixtures[j]] = [allFixtures[j], allFixtures[i]];
  }

  if (!isWorker) {
    // ---- Coordinator path ----
    const nWorkers = workersArgIdx !== -1 ? parseInt(argv[workersArgIdx + 1], 10) : 1;
    if (!Number.isFinite(nWorkers) || nWorkers < 1) {
      console.error('error: --workers must be a positive integer');
      process.exit(2);
    }

    const startedAt = Date.now();
    if (nWorkers === 1) {
      // Single-worker inline path: avoid fork overhead on small runs.
      await runWorker(0, 1, allFixtures, refRoot, startedAt);
      process.exit(0);
    }

    // Fan out to children. Each child writes its own failure log at
    // reference/_failures.<pid>.log; coordinator merges at the end.
    const { fork } = await import('node:child_process');
    const scriptPath = fileURLToPath(import.meta.url);
    const children = [];
    console.log(`dispatching ${allFixtures.length} fixtures across ${nWorkers} workers...`);
    for (let i = 0; i < nWorkers; i++) {
      const child = fork(scriptPath, ['--batch', '--chunk', `${i}/${nWorkers}`], {
        stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
      });
      children.push(
        new Promise((res) => {
          child.on('exit', (code) => res({ i, code }));
        }),
      );
    }
    const results = await Promise.all(children);
    const bad = results.filter((r) => r.code !== 0);
    const secs = ((Date.now() - startedAt) / 1000).toFixed(1);

    // Merge per-worker failure logs into a single _failures.log
    const merged = [];
    for (let i = 0; i < nWorkers; i++) {
      const p = join(refRoot, `_failures.worker-${i}.log`);
      if (existsSync(p)) {
        const content = readFileSync(p, 'utf8').trim();
        if (content) merged.push(content);
        try {
          (await import('node:fs')).rmSync(p);
        } catch {}
      }
    }
    if (merged.length > 0) {
      const allPath = join(refRoot, '_failures.log');
      writeFileSync(allPath, merged.join('\n') + '\n');
    }
    const svgCount = countSvgs(refRoot);
    const failCount = merged.length === 0 ? 0 : merged.reduce((n, s) => n + s.split('\n').length, 0);
    console.log(
      `\ncoordinator summary: ${svgCount} svg / ${failCount} fail / ${allFixtures.length} total in ${secs}s; workers with non-zero exit: ${bad.length}`,
    );
    process.exit(0);
  }

  // ---- Worker path ----
  const spec = argv[chunkArgIdx + 1] ?? '';
  const [kStr, nStr] = spec.split('/');
  const K = parseInt(kStr, 10);
  const N = parseInt(nStr, 10);
  if (!Number.isFinite(K) || !Number.isFinite(N) || N < 1 || K < 0 || K >= N) {
    console.error(`error: --chunk expects form K/N with 0<=K<N, got ${spec}`);
    process.exit(2);
  }
  const slice = allFixtures.filter((_, idx) => idx % N === K);
  await runWorker(K, N, slice, refRoot, Date.now());
  process.exit(0);
} else {
  const inputPath = argv[0];
  if (!inputPath) {
    console.error('error: missing input path. Use --help.');
    process.exit(2);
  }
  const outIdx = argv.indexOf('-o');
  const outPath = outIdx !== -1 ? argv[outIdx + 1] : null;
  const src = readFileSync(inputPath, 'utf8');
  // Use the same path-based id scheme as --batch so single-file and
  // batch invocations produce byte-identical output for the same
  // fixture. If the input is outside tests/, fall back to basename.
  const abs = resolve(inputPath);
  const id = abs.startsWith(TESTS_DIR + '/')
    ? idForPath(abs)
    : 'ref-' + basename(inputPath, extname(inputPath)).replace(/[^a-zA-Z0-9]+/g, '-');
  const svg = await renderOne(src, id);
  if (outPath) {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, svg);
  } else {
    process.stdout.write(svg);
  }
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) yield* walk(p);
    else yield p;
  }
}

function countSvgs(root) {
  if (!existsSync(root)) return 0;
  let n = 0;
  for (const p of walk(root)) if (p.endsWith('.svg')) n++;
  return n;
}

async function runWorker(workerId, totalWorkers, slice, refRoot, startedAt) {
  // Each worker writes its own incremental failure log so a crash
  // doesn't lose the diagnostic trail we've accumulated so far.
  const failLogPath = join(refRoot, `_failures.worker-${workerId}.log`);
  mkdirSync(refRoot, { recursive: true });
  writeFileSync(failLogPath, '');
  __workerCrashSink = failLogPath;
  __workerCrashTag = `w${workerId}:<pre-loop>`;
  const appendFail = (line) => appendFileSync(failLogPath, line + '\n');

  const tag = totalWorkers === 1 ? '' : `[w${workerId}] `;
  let ok = 0, fail = 0;
  for (let i = 0; i < slice.length; i++) {
    const { root, mmdPath } = slice[i];
    const currentFixture = relative(TESTS_DIR, mmdPath);
    __workerCrashTag = `w${workerId}:${currentFixture}`;
    const relPath = relative(root, mmdPath);
    const outPath = join(refRoot, basename(root), relPath).replace(/\.mmd$/, '.svg');
    mkdirSync(dirname(outPath), { recursive: true });
    try {
      const src = readFileSync(mmdPath, 'utf8');
      let svg;
      try {
        svg = await renderOne(src, idForPath(mmdPath));
      } catch (err) {
        if ((err.message ?? '').includes('beginning with ---')) {
          const normalised = src.replace(/^\s+(---)$/gm, '$1');
          svg = await renderOne(normalised, idForPath(mmdPath));
        } else {
          throw err;
        }
      }
      writeFileSync(outPath, svg);
      ok++;
    } catch (err) {
      fail++;
      const msg = (err.message ?? String(err)).split('\n')[0];
      appendFail(`${currentFixture}\t${msg}`);
    }
    if ((ok + fail) % 50 === 0) {
      const secs = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.log(`${tag}  progress: ${ok} ok / ${fail} fail / ${slice.length} total (${secs}s)`);
    }
  }
  const secs = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`${tag}summary: ${ok}/${slice.length} ok, ${fail} fail in ${secs}s`);
}
