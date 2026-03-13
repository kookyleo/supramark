let renderFn: ((code: string, options?: Record<string, unknown>) => Promise<string> | string) | null = null;

type MermaidThemeVars = Record<string, string>;

function parseStyleAttribute(style: string): MermaidThemeVars {
  const vars: MermaidThemeVars = {};
  for (const part of style.split(';')) {
    const idx = part.indexOf(':');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key || !value) continue;
    vars[key] = value;
  }
  return vars;
}

function extractFontFamily(cssText: string, selector: string): string | null {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = cssText.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`, 'i'));
  if (!match) return null;
  const body = match[1];
  const fontMatch = body.match(/font-family\s*:\s*([^;}\n]+)/i);
  return fontMatch ? fontMatch[1].trim() : null;
}

function clampChannel(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function parseColor(value: string | null | undefined): { r: number; g: number; b: number } | null {
  if (!value) return null;
  const normalized = String(value).trim();
  const hex = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const raw = hex[1];
    if (raw.length === 3) {
      return {
        r: parseInt(raw[0] + raw[0], 16),
        g: parseInt(raw[1] + raw[1], 16),
        b: parseInt(raw[2] + raw[2], 16),
      };
    }
    return {
      r: parseInt(raw.slice(0, 2), 16),
      g: parseInt(raw.slice(2, 4), 16),
      b: parseInt(raw.slice(4, 6), 16),
    };
  }

  const rgb = normalized.match(/^rgba?\(([^)]+)\)$/i);
  if (!rgb) return null;
  const parts = rgb[1].split(',').map(part => parseFloat(part.trim()));
  if (parts.length < 3 || parts.some(Number.isNaN)) return null;
  return { r: parts[0], g: parts[1], b: parts[2] };
}

function colorToHex(color: { r: number; g: number; b: number }): string {
  const toHex = (n: number) => clampChannel(n).toString(16).padStart(2, '0');
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

function mixColors(
  fg: { r: number; g: number; b: number },
  bg: { r: number; g: number; b: number },
  fgPercent: number
): { r: number; g: number; b: number } {
  return {
    r: fg.r * fgPercent + bg.r * (1 - fgPercent),
    g: fg.g * fgPercent + bg.g * (1 - fgPercent),
    b: fg.b * fgPercent + bg.b * (1 - fgPercent),
  };
}

function splitTopLevel(input: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }
  return parts;
}

function resolveExpression(value: string, vars: MermaidThemeVars): string {
  let resolved = value.trim();

  const varPattern = /var\((--[\w-]+)(?:,\s*([^()]+|var\([^()]+\)|color-mix\([^()]+\)))?\)/g;
  let previous = '';
  while (resolved !== previous && resolved.includes('var(')) {
    previous = resolved;
    resolved = resolved.replace(varPattern, (_match, name: string, fallback?: string) => {
      const hit = vars[name];
      if (hit) return hit;
      return fallback ? resolveExpression(String(fallback), vars) : '';
    });
  }

  const colorMix = resolved.match(/^color-mix\(in\s+srgb,\s*(.+)\)$/i);
  if (colorMix) {
    const args = splitTopLevel(colorMix[1]);
    if (args.length >= 2) {
      const first = args[0].match(/^(.*?)(?:\s+(\d+(?:\.\d+)?)%)?$/);
      const second = args[1].match(/^(.*?)(?:\s+(\d+(?:\.\d+)?)%)?$/);
      const firstExpr = first?.[1]?.trim() ?? args[0];
      const secondExpr = second?.[1]?.trim() ?? args[1];
      const firstPercent = first?.[2] ? parseFloat(first[2]) / 100 : second?.[2] ? 1 - parseFloat(second[2]) / 100 : 0.5;

      const fg = parseColor(resolveExpression(firstExpr, vars));
      const bg = parseColor(resolveExpression(secondExpr, vars));
      if (fg && bg) {
        return colorToHex(mixColors(fg, bg, firstPercent));
      }
    }
  }

  return resolved;
}

function buildThemeVars(rootStyle: MermaidThemeVars, options?: Record<string, unknown>): MermaidThemeVars {
  const vars: MermaidThemeVars = {};
  const copyKeys = ['bg', 'fg', 'line', 'accent', 'muted', 'surface', 'border'] as const;

  for (const key of copyKeys) {
    const optionValue = typeof options?.[key] === 'string' ? String(options[key]).trim() : '';
    const styleValue = rootStyle[`--${key}`];
    if (optionValue) {
      vars[`--${key}`] = optionValue;
    } else if (styleValue) {
      vars[`--${key}`] = styleValue;
    }
  }

  const bg = parseColor(vars['--bg'] ?? '#ffffff') ?? { r: 255, g: 255, b: 255 };
  const fg = parseColor(vars['--fg'] ?? '#27272a') ?? { r: 39, g: 39, b: 42 };
  const line = parseColor(vars['--line']);
  const accent = parseColor(vars['--accent']);
  const muted = parseColor(vars['--muted']);
  const surface = parseColor(vars['--surface']);
  const border = parseColor(vars['--border']);

  vars['--_text'] = vars['--fg'] ?? colorToHex(fg);
  vars['--_text-sec'] = colorToHex(muted ?? mixColors(fg, bg, 0.6));
  vars['--_text-muted'] = colorToHex(muted ?? mixColors(fg, bg, 0.4));
  vars['--_text-faint'] = colorToHex(mixColors(fg, bg, 0.25));
  vars['--_line'] = colorToHex(line ?? mixColors(fg, bg, 0.3));
  vars['--_arrow'] = colorToHex(accent ?? mixColors(fg, bg, 0.5));
  vars['--_node-fill'] = colorToHex(surface ?? mixColors(fg, bg, 0.03));
  vars['--_node-stroke'] = colorToHex(border ?? mixColors(fg, bg, 0.2));
  vars['--_group-fill'] = vars['--bg'] ?? colorToHex(bg);
  vars['--_group-hdr'] = colorToHex(mixColors(fg, bg, 0.05));
  vars['--_inner-stroke'] = colorToHex(mixColors(fg, bg, 0.12));
  vars['--_key-badge'] = colorToHex(mixColors(fg, bg, 0.1));

  return vars;
}

function rewriteStyleValue(value: string, vars: MermaidThemeVars): string {
  return value.replace(/var\([^)]*\)|color-mix\([^)]*\)|rgba?\([^)]*\)|#[0-9a-fA-F]{3,6}/g, match => {
    const resolved = resolveExpression(match, vars).trim();
    return resolved || match;
  });
}

function applyFontFamilies(svg: string, textFontFamily: string | null, monoFontFamily: string | null): string {
  let next = svg;

  if (monoFontFamily) {
    next = next.replace(/<text\b([^>]*?)>/gi, (match, attrs) => {
      const hasMonoClass = /\sclass="[^"]*\bmono\b[^"]*"/i.test(match);
      const cleanedAttrs = attrs.replace(/\sclass="[^"]*\bmono\b[^"]*"/gi, '');
      if (!hasMonoClass) {
        return `<text${cleanedAttrs}>`;
      }
      if (/font-family=/.test(match) || /style="[^"]*font-family:/.test(match)) {
        return `<text${cleanedAttrs}>`;
      }
      return `<text${cleanedAttrs} font-family="${monoFontFamily.replace(/"/g, '&quot;')}">`;
    });
  }

  if (textFontFamily) {
    next = next.replace(/<text\b([^>]*?)>/gi, (match, attrs) => {
      if (/font-family=/.test(match) || /style="[^"]*font-family:/.test(match)) {
        return match;
      }
      return `<text${attrs} font-family="${textFontFamily.replace(/"/g, '&quot;')}">`;
    });
  }

  return next;
}

