import { Manifest } from 'vite';
import react from '@vitejs/plugin-react';
import reactWebWidgetPlugin from '@web-widget/react/vite';

export function reactPresetsPlugin(manifest?: Manifest) {
  return [
    react(),
    reactWebWidgetPlugin({
      manifest,
    }),
  ];
}
