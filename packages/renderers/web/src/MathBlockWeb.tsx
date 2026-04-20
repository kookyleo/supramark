import React from 'react';
import type { DiagramRenderResult } from '@supramark/engines';
import type { SupramarkClassNames } from './classNames';

interface MathBlockWebProps {
  classNames: SupramarkClassNames;
  value: string;
  result?: DiagramRenderResult;
}

interface MathInlineWebProps {
  classNames: SupramarkClassNames;
  value: string;
  result?: DiagramRenderResult;
}

export const MathBlockWeb: React.FC<MathBlockWebProps> = ({ classNames, value, result }) => {
  if (!result || !result.success || result.format !== 'svg') {
    return (
      <pre className={classNames.codeBlock}>
        <code className={classNames.code}>{value}</code>
      </pre>
    );
  }

  return <div className={classNames.codeBlock} dangerouslySetInnerHTML={{ __html: result.payload }} />;
};

export const MathInlineWeb: React.FC<MathInlineWebProps> = ({ classNames, value, result }) => {
  if (!result || !result.success || result.format !== 'svg') {
    return <code className={classNames.inlineCode}>{value}</code>;
  }

  return (
    <span
      style={{ display: 'inline-block', verticalAlign: 'middle', lineHeight: 0 }}
      dangerouslySetInnerHTML={{ __html: result.payload }}
    />
  );
};
