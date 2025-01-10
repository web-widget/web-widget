export default {
  rules: {
    extension: ['tsx', 'jsx'],
    export: {
      include: '**/*{@,.}{route,widget}.{tsx,jsx}',
    },
    import: {
      include: '**/*{@,.}{route,widget}.*',
      includeImporter: '**/*.{tsx,jsx}{,\\?*}',
      // Examples:
      // .vue?vue&type=script&setup=true&lang.tsx
      // .vue?vue&type=script&setup=true&lang.jsx
      excludeImporter: '**/*.vue\\?vue&*.{tsx,jsx}',
    },
  },
};
