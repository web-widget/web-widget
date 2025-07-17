---
'@web-widget/web-router': minor
---

Refactor web-router architecture with improved design and documentation

## Changes

- **BREAKING**: Refactor internal architecture with domain-driven design
- **BREAKING**: Remove Engine class from public API (now internal only)
- **BREAKING**: Remove modules.ts and modules-adapter.ts files
- **BREAKING**: Update OnFallback type signature for better type safety

## Architecture Improvements

- Implement domain-driven design with clear separation of concerns
- Add comprehensive English documentation and comments
- Merge architecture documentation into CONTRIBUTING.md
- Improve code organization and maintainability
- Add proper JSDoc comments throughout codebase

## Documentation

- Add CONTRIBUTING.md with architecture overview
- Add Chinese documentation (CONTRIBUTING.zh.md, README.zh.md)
- Update README.md with improved structure and examples
- Add comprehensive inline comments and documentation

## Code Quality

- Replace Chinese comments with English equivalents
- Add meaningful "NOTE:" comments for important implementation details
- Remove redundant and meaningless comments
- Improve type safety and error handling
