# Changelog

## 0.1.0

- Initial fork from BuilderIO/ai-shell 1.0.12 (MIT), under the Arcasiles org.
- Config keys renamed to `API_KEY` / `API_ENDPOINT`, with backward-compatible reading of `OPENAI_*` keys in `~/.ai-shell`.
- New provider wizard: `ai config` (presets for OpenAI, NaN Builders, OpenRouter, Groq, Together, Ollama, LM Studio, llama.cpp, or a custom endpoint; real model listing and a connection test) plus `ai config test`.
- Redesigned action selector: no emojis by default (`ICONS=plain`); optional `ICONS=nerd` for Nerd Font glyphs. Configurable from `ai config` → Icons.
- 429/generic error messages rewritten without references to any specific provider.
- Hint line when a prompt yields no shell command (suggests `ai chat`).
- README and CHANGELOG rewritten from scratch; upstream history pruned.
