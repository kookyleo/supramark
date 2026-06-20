import React from 'react';
import type { DiagramRenderResult, SvgIntrinsicSize } from '@supramark/engines';
import type { SupramarkClassNames } from './classNames';

interface DiagramBlockProps {
  classNames: SupramarkClassNames;
  code: string;
  engine: string;
  result?: DiagramRenderResult;
}

/** 高瘦图的高度上限,避免把页面撑爆;按视口高度自适应。 */
const MAX_HEIGHT = '70vh';

/** 让内联 SVG 填满外层容器的展示样式(不触碰内容/坐标)。 */
const FILL_STYLE = 'display:block;width:100%;height:100%';

/**
 * web 内联 SVG 的最小 presentation glue。
 *
 * 引擎层坚持 "describe, don't mutate":SVG 原样输出、尺寸只挂在 `size` 上。
 * 但浏览器对内联 SVG 的 CSS 缩放**硬性依赖** svg 自身的 viewBox,wrapper 兜不住,
 * 所以这里(且仅这里——渲染消费侧)做两件最小的事:
 *  1. 缺 viewBox 时用 `size` 合成一个(单向、只补不改坐标);
 *  2. 给根 svg 追加填充样式,使其铺满由 `size` 定尺寸的 wrapper。
 * 既无 viewBox 又无 size 时无法安全缩放,原样返回。
 */
function prepareDiagramSvg(payload: string, size: SvgIntrinsicSize | null): string {
  const hasViewBox = /<svg\b[^>]*\bviewBox\s*=/i.test(payload);
  if (!hasViewBox && !size) return payload;

  return payload.replace(/<svg\b([^>]*)>/i, (_tag, attrs: string) => {
    let next = attrs;
    if (!hasViewBox && size) {
      next = ` viewBox="0 0 ${size.width} ${size.height}"` + next;
    }
    if (/\bstyle\s*=\s*"/i.test(next)) {
      // 追加到已有 style 末尾:同名属性后者生效,确保填充样式胜出。
      next = next.replace(/\bstyle\s*=\s*"([^"]*)"/i, (_m, v: string) => {
        const sep = v.trim() && !v.trim().endsWith(';') ? ';' : '';
        return `style="${v}${sep}${FILL_STYLE}"`;
      });
    } else {
      next = `${next} style="${FILL_STYLE}"`;
    }
    return `<svg${next}>`;
  });
}

export const DiagramBlock: React.FC<DiagramBlockProps> = ({ classNames, code, engine, result }) => {
  if (!result || !result.success || result.format !== 'svg') {
    const errorHeader =
      result && !result.success
        ? `[diagram engine="${engine}" 渲染失败]\n${result.error?.details || result.payload}\n\n`
        : '';

    return (
      <div data-supramark-diagram={engine} className={classNames.diagram}>
        <pre className={classNames.diagramPre}>
          <code className={classNames.diagramCode}>{errorHeader + code}</code>
        </pre>
      </div>
    );
  }

  const size = result.size ?? null;
  const html = prepareDiagramSvg(result.payload, size);

  // wrapper 用 size 预留正确比例的空间(SSR 安全、无布局抖动);小图不放大到超过固有宽。
  const style: React.CSSProperties | undefined = size
    ? {
        width: '100%',
        maxWidth: `${size.width}px`,
        aspectRatio: `${size.width} / ${size.height}`,
        maxHeight: MAX_HEIGHT,
      }
    : undefined;

  return (
    <div
      data-supramark-diagram={engine}
      data-supramark-diagram-rendered="svg"
      className={classNames.diagram}
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
