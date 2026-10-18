# Changelog

All notable changes to COdo are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] — first stable COdo release

COdo 1.0.0 is the first release where COdo stands as a product of its own
identity: the security layer, the persona system, the scope gate, and the
compose engine are COdo-original work. Core engine and TUI portions derived
from [OpenCode](https://github.com/anomalyco/opencode) (MIT) carry the upstream
copyright notice in [NOTICES.md](NOTICES.md).

### COdo-native

- **Sec-Test security orchestrator** — six specialist personas (Security
  Architect, AppSec Engineer, DevSecOps Engineer, Penetration Tester, Quality
  Engineer, Security Engineer) covering pre-code threat modeling (STRIDE),
  real-time SAST on diffs, pipeline hardening / SBOM / provenance, scope-gated
  live probing, adversarial tests verified by mutation kill-rate, and agent-surface
  audits.
- **Durable findings store** — every finding carries an ID, severity, evidence,
  and remediation path, persisted under `.planning/security/findings/` rather
  than markdown scratch notes.
- **24 sec-test skills** — threat models, code audits, secrets scans, fuzzing,
  mutation testing, SBOMs, regression guards, and more, dispatchable as
  `sec-test:<skill>` skills.
- **Scope gate** — the penetration-testing personas refuse any target outside
  an explicit, unexpired `.codo/security-scope.json`; `DELETE` is always refused.
- **Workflow engines** — per-project methodology switching: GSD (persistent
  `.planning/` state), gstack, speckit, vibemode.
- **Multi-agent compose** — complex tasks decompose into DAGs routed across
  specialist agents in parallel waves.
- **Goal Judge** — outcome-based stop conditions verified by an independent
  judge model.
- **Namespace + attribution sweep** — opencode → COdo namespace, upstream MIT
  license text retained in `LICENSES/OPENCODE-LICENSE.txt`, and the not-a-fork
  ledger documenting what COdo inherits vs what it adds
  ([docs/not-a-fork/](docs/not-a-fork/VISIBLE-DIFFERENCES.md)).

### Known compat shims (intentional, documented)

- `.opencode` legacy config dirs are read read-only so existing users aren't
  locked out.
- Third-party plugins and the `GSD_RUNTIME=opencode` marker keep their upstream
  publication names; they are dependencies, not fork markers.

[1.0.0]: https://github.com/Mosalah4351/COdo/releases/tag/v1.0.0
