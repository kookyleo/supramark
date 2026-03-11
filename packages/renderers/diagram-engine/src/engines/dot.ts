let vizInstance: any = null;

async function ensureLoaded(): Promise<any> {
  if (vizInstance) return vizInstance;
  const mod = await import('@viz-js/viz');
  vizInstance = await mod.instance();
  return vizInstance;
}

export async function renderDot(
  code: string,
  options?: Record<string, unknown>
): Promise<string> {
  const viz = await ensureLoaded();
  const engine = typeof options?.layoutEngine === 'string'
    ? options.layoutEngine
    : typeof options?.engine === 'string'
      ? options.engine
      : 'dot';
  return viz.renderString(code, { format: 'svg', engine });
}
