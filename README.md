# ai-skill-ci-silent-pass

A small, public AI skill for the InfraCraft Labs guide
["AI skills for DevOps: a tested script beats a longer prompt"](https://infracraftlabs.com/insights/ai-skills-for-devops/).

`ci-silent-pass-review/` is a skill folder: instructions for an AI assistant (`SKILL.md`), a deterministic
script that gathers the evidence, and regression tests that prove the script. It reviews GitHub Actions
workflows for steps that can end green while a command failed: a pipe without `pipefail`, `|| true`, retry
loops, `&&` lists that are not the last line, and step-level `continue-on-error`.

Read-only: the script and the skill never edit workflows, push, re-run jobs or change branch protection.

## Run it

```bash
npm ci
npm test                                                   # the skill's regression tests
node ci-silent-pass-review/scripts/find-silent-passes.mjs path/to/.github/workflows/*.yml
```

One JSON finding per line; exit code 1 if any finding is an `error`.
To use it as a skill, copy `ci-silent-pass-review/` into your assistant's skills folder
(for example `.claude/skills/` in a repository) and run `npm install yaml` where the script runs.

## Results (24 November 2026)

Node 26, yaml 2.9.1, actionlint 1.7.12 with shellcheck 0.11.0. The cases are the workflows and the ten step
variants from ["Why nobody trusts a green build"](https://infracraftlabs.com/insights/why-nobody-trusts-green-builds/),
whose exit codes under bash 5.2 were measured on 18–19 November 2026.

| Case | Script | actionlint + shellcheck |
|---|---|---|
| `bad.yml` (4 traps) | 4 of 4 flagged | 1 unused-variable warning |
| `good.yml` (fixed) | 0 errors, 1 `info` (job-level `continue-on-error`, a question for the owner) | none |
| `variants.yml`, 5 steps that end green with a failing test | 5 of 5 flagged | 3 unused-variable warnings, no exit-code finding |
| `variants.yml`, 5 steps that end red | 1 flagged (a retry loop that is the last line: an over-flag) | 1 unused-variable warning |

Not tested: whether the skill makes an AI assistant's written reviews more consistent. Out of scope: scripts the
workflow calls, reusable workflows, composite actions, `if:` conditions on required jobs.
