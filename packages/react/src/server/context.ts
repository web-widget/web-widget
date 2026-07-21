import { createContext } from 'react';

export type ReactServerRenderMode = 'buffered' | 'progressive';

export const ReactServerRenderModeContext =
  createContext<ReactServerRenderMode | null>(null);
