import React, { useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import type {
  SupramarkRootNode,
  SupramarkNode,
  SupramarkParagraphNode,
  SupramarkHeadingNode,
  SupramarkCodeNode,
  SupramarkMathBlockNode,
  SupramarkInlineCodeNode,
  SupramarkListNode,
  SupramarkListItemNode,
  SupramarkDiagramNode,
  SupramarkContainerNode,
  SupramarkTextNode,
  SupramarkStrongNode,
  SupramarkEmphasisNode,
  SupramarkLinkNode,
  SupramarkImageNode,
  SupramarkBreakNode,
  SupramarkDeleteNode,
  SupramarkTableNode,
  SupramarkTableRowNode,
  SupramarkTableCellNode,
  SupramarkMathInlineNode,
  SupramarkFootnoteReferenceNode,
  SupramarkFootnoteDefinitionNode,
  SupramarkDefinitionListNode,
  SupramarkDefinitionItemNode,
  SupramarkDiagramConfig,
  SupramarkConfig,
} from '@supramark/core';
import {
  type DiagramRenderResult,
  type DiagramRenderService,
} from '@supramark/diagram-engine';
import { createWebDiagramEngine } from '@supramark/diagram-engine/web';
import {
  parseMarkdown,
  isFeatureEnabled,
  isDiagramFeatureEnabled,
  getFeatureOptionsAs,
  SUPRAMARK_ADMONITION_KINDS,
} from '@supramark/core';
import {
  type SupramarkClassNames,
  mergeClassNames,
  tailwindClassNames,
  minimalClassNames,
} from './classNames.js';
import { DiagramBlock } from './DiagramBlock.js';
import { DiagramEngineContext } from './DiagramEngineProvider.js';
import { ErrorBoundary, ErrorInfo, ErrorDisplay } from './ErrorBoundary.js';
import { MathBlockWeb, MathInlineWeb } from './MathBlockWeb.js';

export interface ContainerRendererWeb {
  (args: {
    node: any;
    key: number;
    classNames: SupramarkClassNames;
    config?: SupramarkConfig;
    renderNode: (node: SupramarkNode, key: number) => React.ReactNode;
    renderChildren: (children: SupramarkNode[]) => React.ReactNode;
  }): React.ReactNode;
}

export interface SupramarkWebProps {
  markdown: string;
  ast?: SupramarkRootNode;
  classNames?: SupramarkClassNames;
  theme?: 'tailwind' | 'minimal' | SupramarkClassNames;
  config?: SupramarkConfig;
  onError?: (error: Error, errorInfo?: React.ErrorInfo) => void;
  errorFallback?: (error: ErrorInfo) => ReactNode;
  errorClassNamePrefix?: string;
  containerRenderers?: Record<string, ContainerRendererWeb>;
}

type RenderTask = {
  key: string;
  engine: 'mermaid' | 'math' | 'dot' | 'graphviz';
  code: string;
  options?: Record<string, unknown>;
};

const defaultDiagramEngine = createWebDiagramEngine();

export const Supramark: React.FC<SupramarkWebProps> = ({
  markdown,
  ast,
  classNames: customClassNames,
  theme,
  config,
  onError,
  errorFallback,
  errorClassNamePrefix = 'sm-error',
  containerRenderers,
}) => {
  const diagramEngine = useContext(DiagramEngineContext) ?? defaultDiagramEngine;
  const [root, setRoot] = useState<SupramarkRootNode | null>(ast ?? null);
  const [rendered, setRendered] = useState<Map<string, DiagramRenderResult>>(new Map());
  const [parseError, setParseError] = useState<ErrorInfo | null>(null);

  const mergedClassNames = useMemo(() => {
    let themeClassNames: SupramarkClassNames | undefined;

    if (typeof theme === 'string') {
      themeClassNames = theme === 'tailwind' ? tailwindClassNames : minimalClassNames;
    } else if (theme) {
      themeClassNames = theme;
    }

    return mergeClassNames({
      ...themeClassNames,
      ...customClassNames,
    });
  }, [customClassNames, theme]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const parsed = ast ?? (await parseMarkdown(markdown, { config }));
        const renderedMap = await preRenderAll(
          collectRenderTasks(parsed.children, config),
          diagramEngine
        );

        if (!cancelled) {
          setRoot(parsed);
          setRendered(renderedMap);
          setParseError(null);
        }
      } catch (error) {
        if (!cancelled) {
          const err = error as Error;
          setParseError({
            type: 'parse',
            message: err.message || '解析 Markdown 失败',
            details: err.toString(),
            stack: err.stack,
          });
          setRendered(new Map());
          setRoot(null);
          if (onError) {
            onError(err);
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [markdown, ast, config, diagramEngine, onError]);

  const mergedContainerRenderers = useMemo(() => {
    return containerRenderers ?? {};
  }, [containerRenderers]);

  if (parseError) {
    if (errorFallback) {
      return <>{errorFallback(parseError)}</>;
    }
    return (
      <div>
        <ErrorDisplay error={parseError} classNamePrefix={errorClassNamePrefix} />
        <pre className={mergedClassNames.codeBlock}>
          <code>{markdown}</code>
        </pre>
      </div>
    );
  }

  if (!root) {
    return null;
  }

  return (
    <ErrorBoundary
      onError={onError}
      fallback={errorFallback}
      classNamePrefix={errorClassNamePrefix}
    >
      <div className={mergedClassNames.root}>
        {root.children.map((node, index) =>
          renderNode(node, index, mergedClassNames, rendered, config, mergedContainerRenderers)
        )}
      </div>
    </ErrorBoundary>
  );
};

function renderNode(
  node: SupramarkNode,
  key: number,
  classNames: SupramarkClassNames,
  rendered: Map<string, DiagramRenderResult>,
  config?: SupramarkConfig,
  containerRenderers?: Record<string, ContainerRendererWeb>
): React.ReactNode {
  switch (node.type) {
    case 'paragraph':
      return (
        <p key={key} className={classNames.paragraph}>
          {renderInlineNodes((node as SupramarkParagraphNode).children, classNames, rendered, config)}
        </p>
      );
    case 'heading': {
      const heading = node as SupramarkHeadingNode;
      const content = renderInlineNodes(heading.children, classNames, rendered, config);
      switch (heading.depth) {
        case 1:
          return (
            <h1 key={key} className={classNames.h1}>
              {content}
            </h1>
          );
        case 2:
          return (
            <h2 key={key} className={classNames.h2}>
              {content}
            </h2>
          );
        case 3:
          return (
            <h3 key={key} className={classNames.h3}>
              {content}
            </h3>
          );
        case 4:
          return (
            <h4 key={key} className={classNames.h4}>
              {content}
            </h4>
          );
        case 5:
          return (
            <h5 key={key} className={classNames.h5}>
              {content}
            </h5>
          );
        default:
          return (
            <h6 key={key} className={classNames.h6}>
              {content}
            </h6>
          );
      }
    }
    case 'code': {
      const codeBlock = node as SupramarkCodeNode;
      return (
        <pre key={key} className={classNames.codeBlock}>
          <code className={classNames.code}>{codeBlock.value}</code>
        </pre>
      );
    }
    case 'math_block': {
      const mathBlock = node as SupramarkMathBlockNode;
      if (!isFeatureGroupEnabled(config, ['@supramark/feature-math'])) {
        return (
          <pre key={key} className={classNames.codeBlock}>
            <code className={classNames.code}>{mathBlock.value}</code>
          </pre>
        );
      }
      return (
        <MathBlockWeb
          key={key}
          classNames={classNames}
          value={mathBlock.value}
          result={rendered.get(buildRenderKey('math', mathBlock.value, { displayMode: true }))}
        />
      );
    }
    case 'list': {
      const list = node as SupramarkListNode;
      const items = list.children.map((item, index) =>
        renderNode(item, index, classNames, rendered, config, containerRenderers)
      );
      return list.ordered ? (
        <ol key={key} className={classNames.listOrdered}>
          {items}
        </ol>
      ) : (
        <ul key={key} className={classNames.listUnordered}>
          {items}
        </ul>
      );
    }
    case 'list_item': {
      const item = node as SupramarkListItemNode;
      const isTaskListFeatureEnabled = isFeatureGroupEnabled(config, ['@supramark/feature-gfm']);
      const isTaskList = isTaskListFeatureEnabled && item.checked !== undefined;

      if (isTaskList) {
        return (
          <li key={key} className={classNames.taskListItem}>
            <input
              type="checkbox"
              checked={item.checked === true}
              disabled
              className={classNames.taskCheckbox}
            />
            {item.children.map((child, index) =>
              renderNode(child, index, classNames, rendered, config, containerRenderers)
            )}
          </li>
        );
      }

      return (
        <li key={key} className={classNames.listItem}>
          {item.children.map((child, index) =>
            renderNode(child, index, classNames, rendered, config, containerRenderers)
          )}
        </li>
      );
    }
    case 'diagram': {
      const diagram = node as SupramarkDiagramNode;
      if (!isDiagramFeatureEnabled(config, diagram.engine, 'web:diagram-feature')) {
        return renderDisabledDiagram(diagram, key, classNames);
      }

      if (isPreRenderedDiagramEngine(diagram.engine)) {
        return (
          <DiagramBlock
            key={key}
            classNames={classNames}
            code={diagram.code}
            engine={diagram.engine}
            result={rendered.get(buildRenderKey(diagram.engine, diagram.code, diagram.meta))}
          />
        );
      }

      return (
        <div key={key} data-suprimark-diagram={diagram.engine} className={classNames.diagram}>
          <pre className={classNames.diagramPre}>
            <code className={classNames.diagramCode}>{diagram.code}</code>
          </pre>
        </div>
      );
    }
    case 'container': {
      const container = node as SupramarkContainerNode;
      const containerName = container.name;

      if (containerRenderers && containerRenderers[containerName]) {
        return containerRenderers[containerName]({
          node: container,
          key,
          classNames,
          config,
          renderNode: (nextNode, nextKey) =>
            renderNode(nextNode, nextKey, classNames, rendered, config, containerRenderers),
          renderChildren: children =>
            children.map((child, index) =>
              renderNode(child, index, classNames, rendered, config, containerRenderers)
            ),
        });
      }

      if (SUPRAMARK_ADMONITION_KINDS.includes(containerName as any)) {
        const title = container.params || (container.data?.title as string | undefined);
        const kind = containerName;

        if (!isFeatureGroupEnabled(config, ['@supramark/feature-admonition'])) {
          return (
            <p key={key} className={classNames.paragraph}>
              {title ? <strong>{title}</strong> : null}
              {title ? ' ' : null}
              {container.children.map((child, index) =>
                renderNode(child, index, classNames, rendered, config, containerRenderers)
              )}
            </p>
          );
        }

        const adOptions =
          getFeatureOptionsAs<{ kinds?: string[] }>(config, '@supramark/feature-admonition') ?? {};
        if (Array.isArray(adOptions.kinds) && adOptions.kinds.length > 0 && !adOptions.kinds.includes(kind)) {
          return (
            <p key={key} className={classNames.paragraph}>
              {title ? <strong>{title}</strong> : null}
              {title ? ' ' : null}
              {container.children.map((child, index) =>
                renderNode(child, index, classNames, rendered, config, containerRenderers)
              )}
            </p>
          );
        }

        return (
          <div
            key={key}
            className={`admonition admonition-${kind} ${classNames.paragraph ?? ''}`.trim()}
          >
            {title ? (
              <p>
                <strong>{title}</strong>
              </p>
            ) : null}
            <div>
              {container.children.map((child, index) =>
                renderNode(child, index, classNames, rendered, config, containerRenderers)
              )}
            </div>
          </div>
        );
      }

      if (containerName === 'map') {
        const data = container.data || {};
        const center = data.center as [number, number] | undefined;
        const zoom = data.zoom as number | undefined;
        const marker = data.marker as { lat: number; lng: number } | undefined;

        const centerText = center ? `${center[0]}, ${center[1]}` : '未指定';
        const zoomText =
          typeof zoom === 'number' && !Number.isNaN(zoom) ? `缩放级别：${zoom}` : null;
        const markerText =
          marker && typeof marker.lat === 'number' && typeof marker.lng === 'number'
            ? `标记：${marker.lat}, ${marker.lng}`
            : null;

        return (
          <div key={key} className={classNames.paragraph}>
            <p>
              <strong>地图卡片</strong>
            </p>
            <p>
              中心：{centerText}
              {zoomText ? `；${zoomText}` : ''}
              {markerText ? `；${markerText}` : ''}
            </p>
          </div>
        );
      }

      return (
        <div key={key} className={`container container-${containerName} ${classNames.paragraph ?? ''}`.trim()}>
          {container.params && <div className="container-params">{container.params}</div>}
          <div className="container-content">
            {container.children.map((child, index) =>
              renderNode(child, index, classNames, rendered, config, containerRenderers)
            )}
          </div>
        </div>
      );
    }
    case 'definition_list': {
      const list = node as SupramarkDefinitionListNode;
      const defOptions =
        getFeatureOptionsAs<{ compact?: boolean }>(config, '@supramark/feature-definition-list') ??
        {};
      const isCompact = defOptions.compact !== false;
      if (!isFeatureGroupEnabled(config, ['@supramark/feature-definition-list'])) {
        return (
          <div key={key} className={classNames.paragraph}>
            {list.children.map((item, index) => {
              const defItem = item as SupramarkDefinitionItemNode;
              const termContent = renderInlineNodes(defItem.term, classNames, rendered, config);
              return (
                <p key={index} className={classNames.paragraph}>
                  <strong>{termContent}</strong>{' '}
                  {defItem.descriptions.map((descNodes, idx) => (
                    <span key={idx}>
                      {renderInlineNodes(descNodes, classNames, rendered, config)}
                      {idx < defItem.descriptions.length - 1 ? ' ' : null}
                    </span>
                  ))}
                </p>
              );
            })}
          </div>
        );
      }
      return (
        <dl key={key} className={classNames.paragraph}>
          {list.children.map((item, index) => {
            const defItem = item as SupramarkDefinitionItemNode;
            const termContent = renderInlineNodes(defItem.term, classNames, rendered, config);
            return (
              <React.Fragment key={index}>
                <dt>
                  <strong>{termContent}</strong>
                </dt>
                {defItem.descriptions.map((descNodes, idx) => (
                  <dd key={idx}>
                    {renderInlineNodes(descNodes, classNames, rendered, config)}
                    {isCompact ? null : <br />}
                  </dd>
                ))}
              </React.Fragment>
            );
          })}
        </dl>
      );
    }
    case 'table': {
      const table = node as SupramarkTableNode;
      return (
        <table key={key} className={classNames.table}>
          <tbody className={classNames.tableBody}>
            {table.children.map((row, index) =>
              renderNode(row, index, classNames, rendered, config, containerRenderers)
            )}
          </tbody>
        </table>
      );
    }
    case 'table_row': {
      const row = node as SupramarkTableRowNode;
      return (
        <tr key={key} className={classNames.tableRow}>
          {row.children.map((cell, index) =>
            renderNode(cell, index, classNames, rendered, config, containerRenderers)
          )}
        </tr>
      );
    }
    case 'table_cell': {
      const cell = node as SupramarkTableCellNode;
      const alignStyle = cell.align ? { textAlign: cell.align } : undefined;
      const content = renderInlineNodes(cell.children, classNames, rendered, config);

      if (cell.header) {
        return (
          <th key={key} style={alignStyle} className={classNames.tableHeaderCell}>
            {content}
          </th>
        );
      }

      return (
        <td key={key} style={alignStyle} className={classNames.tableCell}>
          {content}
        </td>
      );
    }
    case 'footnote_definition': {
      const def = node as SupramarkFootnoteDefinitionNode;
      if (!isFeatureGroupEnabled(config, ['@supramark/feature-footnote'])) {
        return (
          <p key={key} className={classNames.paragraph}>
            {renderInlineNodes(def.children, classNames, rendered, config)}
          </p>
        );
      }
      return (
        <p key={key} className={classNames.paragraph}>
          <sup>[{def.index}]</sup> {renderInlineNodes(def.children, classNames, rendered, config)}
        </p>
      );
    }
    case 'text':
      return <React.Fragment key={key}>{(node as SupramarkTextNode).value}</React.Fragment>;
    default:
      return null;
  }
}

function renderInlineNodes(
  nodes: SupramarkNode[],
  classNames: SupramarkClassNames,
  rendered: Map<string, DiagramRenderResult>,
  config?: SupramarkConfig
): React.ReactNode {
  return nodes.map((node, index) => renderInlineNode(node, index, classNames, rendered, config));
}

function renderInlineNode(
  node: SupramarkNode,
  key: number,
  classNames: SupramarkClassNames,
  rendered: Map<string, DiagramRenderResult>,
  config?: SupramarkConfig
): React.ReactNode {
  switch (node.type) {
    case 'text': {
      const textNode = node as SupramarkTextNode;
      return textNode.value;
    }
    case 'strong': {
      const strongNode = node as SupramarkStrongNode;
      return (
        <strong key={key} className={classNames.strong}>
          {renderInlineNodes(strongNode.children, classNames, rendered, config)}
        </strong>
      );
    }
    case 'emphasis': {
      const emphasisNode = node as SupramarkEmphasisNode;
      return (
        <em key={key} className={classNames.emphasis}>
          {renderInlineNodes(emphasisNode.children, classNames, rendered, config)}
        </em>
      );
    }
    case 'inline_code': {
      const codeNode = node as SupramarkInlineCodeNode;
      return (
        <code key={key} className={classNames.inlineCode}>
          {codeNode.value}
        </code>
      );
    }
    case 'math_inline': {
      const mathNode = node as SupramarkMathInlineNode;
      if (!isFeatureGroupEnabled(config, ['@supramark/feature-math'])) {
        return mathNode.value;
      }
      return (
        <MathInlineWeb
          key={key}
          classNames={classNames}
          value={mathNode.value}
          result={rendered.get(buildRenderKey('math', mathNode.value, { displayMode: false }))}
        />
      );
    }
    case 'link': {
      const linkNode = node as SupramarkLinkNode;
      return (
        <a key={key} href={linkNode.url} title={linkNode.title} className={classNames.link}>
          {renderInlineNodes(linkNode.children, classNames, rendered, config)}
        </a>
      );
    }
    case 'image': {
      const imageNode = node as SupramarkImageNode;
      return (
        <img
          key={key}
          src={imageNode.url}
          alt={imageNode.alt}
          title={imageNode.title}
          className={classNames.image}
        />
      );
    }
    case 'break':
      return <br key={key} />;
    case 'delete': {
      const deleteNode = node as SupramarkDeleteNode;
      if (!isFeatureGroupEnabled(config, ['@supramark/feature-gfm'])) {
        return renderInlineNodes(deleteNode.children, classNames, rendered, config);
      }
      return (
        <del key={key} className={classNames.delete}>
          {renderInlineNodes(deleteNode.children, classNames, rendered, config)}
        </del>
      );
    }
    case 'footnote_reference': {
      const ref = node as SupramarkFootnoteReferenceNode;
      return (
        <sup key={key} className={classNames.inlineCode}>
          [{ref.index}]
        </sup>
      );
    }
    default:
      return null;
  }
}

function collectRenderTasks(nodes: SupramarkNode[], config?: SupramarkConfig): RenderTask[] {
  const tasks: RenderTask[] = [];

  function walk(list: SupramarkNode[]) {
    for (const node of list) {
      if (node.type === 'diagram') {
        const diagram = node as SupramarkDiagramNode;
        if (
          isPreRenderedDiagramEngine(diagram.engine) &&
          isDiagramFeatureEnabled(config, diagram.engine, 'web:diagram-feature')
        ) {
          tasks.push({
            key: buildRenderKey(diagram.engine, diagram.code, diagram.meta),
            engine: normalizeRenderEngine(diagram.engine),
            code: diagram.code,
            options: buildDiagramRenderOptions(diagram.engine, diagram.meta, config?.diagram),
          });
        }
      } else if (node.type === 'math_block') {
        const mathBlock = node as SupramarkMathBlockNode;
        if (isFeatureGroupEnabled(config, ['@supramark/feature-math'])) {
          tasks.push({
            key: buildRenderKey('math', mathBlock.value, { displayMode: true }),
            engine: 'math',
            code: mathBlock.value,
            options: { displayMode: true },
          });
        }
      } else if (node.type === 'math_inline') {
        const mathInline = node as SupramarkMathInlineNode;
        if (isFeatureGroupEnabled(config, ['@supramark/feature-math'])) {
          tasks.push({
            key: buildRenderKey('math', mathInline.value, { displayMode: false }),
            engine: 'math',
            code: mathInline.value,
            options: { displayMode: false },
          });
        }
      }

      if ('children' in node && Array.isArray((node as { children?: SupramarkNode[] }).children)) {
        walk((node as { children: SupramarkNode[] }).children);
      }

      if (node.type === 'definition_item') {
        const item = node as SupramarkDefinitionItemNode;
        walk(item.term);
        for (const description of item.descriptions) {
          walk(description);
        }
      }
    }
  }

  walk(nodes);
  return tasks;
}

async function preRenderAll(
  tasks: RenderTask[],
  engine: DiagramRenderService
): Promise<Map<string, DiagramRenderResult>> {
  if (tasks.length === 0) {
    return new Map();
  }

  const unique = new Map<string, RenderTask>();
  for (const task of tasks) {
    if (!unique.has(task.key)) {
      unique.set(task.key, task);
    }
  }

  const taskList = [...unique.values()];
  const results = await Promise.all(
    taskList.map(task =>
      engine.render({
        engine: task.engine,
        code: task.code,
        options: task.options,
      })
    )
  );

  return new Map(taskList.map((task, index) => [task.key, results[index]]));
}

function buildRenderKey(
  engine: string,
  code: string,
  options?: Record<string, unknown>
): string {
  return `${normalizeRenderEngine(engine)}:${code}:${stableSerialize(options)}`;
}

function normalizeRenderEngine(engine: string): 'mermaid' | 'math' | 'dot' | 'graphviz' {
  const normalized = String(engine || '').toLowerCase();
  if (normalized === 'graphviz') {
    return 'graphviz';
  }
  if (normalized === 'dot') {
    return 'dot';
  }
  if (normalized === 'math') {
    return 'math';
  }
  return 'mermaid';
}

function isPreRenderedDiagramEngine(engine: string): boolean {
  const normalized = String(engine || '').toLowerCase();
  return normalized === 'mermaid' || normalized === 'dot' || normalized === 'graphviz';
}

function buildDiagramRenderOptions(
  engine: string,
  meta: SupramarkDiagramNode['meta'],
  diagramConfig?: SupramarkDiagramConfig
): Record<string, unknown> | undefined {
  const base: Record<string, unknown> = {};
  const engineConfig = diagramConfig?.engines?.[engine];

  if (engineConfig) {
    if (typeof engineConfig.server === 'string') {
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

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`;
  }
  if (typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => `${key}:${stableSerialize(entryValue)}`)
      .join(',')}}`;
  }
  return String(value);
}

function renderDisabledDiagram(
  diagram: SupramarkDiagramNode,
  key: number,
  classNames: SupramarkClassNames
): React.ReactNode {
  const header = `[diagram engine="${diagram.engine}" 已被禁用]\n\n`;
  return (
    <pre key={key} className={classNames.codeBlock}>
      <code className={classNames.code}>{header + diagram.code}</code>
    </pre>
  );
}

function isFeatureGroupEnabled(config: SupramarkConfig | undefined, ids: string[]): boolean {
  if (!config || !config.features || config.features.length === 0) {
    return true;
  }

  const hasAny = ids.some(id => config.features!.some(feature => feature.id === id));
  if (!hasAny) {
    return true;
  }

  return ids.some(id => isFeatureEnabled(config, id));
}
