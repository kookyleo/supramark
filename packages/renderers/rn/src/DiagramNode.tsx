import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { SupramarkDiagramNode, SupramarkDiagramConfig } from '@supramark/core';
import {
  type DiagramRenderResult as LocalDiagramRenderResult,
} from '@supramark/engines';
import { createReactNativeDiagramEngine } from '@supramark/engines/rn';
import type { DiagramRenderResult as WorkerDiagramRenderResult } from '@supramark/rn-diagram-worker';
import { useOptionalDiagramRender } from '@supramark/rn-diagram-worker';
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

type DiagramRenderResult = LocalDiagramRenderResult | WorkerDiagramRenderResult;

const defaultDiagramEngine = createReactNativeDiagramEngine();

export const DiagramNode: React.FC<DiagramNodeProps> = ({ node, diagramConfig }) => {
  const diagramRender = useOptionalDiagramRender();
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const maxRetries = 2;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSvg(null);

    const attemptRender = () => {
      const options = buildRenderOptions(node.engine, node.meta, diagramConfig);
      const normalizedEngine = String(node.engine || '').toLowerCase();
      const useLocalEngine =
        normalizedEngine === 'mermaid' ||
        normalizedEngine === 'dot' ||
        normalizedEngine === 'graphviz';

      const renderPromise: Promise<DiagramRenderResult> =
        useLocalEngine
          ? defaultDiagramEngine.render({ engine: normalizedEngine, code: node.code, options })
          : diagramRender
            ? diagramRender.render({ engine: node.engine, code: node.code, options })
            : Promise.resolve({
                id: `missing_provider_${Date.now()}`,
                engine: node.engine,
                success: false,
                format: 'error',
                payload: 'DiagramRenderProvider is required for non-mermaid diagram engines.',
                error: {
                  code: 'render_error',
                  message: `${node.engine} rendering requires DiagramRenderProvider`,
                  details: 'Wrap <Supramark /> with <DiagramRenderProvider /> when using WebView-based diagram engines.',
                },
              });

      renderPromise
        .then(result => {
          if (cancelled) return;

          if (!result.success) {
            // 渲染失败，显示错误
            const errorMsg = result.error
              ? `${result.error.message}: ${result.error.details || result.payload}`
              : result.payload || '未知错误';

            // 如果是超时错误且未达到重试上限，自动重试
            if (result.error?.code === 'timeout' && retryCount < maxRetries) {
              // debug: Diagram render timeout, retrying...
              setRetryCount(retryCount + 1);
              setTimeout(attemptRender, 1000); // 1秒后重试
              return;
            }

            setError(errorMsg);
            setLoading(false);
            return;
          }

          if (result.format === 'svg') {
            let normalized;
            try {
              normalized = result.payload.includes('<style')
                ? normalizeSvg(result.payload)
                : normalizeSvgLight(result.payload);
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
        })
        .catch(err => {
          if (cancelled) return;
          setError(String(err));
          setLoading(false);
        });
    };

    attemptRender();

    return () => {
      cancelled = true;
    };
  }, [node.engine, node.code, node.meta, diagramConfig, diagramRender, retryCount]);

  if (loading && !svg && !error) {
    return (
      <View style={styles.placeholder}>
        <ActivityIndicator size="small" />
        <Text style={styles.placeholderText}>正在渲染图表（{node.engine}）...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.errorText}>图表渲染错误：{error}</Text>
      </View>
    );
  }

  if (svg) {
    const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
    const widthAttrMatch = svg.match(/<svg[^>]*\bwidth="([^"]+)"/);
    const heightAttrMatch = svg.match(/<svg[^>]*\bheight="([^"]+)"/);

    const { width: screenWidth } = Dimensions.get('window');
    const containerWidth = screenWidth - 32;
    let svgWidth = 0;
    let svgHeight = 0;

    if (viewBoxMatch) {
      const parts = viewBoxMatch[1].split(/[\s,]+/);
      if (parts.length === 4) {
        svgWidth = parseFloat(parts[2]);
        svgHeight = parseFloat(parts[3]);
      }
    }

    if (svgWidth <= 0 && widthAttrMatch) svgWidth = parseFloat(widthAttrMatch[1]);
    if (svgHeight <= 0 && heightAttrMatch) svgHeight = parseFloat(heightAttrMatch[1]);

    let height = 300;
    if (svgWidth > 0 && svgHeight > 0) {
      height = (svgHeight / svgWidth) * containerWidth;
      height = Math.min(height, 500);
    }

    let scalableSvg = svg;
    if (!viewBoxMatch && svgWidth > 0 && svgHeight > 0) {
      scalableSvg = scalableSvg.replace(
        /<svg([^>]*)>/,
        `<svg$1 viewBox="0 0 ${svgWidth} ${svgHeight}">`
      );
    }

    scalableSvg = scalableSvg
      .replace(/(<svg[^>]*)\bwidth="[^"]*"/, '$1')
      .replace(/(<svg[^>]*)\bheight="[^"]*"/, '$1');

    return (
      <View style={[styles.diagram, { width: containerWidth, height }]}>
        <SvgXml xml={scalableSvg} width={containerWidth} height={height} />
      </View>
    );
  }

  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>[diagram: {node.engine}]</Text>
    </View>
  );
};

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

    for (const [key, value] of Object.entries(engineConfig as Record<string, unknown>)) {
      if (value === undefined) {
        continue;
      }
      if (key === 'enabled' || key === 'timeoutMs' || key === 'server' || key === 'cache') {
        continue;
      }
      base[key] = value;
    }
  }

  if (!meta) {
    return Object.keys(base).length > 0 ? base : undefined;
  }

  return { ...base, ...meta };
}

const styles = StyleSheet.create({
  diagram: {
    marginBottom: 8,
  },
  placeholder: {
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
