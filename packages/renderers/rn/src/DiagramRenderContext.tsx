import React, { createContext, useContext, useMemo } from 'react';
import type { SupramarkDiagramConfig } from '@supramark/core';
import { createDiagramEngine, type DiagramRenderService } from '@supramark/diagram-engine';

interface DiagramRenderProviderProps {
  children: React.ReactNode;
  timeout?: number;
  cacheOptions?: {
    maxSize?: number;
    ttl?: number;
    enabled?: boolean;
  };
  diagramConfig?: SupramarkDiagramConfig;
}

interface DiagramRenderContextValue {
  service: DiagramRenderService;
}

const DiagramRenderContext = createContext<DiagramRenderContextValue | null>(null);
const defaultService = createDiagramEngine();

export const DiagramRenderProvider: React.FC<DiagramRenderProviderProps> = ({
  children,
  timeout,
  cacheOptions = {},
  diagramConfig,
}) => {
  const resolvedCache = {
    maxSize: cacheOptions.maxSize ?? diagramConfig?.defaultCache?.maxSize ?? 100,
    ttl: cacheOptions.ttl ?? diagramConfig?.defaultCache?.ttl ?? 300000,
    enabled: cacheOptions.enabled ?? diagramConfig?.defaultCache?.enabled ?? true,
  };

  const service = useMemo<DiagramRenderService>(() => {
    const effectiveTimeout = timeout ?? diagramConfig?.defaultTimeoutMs ?? 10000;
    const plantumlServer = diagramConfig?.engines?.plantuml?.server;
    return createDiagramEngine({
      timeout: effectiveTimeout,
      plantumlServer,
      cache: resolvedCache,
    });
  }, [timeout, diagramConfig, resolvedCache.enabled, resolvedCache.maxSize, resolvedCache.ttl]);

  const value = useMemo<DiagramRenderContextValue>(() => ({ service }), [service]);

  return (
    <DiagramRenderContext.Provider value={value}>
      {children}
    </DiagramRenderContext.Provider>
  );
};

export function useDiagramRender(): DiagramRenderService {
  const ctx = useContext(DiagramRenderContext);
  return ctx?.service ?? defaultService;
}

export type { DiagramRenderService };
