import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { SupramarkDiagramNode, SupramarkDiagramConfig } from '@supramark/core';
import type { DiagramRenderResult } from '@supramark/diagram-engine';
import { useDiagramRender } from './DiagramRenderContext';
import { normalizeSvg, normalizeSvgLight } from './svgUtils';

export interface DiagramNodeProps {
  node: SupramarkDiagramNode;
  /**
   * 图表子系统配置
   *
   * - 由上层通过 SupramarkConfig.diagram 传入；
   * - 用于给特定 engine 注入默认的 server / timeout 等选项；
   * - 单个 diagram 的 meta（node.meta）仍然可以覆盖这些默认值。
   */
  diagramConfig?: SupramarkDiagramConfig;
}

export const DiagramNode: React.FC<DiagramNodeProps> = ({ node, diagramConfig }) => {
  const diagramRender = useDiagramRender();
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    // 中文注释：图表宽度必须跟随父容器，而不是直接按屏宽渲染，
    // 否则放进聊天气泡等窄容器时会右偏、溢出或触发重复布局。
    const nextWidth = Math.max(0, Math.floor(event.nativeEvent.layout.width));
    setContainerWidth(prev => (prev === nextWidth ? prev : nextWidth));
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSvg(null);

    const handleResult = (result: DiagramRenderResult) => {
      if (cancelled) return;

      if (!result.success) {
        const errorMsg = result.error
          ? `${result.error.message}: ${result.error.details || result.payload}`
          : result.payload || '未知错误';
        setError(errorMsg);
        setLoading(false);
        return;
      }

      if (result.format === 'svg') {
        let normalized;
        try {
          const useLightNormalize = !result.payload.includes('<style');
          normalized = useLightNormalize ? normalizeSvgLight(result.payload) : normalizeSvg(result.payload);
        } catch (err) {
          setError(`SVG 处理错误: ${err}`);
          setLoading(false);
          return;
        }

        setSvg(normalized);
        setLoading(false);
      } else {
        setError(`Unsupported diagram format: ${result.format}`);
        setLoading(false);
      }
    };

    const options = buildRenderOptions(node.engine, node.meta, diagramConfig);
    diagramRender.render({ engine: node.engine, code: node.code, options })
      .then(handleResult)
      .catch(err => {
        if (cancelled) return;
        setError(String(err));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [node.engine, node.code, node.meta, diagramConfig, diagramRender]);

  if (loading && !svg && !error) {
    return (
      <View style={styles.placeholder} onLayout={handleLayout}>
        <ActivityIndicator size="small" />
        <Text style={styles.placeholderText}>正在渲染图表（{node.engine}）...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.placeholder} onLayout={handleLayout}>
        <Text style={styles.errorText}>图表渲染错误：{error}</Text>
      </View>
    );
  }

  if (svg) {
    const containerSize = getSvgSize(svg);
    // 中文注释：首次 layout 前给出保守宽度，避免 0 宽导致的空白；
    // 一旦量到父容器宽度，就立即切换为真实宽度。
    const effectiveWidth = containerWidth > 0 ? containerWidth : 320;

    let height = 300;
    if (containerSize && containerSize.width > 0 && containerSize.height > 0) {
      height = (containerSize.height / containerSize.width) * effectiveWidth;
      height = Math.min(height, 500);
    }

    // Ensure SVG has viewBox and no fixed dimensions for proper scaling
    let scalableSvg = svg;
    if (!/viewBox="[^"]+"/.test(scalableSvg) && containerSize) {
      scalableSvg = scalableSvg.replace(
        /<svg([^>]*)>/,
        `<svg$1 viewBox="0 0 ${containerSize.width} ${containerSize.height}">`
      );
    }
    // 中文注释：去掉根节点固定宽高，让 SvgXml 用父容器尺寸控制最终显示大小。
    scalableSvg = scalableSvg
      .replace(/(<svg[^>]*)\bwidth="[^"]*"/, '$1')
      .replace(/(<svg[^>]*)\bheight="[^"]*"/, '$1');

    return (
      <View style={[styles.diagram, { height }]} onLayout={handleLayout}>
        <SvgXml xml={scalableSvg} width={effectiveWidth} height={height} />
      </View>
    );
  }

  return (
    <View style={styles.placeholder} onLayout={handleLayout}>
      <Text style={styles.placeholderText}>[diagram: {node.engine}]</Text>
    </View>
  );
};

function getSvgSize(svg: string): { width: number; height: number } | null {
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].split(/[\s,]+/);
    if (parts.length === 4) {
      const width = parseFloat(parts[2]);
      const height = parseFloat(parts[3]);
      if (width > 0 && height > 0) {
        return { width, height };
      }
    }
  }

  const widthAttrMatch = svg.match(/<svg[^>]*\bwidth="([^"]+)"/);
  const heightAttrMatch = svg.match(/<svg[^>]*\bheight="([^"]+)"/);
  const width = widthAttrMatch ? parseFloat(widthAttrMatch[1]) : 0;
  const height = heightAttrMatch ? parseFloat(heightAttrMatch[1]) : 0;
  if (width > 0 && height > 0) {
    return { width, height };
  }

  return null;
}

/**
 * 根据全局 diagramConfig 和节点自身的 meta 构造渲染选项。
 *
 * 优先级约定：
 * - diagramConfig.engines[engine] 提供引擎级默认值（server / timeout 等）；
 * - node.meta 中的字段可以覆盖这些默认值；
 * - 未提供任何配置时，返回 node.meta 原样。
 */
function buildRenderOptions(
  engine: string,
  meta: SupramarkDiagramNode['meta'],
  diagramConfig?: SupramarkDiagramConfig
): Record<string, unknown> | undefined {
  const base: Record<string, unknown> = {};

  const engineConfig = diagramConfig?.engines?.[engine];
  if (engineConfig) {
    if (typeof engineConfig.server === 'string') {
      // worker 中同时支持 server / plantumlServer 两种字段
      base.server = engineConfig.server;
      base.plantumlServer = engineConfig.server;
    }
    if (typeof engineConfig.timeoutMs === 'number') {
      base.timeout = engineConfig.timeoutMs;
    }
    if (engineConfig.cache) {
      base.cache = engineConfig.cache;
    }
  }

  if (!meta) {
    return Object.keys(base).length > 0 ? base : undefined;
  }

  return { ...base, ...meta };
}

const styles = StyleSheet.create({
  diagram: {
    width: '100%',
    minWidth: 0,
    marginBottom: 8,
  },
  placeholder: {
    width: '100%',
    minWidth: 0,
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#d4380d',
  },
});
