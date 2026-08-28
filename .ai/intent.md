{
"schema": "urn:ai-engineering:intent:1",
"schema_version": "1",
"type": "intent",
"identity": {
"id": "ai-shell",
"title": "AI Shell — natural language to shell commands, any provider"
},
"solution_intent": {
"fixed_constraints": [
"MIT-licensed fork of BuilderIO/ai-shell; attribution stays in LICENSE",
"Any OpenAI-compatible provider; the user's key, endpoint and model come from ~/.ai-shell",
"No telemetry, no backend, no accounts; commands run locally only after an explicit yes",
"Publishing goes through changesets and GitHub Actions with OIDC provenance; never a local npm publish"
],
"variables": [
"Which providers ship as wizard presets",
"Terminal icon style (plain default, nerd opt-in)",
"The set of supported UI languages"
],
"current_facts": [
"TypeScript CLI bundled with pkgroll; Node >= 14",
"No unit-test runner yet; the gate is typecheck + lint + build + smoke",
"Package not yet published to npm; scope @arcasilesgroup is not claimed"
],
"intended_outcomes": []
},
"ownership": {
"accountable_role": "Maintainer"
},
"relations": [],
"lifecycle": {
"status": "draft",
"transitions": []
}
}
