#!/usr/bin/env bash
# Regression test for the skill's script: expected findings per case file.
set -euo pipefail
cd "$(dirname "$0")/.."
check() { # file expected-error-rules(sorted, comma)
  got=$(node scripts/find-silent-passes.mjs "tests/cases/$1" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{console.log(s.trim().split("\n").filter(Boolean).map(JSON.parse).filter(f=>f.level==="error").map(f=>(f.job.startsWith("v")?f.job.slice(0,3)+":":"")+f.rule).sort().join(","))})' || true)
  if [ "$got" = "$2" ]; then echo "PASS $1"; else echo "FAIL $1"; echo "  want: $2"; echo "  got:  $got"; return 1; fi
}
check bad.yml "or-true,pipe-without-pipefail,retry-loop,step-continue-on-error"
check good.yml ""
check variants.yml "v02:pipe-without-pipefail,v04:or-true,v05:retry-loop,v06:retry-loop,v07:retry-loop,v08:and-list-not-last"
