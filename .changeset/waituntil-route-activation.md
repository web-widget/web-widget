---
'@web-widget/web-router': patch
---

Defer route activation cleanup until `waitUntil` background tasks finish, so stale-while-revalidate revalidation keeps `context.meta` available when the origin handler runs.

Fixes #771.
