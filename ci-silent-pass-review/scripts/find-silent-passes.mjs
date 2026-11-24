#!/usr/bin/env node
// Finds GitHub Actions steps that can end green while a command in them failed.
// Deterministic: same input, same findings. Read-only. Usage: node find-silent-passes.mjs <workflow.yml>...
// Output: one JSON finding per line {file, job, step, rule, level, evidence}. Exit 1 if any "error".
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const lines = (s) => s.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
const findings = [];
const add = (f) => findings.push(f);

for (const file of process.argv.slice(2)) {
  const wf = parse(readFileSync(file, 'utf8'));
  const wfShell = wf?.defaults?.run?.shell;
  for (const [job, j] of Object.entries(wf?.jobs ?? {})) {
    const jobShell = j?.defaults?.run?.shell ?? wfShell;
    if (j?.['continue-on-error'] === true)
      add({ file, job, step: null, rule: 'job-continue-on-error', level: 'info', evidence: 'continue-on-error: true on the job: it must not be a required check' });
    (j?.steps ?? []).forEach((st, i) => {
      const step = st.name ?? `#${i + 1}`;
      if (st['continue-on-error'] === true)
        add({ file, job, step, rule: 'step-continue-on-error', level: 'error', evidence: 'continue-on-error: true on a step' });
      if (typeof st.run !== 'string') return;
      const ls = lines(st.run);
      const shell = st.shell ?? jobShell;
      const pipefail = shell === 'bash' || /set\s+-[a-z]*o\s+pipefail|set\s+-o\s+pipefail/.test(st.run);
      ls.forEach((l, n) => {
        const last = n === ls.length - 1;
        const retry = /^for\b.*\bdo\b.*&&.*\bbreak\b.*\bdone\b/.test(l);
        if (/(^|[^|])\|(?!\|)/.test(l) && !pipefail)
          add({ file, job, step, rule: 'pipe-without-pipefail', level: 'error', evidence: l });
        if (/\|\|\s*(true|:)\s*$/.test(l))
          add({ file, job, step, rule: 'or-true', level: 'error', evidence: l });
        if (retry && !(ls.slice(n + 1).some((x) => /^\[\s*"\$\w+"\s*=\s*1\s*\]$/.test(x))))
          add({ file, job, step, rule: 'retry-loop', level: 'error', evidence: l });
        if (!retry && /&&/.test(l) && !last)
          add({ file, job, step, rule: 'and-list-not-last', level: 'error', evidence: l });
      });
    });
  }
}
for (const f of findings) console.log(JSON.stringify(f));
process.exit(findings.some((f) => f.level === 'error') ? 1 : 0);
