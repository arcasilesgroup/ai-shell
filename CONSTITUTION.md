# Constitution

The identity of this project. Written by a person, for the agents and the people who
work here. `ai-eng doctor` fails while any unfilled marker remains in this file.

## Mission

Give people a terminal they can talk to. AI Shell translates a natural-language
request into a shell command, shows what it will run, and only runs it after the
user says yes. It must work with any provider the user trusts with their own key.

## Who it is for

Developers and operators with a shell. They break if the CLI suggests dangerous
commands without asking, phones home, or routes their prompts through a provider
they did not choose.

## Vocabulary

**Provider** — any OpenAI-compatible API endpoint (base URL + key + model list).
**Wizard** — `ai config` with no arguments: pick provider, key, model, test.
**Plain icons** — the default action menu: no emoji, clack's cursor marks choice.
**Changeset** — a file in `.changeset/` describing one release note; the only
route to a version bump.
**Provenance** — the signed record that npm's package came from this repo's CI.

## Never

Never commit a secret or an API key. Never add a dependency without updating the
lockfile in the same commit. Never send telemetry. Never run a generated command
without an explicit yes. Never publish without OIDC provenance. No emoji in the
terminal UI.

## Compliance gates

None. This is an MIT-licensed open-source CLI with no backend and no user data.

## Escalation

When a gate blocks: read the reason, fix it, or ask. Never skip it.
Open an issue in arcasilesgroup/ai-shell and tag @arcasilesgroup/maintainers.

## Phase

Production. It is published to npm and people run it against real shells.
