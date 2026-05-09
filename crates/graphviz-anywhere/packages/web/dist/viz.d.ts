// Auto-generated ambient types for the Embind wasm module emitted by
// scripts/build-wasm.sh. Shape matches emscripten MODULARIZE=1 output.
export interface CGraphviz {
  layout(dot: string, format: string, engine: string): string;
  delete(): void;
}

export interface CGraphvizConstructor {
  new (): CGraphviz;
  new (yInvert: number, nop: number): CGraphviz;
  version(): string;
  lastError(): string;
}

export interface VizModuleInstance {
  CGraphviz: CGraphvizConstructor;
}

declare const VizModule: (config?: {
  wasmBinary?: ArrayBuffer | Uint8Array;
  locateFile?: (path: string, prefix: string) => string;
}) => Promise<VizModuleInstance>;

export default VizModule;
