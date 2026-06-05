import type {
  SupramarkCodeHighlightInput,
  SupramarkCodeHighlightResult,
  SupramarkCodeHighlighter,
} from '@supramark/core';

export interface CodeHighlightService {
  highlight(input: SupramarkCodeHighlightInput): Promise<SupramarkCodeHighlightResult | null>;
}

export interface CodeHighlightCacheOptions {
  maxEntries?: number;
}

export function createCodeHighlighter(service: CodeHighlightService): SupramarkCodeHighlighter {
  return input => service.highlight(input);
}

export function withCodeHighlightCache(
  highlighter: SupramarkCodeHighlighter,
  options: CodeHighlightCacheOptions = {}
): SupramarkCodeHighlighter {
  const maxEntries = options.maxEntries ?? 256;
  const cache = new Map<string, SupramarkCodeHighlightResult | null | undefined>();

  return async input => {
    const key = buildCodeHighlightCacheKey(input);
    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = await highlighter(input);
    cache.set(key, result);

    if (cache.size > maxEntries) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) {
        cache.delete(oldest);
      }
    }

    return result;
  };
}

export function buildCodeHighlightCacheKey(input: SupramarkCodeHighlightInput): string {
  return [input.lang ?? '', input.meta ?? '', input.theme ?? '', input.code].join('\u0000');
}
