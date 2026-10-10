---
'@web-widget/node': patch
---

Fix memory leaks and improve stream handling in the Node adapter: apply backpressure on response writes, cancel source streams on client disconnect, clean up unconsumed request bodies, and replace inefficient upstream stream conversion.
