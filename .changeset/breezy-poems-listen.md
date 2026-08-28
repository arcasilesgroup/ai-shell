---
'@arcasilesgroup/ai-shell': patch
---

Fix "Something went wrong" after `Your script:`. The first generation stream was consumed twice (script + explanation readers), which killed the process with an unhandled "Cannot iterate over a consumed stream" rejection, and any mid-stream provider error left the read promise unsettled so the CLI hung on a spinner with no message. The explanation now always comes from its own request, stream errors reject with a readable `KnownError`, and the keypress listener is removed when a stream ends.
