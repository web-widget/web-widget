export * from './importer';
export * from './exporter';
export const compilerOptions = {
  extension: '.tsx,.jsx',
  // Examples:
  // .vue?vue&type=script&setup=true&lang.tsx
  // .vue?vue&type=script&setup=true&lang.jsx
  ignores: ['**/*.vue\\?vue&*'],
};
