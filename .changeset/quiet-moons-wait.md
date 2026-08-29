---
'@arcasilesgroup/ai-shell': patch
---

Pin @nexssp/os to exactly 2.0.36. The caret range let npm resolve 2.1.x for fresh installs, and those tarballs are missing legacy.mjs while their exports map points at it: every `ai` invocation died with ERR_MODULE_NOT_FOUND. Verified against the published 0.1.1 from the registry.
