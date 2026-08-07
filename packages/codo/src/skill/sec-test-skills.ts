import agentSurfaceAuditContent from "./sec-test/agent-surface-audit/SKILL.md" with { type: "text" }
import apiSecurityTestContent from "./sec-test/api-security-test/SKILL.md" with { type: "text" }
import authTestContent from "./sec-test/auth-test/SKILL.md" with { type: "text" }
import briefContent from "./sec-test/brief/SKILL.md" with { type: "text" }
import codeAuditContent from "./sec-test/code-audit/SKILL.md" with { type: "text" }
import containerScanContent from "./sec-test/container-scan/SKILL.md" with { type: "text" }
import dependencyAuditContent from "./sec-test/dependency-audit/SKILL.md" with { type: "text" }
import exploitVerifyContent from "./sec-test/exploit-verify/SKILL.md" with { type: "text" }
import pentestContent from "./sec-test/pentest/SKILL.md" with { type: "text" }
import pipelineHardenContent from "./sec-test/pipeline-harden/SKILL.md" with { type: "text" }
import reportContent from "./sec-test/report/SKILL.md" with { type: "text" }
import sbomContent from "./sec-test/sbom/SKILL.md" with { type: "text" }
import scopeContent from "./sec-test/scope/SKILL.md" with { type: "text" }
import secretsScanContent from "./sec-test/secrets-scan/SKILL.md" with { type: "text" }
import supplyChainAttestContent from "./sec-test/supply-chain-attest/SKILL.md" with { type: "text" }
import threatModelContent from "./sec-test/threat-model/SKILL.md" with { type: "text" }

export interface SecTestSkill {
  name: string
  description: string
  content: string
}

export const secTestSkills: SecTestSkill[] = [
  {
    name: "sec-test:agent-surface-audit",
    description: "Audit COdo's own skills/plugins/MCP surface against OWASP LLM/MCP/Agentic Top 10",
    content: agentSurfaceAuditContent,
  },
  {
    name: "sec-test:brief",
    description: "Triage a security request and pick the right persona before dispatching",
    content: briefContent,
  },
  {
    name: "sec-test:code-audit",
    description: "Static security audit of application code against OWASP Top 10:2025 and CWE Top 25",
    content: codeAuditContent,
  },
  {
    name: "sec-test:api-security-test",
    description: "OWASP API Security Top 10 checks against a scope-listed endpoint",
    content: apiSecurityTestContent,
  },
  {
    name: "sec-test:auth-test",
    description: "Session/authentication validation on a scope-listed target",
    content: authTestContent,
  },
  {
    name: "sec-test:container-scan",
    description: "Scan container images for OS and language-package vulnerabilities",
    content: containerScanContent,
  },
  {
    name: "sec-test:dependency-audit",
    description: "Audit third-party dependencies for known vulnerabilities and supply-chain red flags",
    content: dependencyAuditContent,
  },
  {
    name: "sec-test:exploit-verify",
    description: "Confirm exploitability of an existing finding without escalating",
    content: exploitVerifyContent,
  },
  {
    name: "sec-test:pentest",
    description: "Scope-gated dynamic testing — requires .codo/security-scope.json, refuses without it",
    content: pentestContent,
  },
  {
    name: "sec-test:pipeline-harden",
    description: "Audit CI/CD pipelines per NIST SSDF, SLSA build track, and Sigstore signing",
    content: pipelineHardenContent,
  },
  {
    name: "sec-test:report",
    description: "Roll up findings from .planning/security/findings/ into a posture report",
    content: reportContent,
  },
  {
    name: "sec-test:sbom",
    description: "Generate and validate a Software Bill of Materials for built artifacts",
    content: sbomContent,
  },
  {
    name: "sec-test:scope",
    description: "Author or refresh the .codo/security-scope.json authorization file",
    content: scopeContent,
  },
  {
    name: "sec-test:secrets-scan",
    description: "Scan tracked code and git history for committed secrets",
    content: secretsScanContent,
  },
  {
    name: "sec-test:supply-chain-attest",
    description: "Verify build provenance and artifact signing (SLSA, Sigstore, in-toto)",
    content: supplyChainAttestContent,
  },
  {
    name: "sec-test:threat-model",
    description: "STRIDE (or PASTA) threat model against a design before code exists",
    content: threatModelContent,
  },
]

export const SEC_TEST_SKILL_NAMES = new Set(secTestSkills.map((s) => s.name))

export function isSecTestSkill(name: string): boolean {
  return name.startsWith("sec-test:")
}
