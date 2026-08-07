---
name: sec-test:fuzz
hidden: true
description: "Coverage-guided fuzzing of parsing/serializing entrypoints — REQUIRES .codo/security-scope.json for live targets"
---

# Fuzz

## Overview

Fuzzing catches input-handling bugs that humans miss — panics on malformed JSON, regexes that explode, parsers that accept negative lengths. Two flavors:

- **Coverage-guided fuzzing** of pure parsing functions (no scope file needed — it's local code under test)
- **Live-target fuzzing** of network endpoints (scope file REQUIRED, same as pentest)

## Workflow (local code fuzzing)

1. **Find targets.** Look for: parsers (JSON, YAML, XML, custom binary formats), authorization checks with complex boolean logic, sanitizers, encoders/decoders, regex evaluators.
2. **Pick a fuzzer:**
   - Go: `go test -fuzz` (built-in, corpus in `testdata/fuzz/`)
   - Rust: `cargo fuzz` (libfuzzer)
   - JS/TS: `jsfuzz`, or repurpose `fast-check` property tests as light fuzz
   - Python: `atheris`
3. **Write the harness.** A function taking `Uint8Array` that calls the parser under test. The harness must never throw on bad input — throws are expectations, not failures. A *panic* or *abort* is a finding.
4. **Run the corpus.** Start with 60 seconds. Note any crashes the fuzzer isolates.
5. **Minimize + Record.** The fuzzer should produce a minimized reproducer. Save it under `.planning/security/fuzz-corpus/<funcname>/crash-<hash>`.

## Workflow (live-target fuzzing)

**Requires scope file validated via the same gate as sec-test:pentest.** Read + parse + validate before any traffic.

- Bounded: only endpoint parameters listed in the scope's `targets[].notes` if present.
- Use a rate limit. Default: ≤10 req/s, ≤100 requests total.
- Stop at first 500-series error.

## Reporting

Paths:
- Local-code findings → `.planning/security/findings/YYYY-MM-DD-fuzz-<module>.md` (persona: sec-appsec).
- Live-target findings → `.planning/security/findings/YYYY-MM-DD-fuzz-live-<target>.md` (persona: sec-pentest).

Return `## CODE AUDIT COMPLETE` for local, `## PENTEST COMPLETE` for live.

## Rules

- **Never fuzz third-party code** that isn't explicitly listed in project manifests — that's pentesting someone else's software.
- **A crash report without a minimized reproducer is incomplete.** Always minimize.
- **Timeouts and 429 responses are NOT findings.** Overloaded target doesn't imply a vuln.
