import React, { createContext, useMemo } from 'react';
import {
  type DiagramRenderService,
} from '@supramark/engines';
import {
  createWebDiagramEngine,
  type WebDiagramEngineOptions,
} from '@supramark/engines/web';

export const DiagramEngineContext = createContext<DiagramRenderService | null>(null);

export interface DiagramEngineProviderProps {
  children: React.ReactNode;
  engine?: DiagramRenderService;
  options?: WebDiagramEngineOptions;
}

export const DiagramEngineProvider: React.FC<DiagramEngineProviderProps> = ({
  children,
  engine,
  options,
}) => {
  const service = useMemo(() => {
    if (engine) {
      return engine;
    }
    return createWebDiagramEngine(options);
  }, [engine, options]);

  return <DiagramEngineContext.Provider value={service}>{children}</DiagramEngineContext.Provider>;
};
