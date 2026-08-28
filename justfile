# What `check` means here. CI never learns a language: it runs `just check`.
# Filled in for: node. Tools are pinned at the call site or in package.json.

wired:
    ai-eng doctor --ci

build:
    npm run typecheck
    npm run build

lint:
    npm run lint

# No unit suite yet; the smoke recipe is the contract test that exists:
# the built binary must report its version and resolve its defaults. It runs
# against a throwaway HOME so it never reads a developer's real key and never
# depends on one existing.
test:
    #!/usr/bin/env bash
    set -euo pipefail
    tmp="$(mktemp -d)"
    printf 'API_KEY=sk-smoketest\n' > "$tmp/.ai-shell"
    HOME="$tmp" node dist/cli.mjs --version
    HOME="$tmp" node dist/cli.mjs config get MODEL API_ENDPOINT ICONS
    rm -rf "$tmp"

# Supply-chain guards, run locally and in CI identically.
# `npm audit` reads the lockfile; production deps only; high and above blocks.
security:
    gitleaks dir . --redact --no-banner --exit-code 1
    actionlint
    npm ci --ignore-scripts
    npm audit --omit=dev --audit-level=high

counts:
    @echo 'RAN lint=1  # npm run lint (prettier + eslint) checked the whole tree'
    @echo 'RAN tests=2  # the two smoke assertions in the `test` recipe above'

check: wired build lint test security counts

# The release loop, locally: a changeset, then version, then let CI publish.
changeset:
    npx changeset

version:
    npx changeset version
