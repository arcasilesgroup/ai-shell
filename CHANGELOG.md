# Changelog

## 0.1.2

### Patch Changes

- [#28](https://github.com/arcasilesgroup/ai-shell/pull/28) [`1ffee63`](https://github.com/arcasilesgroup/ai-shell/commit/1ffee636ead237aff92139b929b95e0179bb2cb9) Thanks [@soydachi](https://github.com/soydachi)! - Pin @nexssp/os to exactly 2.0.36. The caret range let npm resolve 2.1.x for fresh installs, and those tarballs are missing legacy.mjs while their exports map points at it: every `ai` invocation died with ERR_MODULE_NOT_FOUND. Verified against the published 0.1.1 from the registry.

## 0.1.1

### Patch Changes

- [#22](https://github.com/arcasilesgroup/ai-shell/pull/22) [`f55e673`](https://github.com/arcasilesgroup/ai-shell/commit/f55e673fbef6fd7082bcc10db20b3fe130167fa5) Thanks [@soydachi](https://github.com/soydachi)! - Fix "Something went wrong" after `Your script:`. The first generation stream was consumed twice (script + explanation readers), which killed the process with an unhandled "Cannot iterate over a consumed stream" rejection, and any mid-stream provider error left the read promise unsettled so the CLI hung on a spinner with no message. The explanation now always comes from its own request, stream errors reject with a readable `KnownError`, and the keypress listener is removed when a stream ends.

## 0.1.0

- Initial fork from BuilderIO/ai-shell 1.0.12 (MIT), under the Arcasiles org.
- Config keys renamed to `API_KEY` / `API_ENDPOINT`, with backward-compatible reading of `OPENAI_*` keys in `~/.ai-shell`.
- New provider wizard: `ai config` (presets for OpenAI, NaN Builders, OpenRouter, Groq, Together, Ollama, LM Studio, llama.cpp, or a custom endpoint; real model listing and a connection test) plus `ai config test`.
- Redesigned action selector: no emojis by default (`ICONS=plain`); optional `ICONS=nerd` for Nerd Font glyphs. Configurable from `ai config` → Icons.
- 429/generic error messages rewritten without references to any specific provider.
- Hint line when a prompt yields no shell command (suggests `ai chat`).
- README and CHANGELOG rewritten from scratch; upstream history pruned.
