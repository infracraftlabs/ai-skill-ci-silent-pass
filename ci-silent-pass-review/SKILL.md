---
name: ci-silent-pass-review
description: Review GitHub Actions workflows for steps that can end green while a command failed (pipes without pipefail, || true, retry loops, && lists, continue-on-error). Use when asked to review a workflow, explain a green build that hid a failure, or harden required checks.
---

# CI silent-pass review

## Scope
Workflow files under `.github/workflows/`. Read-only: never edit workflows, push, re-run jobs or change branch protection.
Out of scope: scripts the workflow calls (say so and list them), self-hosted runner configuration.

## Procedure
1. Run `node scripts/find-silent-passes.mjs .github/workflows/*.yml`. Its findings are the evidence; do not add
   findings it did not report unless you quote the exact line and explain the mechanism.
2. For each `error`, explain in one sentence why the step ends green (exit code of the last command, `-e` ignored
   inside `&&` lists, failures replaced by `|| true`, retries that hide earlier failures).
3. Recommend the smallest fix from the table below. One finding, one fix.
4. For each `info` (job-level continue-on-error), ask the owner whether that job is a required check.
5. List what was not checked: called scripts, reusable workflows, `if:` conditions on required jobs.

| Rule | Fix |
|---|---|
| pipe-without-pipefail | `defaults: run: shell: bash` (adds `-eo pipefail`) |
| or-true | Remove it; if the result is informational, move the step to a separate non-required job |
| retry-loop | No retries for tests (quarantine flaky tests); for network calls, fail the step after the loop |
| and-list-not-last | Put each command that must pass on its own line |
| step-continue-on-error | Remove it, or move the step to a separate non-required job |

## Output
A table: file, job, step, rule, quoted line, fix. Then "Not checked" and "Needs the owner's decision".

## Validation
`tests/run.sh` must pass before this skill is changed: expected findings for `bad.yml`, `good.yml` and
`variants.yml` (ten step variants with known exit codes).
