export declare const RESOLVE_EXTS: readonly string[];
export declare function dirname(path: string): string;
export declare function joinPath(base: string, rel: string): string;
export declare function extractImports(source: string): string[];
export declare function resolveModule(
  files: Record<string, string>,
  importer: string,
  request: string,
  isExternal: (request: string) => boolean,
): string | null;
