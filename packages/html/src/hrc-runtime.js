/**
 * $HRC (HTML Replace Content) client runtime.
 *
 * Injected once per stream when deferred content exists. Batches multiple
 * Suspense swaps into a single requestAnimationFrame to avoid redundant
 * reflows, and marks boundaries as `$H~` (scheduled) to prevent re-entry.
 */
(function () {
  // Batch buffer: pairs of [sourceId, boundaryId]
  var batch = [];
  var scheduled = false;

  function flush() {
    scheduled = false;

    for (var i = 0; i < batch.length; i += 2) {
      var sourceId = batch[i];
      var boundaryId = batch[i + 1];

      // Lookup hidden source container and boundary template
      var src = document.getElementById('HS:' + sourceId);
      var dst = document.getElementById('HB:' + boundaryId);
      if (!src || !dst) continue;

      var parent = dst.parentNode;

      // Walk to boundary start marker <!--$H?--> or <!--$H~-->
      var start = dst;
      while ((start = start.previousSibling)) {
        if (
          start.nodeType === 8 &&
          (start.nodeValue === '$H?' || start.nodeValue === '$H~')
        ) {
          break;
        }
      }

      // Walk to boundary end marker <!--/$H-->
      var end = dst;
      while ((end = end.nextSibling)) {
        if (end.nodeType === 8 && end.nodeValue === '/$H') {
          break;
        }
      }

      if (!start || !end) continue;

      // Mark as scheduled to prevent re-entry
      start.nodeValue = '$H~';

      // Remove fallback nodes between markers
      var node = start.nextSibling;
      while (node && node !== end) {
        var next = node.nextSibling;
        parent.removeChild(node);
        node = next;
      }

      // Move real content into place
      while (src.firstChild) {
        parent.insertBefore(src.firstChild, end);
      }

      // Clean up markers and source container
      src.remove();
      start.nodeValue = '$H';
      end.remove();
    }

    batch.length = 0;
  }

  // Public API: queue a swap, schedule flush via rAF
  window.$HRC = function (sourceId, boundaryId) {
    batch.push(sourceId, boundaryId);
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(flush);
    }
  };
})();