function inlineMermaidSvg(svg: string, options?: Record<string, unknown>): string {
  const styleMatch = svg.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const cssText = styleMatch?.[1] ?? '';
  const textFontFamily = extractFontFamily(cssText, 'text');
  const monoFontFamily = extractFontFamily(cssText, '.mono');

  const rootStyleMatch = svg.match(/<svg\b[^>]*\sstyle="([^"]*)"/i);
  const rootStyle = rootStyleMatch ? parseStyleAttribute(rootStyleMatch[1]) : {};
  const vars = buildThemeVars(rootStyle, options);

  let next = svg.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  next = next.replace(/\sstyle="([^"]*)"/gi, (_match, styleValue: string) => {
    const rewritten = rewriteStyleValue(styleValue, vars)
      .split(';')
      .map(part => part.trim())
      .filter(Boolean)
      .filter(part => !part.startsWith('--') && !part.startsWith('background:'));
    return rewritten.length > 0 ? ` style="${rewritten.join(';')}"` : '';
  });

  next = next.replace(/\s(fill|stroke|color|stop-color)="([^"]*)"/gi, (match, attr: string, value: string) => {
    const rewritten = resolveExpression(value, vars).trim();
    return rewritten ? ` ${attr}="${rewritten}"` : match;
  });

  next = next.replace(/<svg\b([^>]*)>/i, (match, attrs: string) => {
    const cleaned = attrs
      .replace(/\sclass="[^"]*"/gi, '')
      .replace(/\sstyle="[^"]*"/gi, '');
    return `<svg${cleaned}>`;
  });

  next = applyFontFamilies(next, textFontFamily, monoFontFamily);
  return next;
}

async function ensureLoaded(): Promise<(code: string, options?: Record<string, unknown>) => Promise<string> | string> {
  if (renderFn) return renderFn;
  try {
    const mod = await import('beautiful-mermaid');
    const anyMod = mod as Record<string, unknown>;
    renderFn = (anyMod.renderMermaid ??
      anyMod.renderMermaidSVG ??
      anyMod.renderMermaidSync) as typeof renderFn;
    if (!renderFn) {
      throw new Error('beautiful-mermaid did not expose a render function');
    }
    return renderFn;
  } catch (err) {
    throw new Error(
      `Failed to load beautiful-mermaid: ${err instanceof Error ? err.message : String(err)}. ` +
        'Install it with: npm install beautiful-mermaid'
    );
  }
}

export async function renderMermaid(
  code: string,
  options?: Record<string, unknown>
): Promise<string> {
  const render = await ensureLoaded();
  const svg = await render(code, options);
  return inlineMermaidSvg(svg, options);
}
