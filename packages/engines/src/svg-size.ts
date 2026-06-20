import type { SvgIntrinsicSize } from './types.js';

/**
 * "describe, don't mutate" 的实现核心。
 *
 * - {@link parseSvgSize} —— 引擎层用,**只读**地从 SVG 串解析固有尺寸,挂到
 *   `DiagramRenderResult.size`。绝不改写 SVG,保持对原生输出的忠实。
 * - {@link computeDiagramBox} —— web / RN 下游共用的尺寸策略:适配容器宽度、
 *   按固有比例定高、夹在 `maxHeight` 内。把"布局决策"收敛到唯一一份纯函数。
 *
 * 适用范围:图表类引擎(mermaid / d2 / plantuml / dot / echarts / vega-lite)。
 * math 走自己的字号相对布局,不消费这里的策略。
 */

/** 图表在容器内最终占据的像素尺寸。 */
export interface DiagramBox {
  width: number;
  height: number;
}

/**
 * 从 SVG 串里**只读**解析固有尺寸。
 *
 * 优先 `viewBox`(语义最稳,所有平台都能据此缩放),回退 `width/height` 属性。
 * 解析不出有效比例时返回 `null`,由下游回退默认框。不修改输入。
 */
export function parseSvgSize(svg: string): SvgIntrinsicSize | null {
  const openTag = svg.match(/<svg\b[^>]*>/i);
  if (!openTag) return null;
  const tag = openTag[0];

  // 1) viewBox 优先 —— "min-x min-y width height"。
  const viewBox = tag.match(/\bviewBox\s*=\s*["']([^"']+)["']/i);
  if (viewBox) {
    const parts = viewBox[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4) {
      const [, , w, h] = parts;
      if (isPositive(w) && isPositive(h)) return makeSize(w, h);
    }
  }

  // 2) 回退 width/height 属性(去掉 px / pt 等单位;百分比无法定比例,忽略)。
  const w = parseLength(tag.match(/\bwidth\s*=\s*["']([^"']+)["']/i)?.[1]);
  const h = parseLength(tag.match(/\bheight\s*=\s*["']([^"']+)["']/i)?.[1]);
  if (isPositive(w) && isPositive(h)) return makeSize(w, h);

  return null;
}

/**
 * 统一的图表尺寸策略,web / RN 共用。
 *
 * - 有固有比例:宽度填满容器,高度按比例推出,并夹在 `maxHeight` 内;
 * - 无固有比例(`size` 为 null):回退 `fallbackHeight`。
 */
export function computeDiagramBox(input: {
  size?: SvgIntrinsicSize | null;
  containerWidth: number;
  /** 高度上限,避免高瘦图把布局撑爆。默认 500。 */
  maxHeight?: number;
  /** 无法解析比例时的回退高度。默认 300。 */
  fallbackHeight?: number;
}): DiagramBox {
  const { size, containerWidth, maxHeight = 500, fallbackHeight = 300 } = input;
  const width = containerWidth > 0 ? containerWidth : 0;

  if (!size || !(size.aspectRatio > 0)) {
    return { width, height: fallbackHeight };
  }

  const height = Math.min(width / size.aspectRatio, maxHeight);
  return { width, height };
}

function makeSize(width: number, height: number): SvgIntrinsicSize {
  return { width, height, aspectRatio: width / height };
}

function parseLength(raw?: string): number {
  if (!raw) return NaN;
  const value = raw.trim();
  // 百分比 / em 等相对单位无法独立定出固有比例。
  if (/%|em|ex|rem/i.test(value)) return NaN;
  const m = value.match(/-?[\d.]+/);
  return m ? parseFloat(m[0]) : NaN;
}

function isPositive(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}
