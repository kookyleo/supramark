interface VizCwrapModule {
  cwrap(name: string, returnType?: string, paramTypes?: string[]): (...args: any[]) => any;
}

declare function VizModule(): Promise<VizCwrapModule>;

export default VizModule;
