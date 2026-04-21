---
'@web-widget/vite-plugin': patch
---

Improve filesystem routes sorting and grouping:

- Add 'action' file type to route type schema
- Rewrite sortRoutePaths to properly handle grouped routes and skip group names during comparison
- Enhance pathToPattern to support keepGroups option and fix handling of optional parameters
- Move sorting logic to after toValue transformation in getRoutemap
- Add comprehensive tests for route sorting with groups and multiple extensions
- Clean up unused noExternal config in entry.ts
