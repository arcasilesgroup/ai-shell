# How work happens here

AI Shell is an open-source CLI that turns natural language into shell commands.
It is a fork of BuilderIO/ai-shell (MIT), maintained by Arcasiles Group and built
and governed with ai-engineering. TypeScript, bundled with pkgroll, published to
npm as `@arcasilesgroup/ai-shell`. Any OpenAI-compatible provider works — the key,
endpoint and model come from the user's own `~/.ai-shell` INI file.

Project identity, vocabulary and prohibitions live in CONSTITUTION.md. Read it first.

## The rules

1. No code before an approved spec and plan (more than 3 files).
2. One commit, one change.
3. Never `--no-verify`. Never silence a linter, in any language.
4. No compatibility shims. Hard rename, hard delete; say it in the changelog.
5. Delete before you abstract.
6. Green gate before "done" — show the output.
7. Stuck twice, stop and say so.
8. No secrets, no personal data, no machine paths in committed files.
9. Explain it so somebody who does not code can follow.
10. KISS, YAGNI, DRY, SOLID, TDD, Clean Code, Clean Architecture — the criteria a review
    judges a diff by and a spec justifies a decision with, in one line each.
11. Monitoring, metrics and observability first. Nothing gets a URL until CI/CD, logs,
    traces, errors, health, an external check, a second path and security all pass, and
    each one passes with a command rather than an assertion.
12. A decision that always comes out the same is code, not a prompt. The third time the
    same judgement resolves the same way it becomes a script — and the prompt that made
    it goes away in the same commit. If it cannot be made to fail closed, it stays a
    prompt and you write down why.

## How to work

- `/ai-spec` writes the problem, the options and the chosen one to `specs/NNN-slug/`.
- `/ai-plan` turns that into numbered tasks, each with a check and a rollback.
- `/ai-ship` commits, opens the pull request and closes the work item.
- `/ai-debug`, `/ai-explore`, `/ai-research`, `/ai-review`, `/ai-note` are the rest.
- `just check` is what CI runs. Run it before you say something is done.

## What this repository runs on

TypeScript (Node >= 14, `type: module`), npm with a committed lockfile, no test
runner yet (typecheck + lint + build are the gate), pkgroll for bundling,
changesets for versioning, GitHub Actions + npm trusted publishing (OIDC) for CD.

Locally: `npm install`, `npm run build`, `node dist/cli.mjs --help`.

## What breaks if you get it wrong

The published npm package: a supply-chain mistake here ships executable code to
every user's shell. That is what the lockfile audit, provenance attestations and
the tag-must-be-on-main gate exist for.
