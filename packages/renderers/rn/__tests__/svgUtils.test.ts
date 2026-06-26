import { test, expect } from 'bun:test';
import { normalizeSvg, normalizeSvgLight } from '../src/svgUtils';

// ============================================================================
// normalizeSvgLight — 轻量清理（用于 MathJax 这类已内联样式的 SVG）
// ============================================================================

test('normalizeSvgLight 删除 xml 头 / 注释 / style / title / desc / metadata', () => {
  const input =
    '<?xml version="1.0"?><!doctype svg><!-- c -->' +
    '<svg xmlns="x"><title>t</title><desc>d</desc><metadata>m</metadata>' +
    '<style>.a{fill:red}</style><rect/></svg>';
  const out = normalizeSvgLight(input);
  // 标签内属性空格保留，标签间空白被压缩
  expect(out).toBe('<svg xmlns="x"><rect/></svg>');
  expect(out).not.toMatch(/<\?xml|<!--|<style|<title|<desc|<metadata|<!doctype/i);
});

test('normalizeSvgLight 压缩标签间空白', () => {
  expect(normalizeSvgLight('<svg>\n  <rect/>\n</svg>')).toBe('<svg><rect/></svg>');
});

// ============================================================================
// normalizeSvg — mermaid 颜色内联
// ============================================================================

test('normalizeSvg 把 scoped CSS class 选择器的颜色内联到 rect 属性', () => {
  // 模拟 mermaid 真实结构：rect 无 fill（靠 #id .node rect { fill:..; stroke:.. }）
  const input =
    '<svg id="m1" viewBox="0 0 100 100">' +
    '<style>#m1 .node rect{fill:#ECECFF;stroke:#9370DB;stroke-width:1px}</style>' +
    '<g class="node"><rect class="basic label-container" style="" x="0" y="0" width="10" height="10"/></g>' +
    '</svg>';
  const out = normalizeSvg(input);
  const rect = out.match(/<rect[^>]*>/)?.[0] ?? '';
  expect(rect).toMatch(/fill="#ECECFF"/);
  expect(rect).toMatch(/stroke="#9370DB"/);
  expect(rect).toMatch(/stroke-width="1px"/);
  expect(out).not.toContain('<style');
});

test('normalizeSvg 元素已有 fill 属性时不覆盖', () => {
  const input =
    '<svg><style>.node rect{fill:#ECECFF}</style>' +
    '<rect class="node" fill="#FF0000" width="1" height="1"/></svg>';
  const out = normalizeSvg(input);
  const rect = out.match(/<rect[^>]*>/)?.[0] ?? '';
  expect(rect).toMatch(/fill="#FF0000"/);
  expect(rect).not.toMatch(/fill="#ECECFF"/);
});

test('normalizeSvg 没有 <style> 的 SVG 不补默认色到 rect（保持原样）', () => {
  // 无 CSS 时 inlineColors 找不到匹配的规则，rect 维持输入形态（不强行补色）
  const input = '<svg><rect class="x" width="1" height="1"/></svg>';
  const out = normalizeSvg(input);
  const rect = out.match(/<rect[^>]*>/)?.[0] ?? '';
  expect(rect).not.toMatch(/fill=/);
});

// ============================================================================
// normalizeSvg — foreignObject → text 转换（mermaid 文字）
// ============================================================================

test('normalizeSvg 把含文本的 foreignObject 转成 <text>', () => {
  // 模拟 mermaid 节点标签结构：foreignObject 内 div/span/p 文本
  const input =
    '<svg viewBox="0 0 100 100">' +
    '<g transform="translate(50,50)">' +
    '<foreignObject width="40" height="16">' +
    '<div xmlns="x"><span class="nodeLabel"><p>Start</p></span></div>' +
    '</foreignObject>' +
    '</g></svg>';
  const out = normalizeSvg(input);
  expect(out).not.toContain('<foreignObject');
  expect(out).toContain('>Start<');
  // 转换出的 text 用 foreignObject width 居中（x=20）、height*0.7 近似基线（y≈11.2）
  const text = out.match(/<text[^>]*>Start<\/text>/)?.[0] ?? '';
  expect(text).toMatch(/x="20"/);
  expect(text).toMatch(/text-anchor="middle"/);
  expect(text).toMatch(/fill: #333/);
});

test('normalizeSvg 把空 foreignObject（width=0 或无文本）删除', () => {
  const input =
    '<svg><g>' +
    '<foreignObject width="0" height="16"><div><span class="edgeLabel"></span></div></foreignObject>' +
    '<foreignObject width="10" height="16"><div><span></span></div></foreignObject>' +
    '</g></svg>';
  const out = normalizeSvg(input);
  expect(out).not.toContain('<foreignObject');
  expect(out).not.toContain('<text');
});

test('normalizeSvg foreignObject 多个 <p> 文本拼接为单个 text', () => {
  const input =
    '<svg><foreignObject width="20" height="16">' +
    '<div><p>line1</p><p>line2</p></div>' +
    '</foreignObject></svg>';
  const out = normalizeSvg(input);
  expect(out).toContain('>line1 line2<');
});

// ============================================================================
// normalizeSvg — d2 text 补色 + font-family 引号转义
// ============================================================================

test('normalizeSvg 给无 fill 的 <text style> 补默认色', () => {
  // d2 text 真实结构：style 含 text-anchor/font-size 但无 fill
  const input =
    '<svg><text x="1" y="2" fill="blue" class="text-bold" style="text-anchor:middle;font-size:16px">a</text></svg>';
  const out = normalizeSvg(input);
  const text = out.match(/<text[^>]*>/)?.[0] ?? '';
  expect(text).toMatch(/fill: #333/);
  expect(text).toMatch(/font-family:/);
});

test('normalizeSvg inlineColors 把 CSS 值里的双引号转单引号（防属性嵌套）', () => {
  // 若 CSS 的 fill/stroke 值带双引号（少见但可能），拼进 <rect fill="..."> 会嵌套。
  // sanitizeCssValue 把双引号转单引号，保证属性合法、SvgXml 能解析。
  const input =
    '<svg><style>.x{fill:"weird value"}</style><rect class="x" width="1" height="1"/></svg>';
  const out = normalizeSvg(input);
  const rect = out.match(/<rect[^>]*>/)?.[0] ?? '';
  expect(rect).toMatch(/fill="'weird value'"/);
  // 整个 rect 标签不出现 "..." 内嵌 "..."（嵌套双引号会让属性提前关闭）
  expect(rect).not.toMatch(/fill="[^"]*"[^"]+"/);
});

// ============================================================================
// normalizeSvg — 不破坏既有结构
// ============================================================================

test('normalizeSvg 不误删 rect 的 class/style 属性（安全正则回归）', () => {
  // 原版 />[^<]+</ 会把 rect 的 class 属性串当裸文本破坏，导致按 class 匹配 CSS 失效。
  const input =
    '<svg><style>.label-container{fill:#ECECFF}</style>' +
    '<rect class="basic label-container" style="" width="1" height="1"/></svg>';
  const out = normalizeSvg(input);
  const rect = out.match(/<rect[^>]*>/)?.[0] ?? '';
  // class 被保留才能让 inlineColors 匹配上 CSS、补出 fill
  expect(rect).toMatch(/class="basic label-container"/);
  expect(rect).toMatch(/fill="#ECECFF"/);
});

test('normalizeSvg 保护 <text> 内的裸文本不被删', () => {
  const input = '<svg><text x="0" y="0">Hello World</text></svg>';
  const out = normalizeSvg(input);
  expect(out).toContain('>Hello World<');
});
