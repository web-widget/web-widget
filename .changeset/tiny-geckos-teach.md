---
'@web-widget/web-router': patch
---

Fix rewrite route context realignment so route-derived fields are reset before matching the rewritten target path.

Add regression tests to cover target route context/meta/config alignment, non-render target cleanup, and chained rewrites.
