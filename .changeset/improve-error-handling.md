---
'@web-widget/web-router': minor
---

# Improve HTTP Exception Handling and Error Page Design

## New Features

- Added `normalizeHTTPException` method providing unified error handling logic
- Support intelligent conversion of multiple error formats: Error objects, Response objects, plain objects, and strings
- Preserve original error `cause` information for better debugging and error tracking

## Improvements

- Refactored default error page with modern UI design
- Added error information copy functionality for one-click copying of complete error reports
- Improved responsive design for error pages with better mobile support
- Optimized error handling flow, reducing unnecessary Response parsing operations

## Breaking Changes

- Changed `ErrorHandler` type parameter from `unknown` to `HTTPException` for stricter type safety
- Removed `#transformHTTPException` method from `engine.ts`, unified error handling logic in `application.ts`

## Test Coverage

- Added comprehensive test cases for `normalizeHTTPException` method
- Test coverage includes various error formats: Error objects, Response objects, plain objects, strings, etc.
- Ensures proper preservation of error `cause` property
