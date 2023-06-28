import { EventEmitter } from "node:events";
import type { Stats } from "node:fs";

// This is a generic interface for a module loader.

export type LoaderEvents = {
  "file-add": (msg: [path: string, stats?: Stats | undefined]) => void;
  "file-change": (msg: [path: string, stats?: Stats | undefined]) => void;
  "file-unlink": (msg: [path: string, stats?: Stats | undefined]) => void;
  "hmr-error": (msg: {
    type: "error";
    err: {
      message: string;
      stack: string;
    };
  }) => void;
};

export interface ModuleLoader {
  import: (src: string) => Promise<Record<string, any>>;
  resolveId: (
    specifier: string,
    parentId: string | undefined
  ) => Promise<string | undefined>;
  getModuleById: (id: string) => ModuleNode | undefined;
  getModulesByFile: (file: string) => Set<ModuleNode> | undefined;
  getModuleInfo: (id: string) => ModuleInfo | null;

  eachModule(callbackfn: (value: ModuleNode, key: string) => void): void;
  invalidateModule(mod: ModuleNode): void;

  fixStacktrace: (error: Error) => void;

  clientReload: () => void;
  webSocketSend: (msg: any) => void;
  isHttps: () => boolean;
  events: EventEmitter;
}

export interface ModuleNode {
  id: string | null;
  url: string;
  ssrModule: Record<string, any> | null;
  ssrError: Error | null;
  importedModules: Set<ModuleNode>;
}

export interface ModuleInfo {
  id: string;
  meta?: Record<string, any>;
}

export function createLoader(overrides: Partial<ModuleLoader>): ModuleLoader {
  return {
    import() {
      throw new Error(`Not implemented`);
    },
    resolveId(id) {
      return Promise.resolve(id);
    },
    getModuleById() {
      return undefined;
    },
    getModulesByFile() {
      return undefined;
    },
    getModuleInfo() {
      return null;
    },
    eachModule() {
      throw new Error(`Not implemented`);
    },
    invalidateModule() {},
    fixStacktrace() {},
    clientReload() {},
    webSocketSend() {},
    isHttps() {
      return true;
    },
    events: new EventEmitter(),

    ...overrides,
  };
}
