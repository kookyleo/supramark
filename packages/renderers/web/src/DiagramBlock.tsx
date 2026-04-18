import React from 'react';
import type { DiagramRenderResult } from '@supramark/diagram-engine';
import type { SupramarkClassNames } from './classNames';

interface DiagramBlockProps {
  classNames: SupramarkClassNames;
  code: string;
  engine: string;
  result?: DiagramRenderResult;
}

export const DiagramBlock: React.FC<DiagramBlockProps> = ({ classNames, code, engine, result }) => {
  if (!result || !result.success || result.format !== 'svg') {
    const errorHeader =
      result && !result.success
        ? `[diagram engine="${engine}" 渲染失败]\n${result.error?.details || result.payload}\n\n`
        : '';

    return (
      <div data-suprimark-diagram={engine} className={classNames.diagram}>
        <pre className={classNames.diagramPre}>
          <code className={classNames.diagramCode}>{errorHeader + code}</code>
        </pre>
      </div>
    );
  }

  return (
    <div
      data-suprimark-diagram={engine}
      data-suprimark-diagram-rendered="svg"
      className={classNames.diagram}
      dangerouslySetInnerHTML={{ __html: result.payload }}
    />
  );
};
