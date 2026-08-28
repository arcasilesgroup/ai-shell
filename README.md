<p align="center">
   <img src="assets/images/ai-shell-banner.jpg" alt="AI Shell — a CLI that turns natural language into shell commands" width="100%">
</p>

<h1 align="center">AI Shell</h1>

<h4 align="center">
   A CLI that turns natural language into shell commands.
</h4>

<p align="center">
   With your own API key, with the provider you choose.
</p>

<br>

# AI Shell

## Setup

> The minimum supported Node.js version is v14.

1. Install AI Shell:

   ```sh
   npm install -g @arcasilesgroup/ai-shell
   ```

2. Run the provider wizard:

   ```sh
   ai config
   ```

   Pick your provider (OpenAI, NaN Builders, OpenRouter, Groq, Together, Ollama, LM Studio, llama.cpp, or your own endpoint), paste your API key, and the wizard lists the real models from your endpoint (`GET /v1/models`) and runs a connection test before saving.

   You can also configure everything by hand in `~/.ai-shell`, a plain INI file:

   ```ini
   PROVIDER=nan
   API_KEY=sk-...
   API_ENDPOINT=https://api.nan.builders/v1
   MODEL=qwen3.8-flash
   ```

   Any OpenAI-compatible API works (`/v1/chat/completions`). With local servers (Ollama, LM Studio, llama.cpp) the key can be any value.

   > Legacy `OPENAI_KEY` / `OPENAI_API_ENDPOINT` keys are still read if you already have them; on write, they are saved under the new names.

3. Check anytime that your configuration works:

   ```sh
   ai config test
   ```

## Usage

```bash
ai <prompt>
```

For example:

```bash
ai list all log files
```

You get the suggested command and can choose to run it, edit it, ask for a revision, or copy it.

### Special characters

Some shells treat characters like `?` or `*` specially. If you get strange behavior, wrap the prompt in quotes:

```bash
ai 'what is my ip address'
```

### Chat mode

```bash
ai chat
```

A continuous conversation in your terminal; history stays in memory until you `exit`.

### Silent mode (skip explanations)

```bash
ai -s list all log files
```

or as a saved preference:

```sh
ai config set SILENT_MODE=true
```

### Language

```sh
ai config set LANGUAGE=es
```

Available keys: `en`, `es`, `zh-Hans`, `zh-Hant`, `fr`, `de`, `it`, `pt`, `ru`, `uk`, `tr`, `ar`, `id`, `vi`, `jp`, `ko`.

### Action icons

The run/revise menu is plain by default — clack's cursor and color already mark the selection. If your terminal uses a Nerd Font (e.g. `brew install font-jetbrainsmono-nerd-font`), you can opt into glyphs:

```sh
ai config set ICONS=nerd
```

## Privacy

- The CLI runs 100% on your machine. Prompts travel only from your terminal to the endpoint you configure.
- No telemetry, no middle backend, no accounts.
- Executed commands are appended to your own `.zsh_history` / `.bash_history`.

## Updating

```bash
ai update
```

## Contributing

Bugs and feature requests in [Issues](https://github.com/arcasilesgroup/ai-shell/issues). Setup details in [CONTRIBUTING.md](CONTRIBUTING.md).

## Credits

- Based on [BuilderIO/ai-shell](https://github.com/BuilderIO/ai-shell) (MIT), whose legal attribution is kept in `LICENSE`.
