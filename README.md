# COdo — Terminal AI & Sec-Test Security Engine

> Spec it. Code it. Ship it. Secure it.

COdo is a terminal-native, spec-driven AI coding assistant featuring Sec-Test —
an autonomous 6-persona security and testing orchestrator. Available as a
terminal interface, desktop app, or IDE extension.
Learn more at [codo-ai.vercel.app](https://codo-ai.vercel.app/).

## Install

```bash
npm install -g codo-ai
```

```bash
codo
```

The npm package installs a native binary for your platform (macOS, Linux, or
Windows; Intel or Apple Silicon/ARM64; glibc or musl) via a zero-dependency
postinstall. No Node runtime required after install.

New to LLM providers? Run `/connect` in the TUI and try
[COdo Zen](https://codo-ai.vercel.app/docs/zen) — a curated list of models
tested and verified by the COdo team.

## Features

- **Native TUI** — a responsive, native, themeable terminal UI.
- **Compose agent** — your idea gets routed to a team of specialist subagents
  (researchers, planners, executors, verifiers), orchestrated end to end.
- **Multi-session** — run multiple agents in parallel on the same project.
- **Use any model** — 75+ LLM providers through [Models.dev](https://models.dev),
  including local models. Log in with GitHub to use Copilot, or with OpenAI
  for ChatGPT Plus/Pro.
- **LSP enabled** — automatically loads the right language servers for the LLM.
- **Shareable links** — share a link to any session for reference or debugging.
- **Built-in web scraping** — a polite, checkpointed scraping ladder with
  QA-gated Excel delivery.
- **Business + security suites** — deep research, spreadsheets, decks, and PDFs
  on one side; OWASP auditing and scope-gated pentesting on the other.

## Sec-Test

Every session can route security and quality work to the right specialist:

| Persona | Phase |
|---|---|
| **Security Architect** | Pre-code STRIDE threat modeling (OWASP ASVS mapped) |
| **AppSec Engineer** | Real-time SAST on diffs — OWASP Top 10:2025 / CWE Top 25, secrets, CVEs |
| **DevSecOps Engineer** | Pipeline hardening (NIST SSDF), SBOM (CycloneDX/SPDX), SLSA + Sigstore |
| **Penetration Tester** | Scope-gated live probing (PTES/WSTG) — refuses targets outside `.codo/security-scope.json` |
| **Quality Engineer** | Adversarial tests verified by mutation kill-rate |
| **Security Engineer** | Audits the agent itself; posture drift tracking |

Findings live in a durable store with IDs, severities, evidence, and
remediation paths — never lost in markdown notes.

## Requirements

- macOS 12+, Linux (glibc or musl), or Windows 10+ (x64 with AVX2, or baseline fallback)
- ARM64 (Apple Silicon / AArch64 Linux / Windows on ARM) supported natively

## Docs

Full documentation at [codo-ai.vercel.app/docs](https://codo-ai.vercel.app/docs).

## License

MIT - see [`LICENSE`](LICENSE). COdo was initially derived from OpenCode (MIT); the
OpenCode license text is preserved at [`LICENSES/OPENCODE-LICENSE.txt`](LICENSES/OPENCODE-LICENSE.txt).

## Contributors

- **COdo agent** — AI contributor (session title generation, Muse prompt restore, release tooling). Commits carry a `Co-Authored-By: COdo agent` trailer.

## Community

- **Issues** — <https://github.com/Mosalah4351/COdo/issues>
- **Discussions** — <https://github.com/Mosalah4351/COdo/discussions>
- **Docs** — <https://codo-ai.vercel.app/docs>

If you find a vulnerability in COdo, please do **not** open a public issue — email
`security@codo.run` with a proof-of-concept.
