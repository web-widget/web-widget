---
'@web-widget/vite-plugin': patch
---

Preserve native widget imports in test modules by default so component tests receive the original component. Explicit `widget()` calls still receive build-time options, and `testModuleImports: 'transform'` restores implicit import conversion for integration tests.
