---
date: 2026-08-25
persona: sec-appsec
skill: sec-test:code-audit
scope: packages/codo/src/security/ + packages/codo/src/server/
status: complete
findings: 7
critical: 0
high: 3
---

# Code Audit — security/ (permission system) + server/ (HTTP endpoints)

## Coverage

- **Automated SAST: NOT RUN.** `semgrep` and `opengrep` are not installed in this environment; the audit was a full manual walk of the OWASP Top 10:2025 and CWE Top 25 over the target trees. Cross-file taint flows were traced by hand.
- **Secrets / dependencies / CI:** excluded per dispatch (covered by other agents).
- **Files read line-by-line:** all 5 files in `packages/codo/src/security/`; in `packages/codo/src/server/`: `auth.ts`, `cors.ts`, `proxy-util.ts`, `server.ts`, `mdns.ts`, `global-lifecycle.ts`, all files under `shared/` and `routes/instance/httpapi/middleware/`, all 20 handler files, `api.ts`, `httpapi/server.ts`, `websocket-tracker.ts`, plus the supporting implementations they lean on (`packages/core/src/fs-util.ts`, `packages/core/src/filesystem.ts`, `packages/core/src/pty/ticket.ts`, `packages/codo/src/worktree/index.ts`, `packages/codo/src/pty-preparation.ts`, `packages/codo/src/cli/network.ts`, `cli/cmd/web.ts`, `cli/cmd/serve.ts`, `packages/server/src/middleware/authorization.ts`).
- **Not read line-by-line** (low-risk plumbing, skimmed via grep for dangerous patterns): `tui-event.ts`, root `event.ts`, `projectors.ts`, `init-projectors.ts`, `groups/*` schemas (spot-checked), `errors.ts`, `lifecycle.ts`, `middleware/{schema-error,compression}.ts`. No `eval`, `new Function`, `child_process`, or `Bun.spawn` hits anywhere under `src/server/`.
- Working tree audited as-is including uncommitted changes (`git diff --stat` shows only `security/{finding,scope-gate,tool-presence}.ts` modified).

## What held up well

- `security/scope-gate.ts` — target matching blocks host-suffix/userinfo bypasses with boundary-char prefix + origin equality; fail-closed on parse errors. No findings.
- `security/baseline.ts` — malformed expiry treated as already-expired (fail-closed suppressions). No findings.
- File API path resolution (`handlers/file.ts:96-99` → `core/filesystem.ts:77-84`) — lexical `contains` check **plus** `realPath` symlink check against the instance root. TOCTOU window between `realPath` and `readFile` exists but requires a local racing process with write access to the workspace; standard residual risk, not reported.
- PTY connect tickets (`core/pty/ticket.ts`) — UUIDv4, 60s TTL, single-use `invalidateWhen`, scope-bound to ptyID+directory+workspaceID. Solid.
- Proxy hop-by-hop header stripping (`proxy-util.ts`); embedded UI served from an in-memory map (no traversal); upstream UI proxy target is operator env config, not request data (no SSRF).
- Workspace remote proxy targets come from server-side adapters, not raw client URLs — no direct SSRF primitive found.

## Findings

### 1. [HIGH] No global Origin/Host validation — DNS-rebinding & cross-site request forgery reach the whole API

**ID:** `fin_03ab1e7200019kfEu5HcLrdEFq` · **Category:** A01 Broken Access Control / CWE-346 · **Confidence:** high
**Location:** `packages/codo/src/server/routes/instance/httpapi/server.ts:114-121`

The CORS middleware only sets `Access-Control-Allow-Origin` response headers (which blocks *reading* responses cross-origin but does not stop state-changing requests from executing). Origin+Host validation (`isAllowedRequestOrigin`) is enforced **only** on the two PTY endpoints (`handlers/pty.ts:29-31`). Every other mutating endpoint — permission approval, session prompt/shell, PTY creation (arbitrary process spawn), MCP add, session permission rewrite — accepts requests from any origin, including DNS-rebound hostnames where the browser considers the request same-origin.

```ts
// httpapi/server.ts:114-121 — CORS = response headers only, no request rejection
const cors = (corsOptions?: CorsOptions) =>
  HttpRouter.middleware(
    HttpMiddleware.cors({
      allowedOrigins: (origin) => isAllowedCorsOrigin(origin, corsOptions),
      maxAge: 86_400,
    }),
    { global: true },
  )

// handlers/pty.ts:29-31 — the ONLY place Origin+Host are validated
function validOrigin(request: HttpServerRequest.HttpServerRequest, opts: CorsOptions | undefined) {
  return isAllowedRequestOrigin(request.headers.origin, request.headers.host, opts)
}
```

Amplifying factor: when `--port` is unset, the listener prefers port **4096** (`server.ts:121-126`), making the rebound URL predictable. Attack chain from a malicious webpage: rebind → `POST /permission/:id/reply` (approve pending tool permission), `POST /session/:id/shell` (execute shell command), `POST /pty` (spawn arbitrary process via `PtyPreparation.prepareCreate`, which takes raw `command`/`args`), or `PATCH`-style session `update` to loosen stored permissions (`handlers/session.ts:192-196`).

**Remediation:** add global router middleware that rejects non-GET requests whose `Origin` (when present) fails `sameHost(origin, Host)`/allowlist, and validates `Host` against the bound hostname (loopback names or configured domain). Mirror the existing `validOrigin` logic used by the PTY paths.

---

### 2. [HIGH] Server can bind non-loopback with authentication left optional — warning-only

**ID:** `fin_03ab1e7270011m7JlravVk64vp` · **Category:** A07 Authentication Failures / CWE-1188 · **Confidence:** high
**Location:** `packages/codo/src/cli/network.ts:56-57`

`--mdns` (or persisted `server.mdns` config) silently flips the bind address to `0.0.0.0`; both `serve` and `web` merely print a warning if `CODO_SERVER_PASSWORD` is unset, and every auth middleware becomes a no-op in that case:

```ts
// cli/network.ts:54-58
const hostname = hostnameExplicitlySet ? args.hostname : mdns && !config?.server?.hostname ? "0.0.0.0" : ...

// cli/cmd/web.ts:40-42 — warning only
if (!Flag.CODO_SERVER_PASSWORD) { UI.println("...CODO_SERVER_PASSWORD is not set; server is unsecured.") }

// middleware/authorization.ts:104 (also :46,:90,:122)
if (!ServerAuth.required(config)) return (effect) => effect
```

On such a deployment any LAN peer can call the full API unauthenticated: arbitrary-file read via the file API (see finding 4), shell spawn via `POST /pty`, permission auto-approval, session control. For a product whose threat model treats "local server" as the boundary, binding off-loopback without mandatory credentials defeats it.

**Remediation:** refuse startup (or auto-generate and print a one-time token) when hostname is non-loopback and no password is configured; keep the warning for loopback-only binds.

CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H (precondition: operator enabled mdns/non-loopback hostname)

---

### 3. [HIGH] Worktree remove recursively force-deletes attacker-chosen directories (path traversal)

**ID:** `fin_03ab1e7320013zuz1DClTvQ9p6` · **Category:** CWE-22 / A01 Broken Access Control · **Confidence:** high
**Location:** `packages/codo/src/worktree/index.ts:423-430`

`remove()` canonicalizes the client-supplied `directory` but never checks containment against the project worktree. When the path does **not** match a registered git worktree entry, it is handed straight to `cleanDirectory` → `fsp.rm(target, { recursive: true, force: true })`:

```ts
// worktree/index.ts:410-430
const directory = yield* canonical(input.directory)      // input.directory = HTTP payload, any absolute path
...
if (!entry?.path) {
  const directoryExists = yield* fs.exists(directory).pipe(Effect.orDie)
  if (directoryExists) {
    yield* stopFsmonitor(directory)
    yield* cleanDirectory(directory)                      // → fsp.rm(target, { recursive: true, force: true })
  }
  return true
}

// worktree/index.ts:389-391
await fsp.rm(target, { recursive: true, force: true })
```

Exposed via `worktreeRemove` (`handlers/experimental.ts:118-125`, payload schema `RemoveInput = { directory: Schema.String }`). A single request deletes any directory the process can access (e.g. `{"directory": "C:\\Users\\victim\\Documents"}`), independent of git state.

**Remediation:** after `canonical()`, require `FSUtil.contains(yield* canonical(ctx.worktree), directory)` before any dispose/rm path; return `WorktreeNotFound` otherwise. Note the sibling `prune()` helper (lines 515-528) already does this containment check correctly — reuse that pattern.

CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:H

---

### 4. [MEDIUM] Per-request workspace directory selection has no allowlist — file API reads any root

**ID:** `fin_03ab1e73e0010Xohhe66Ag6NLL` · **Category:** A01 Broken Access Control / CWE-22 · **Confidence:** high
**Location:** `packages/codo/src/routes/../httpapi/middleware/workspace-routing.ts:86-88`

Any request can point the whole instance context at an arbitrary filesystem directory via query param or header; file list/read then resolve relative to that chosen root (their internal `..`/symlink guards are relative to whatever root was selected):

```ts
// middleware/workspace-routing.ts:86-88
function defaultDirectory(request: HttpServerRequest.HttpServerRequest, url: URL): string {
  return url.searchParams.get("directory") || request.headers["x-COdo-directory"] || process.cwd()
}

// handlers/file.ts:97-99 — guard is relative to the *selected* directory
const directory = (yield* InstanceState.context).directory
const file = path.resolve(directory, ctx.query.path)
if (!FSUtil.contains(directory, file)) ...
```

`GET /file/content?path=<rel>&directory=C:/Users/admin/.ssh` returns file contents. Multi-root support makes this design-intended for local use, but combined with findings 1–2 it converts a browser/LAN foothold into arbitrary file disclosure across the machine. There is no validation of the selected directory against registered projects.

**Remediation:** restrict `directory` selection to project roots known to the InstanceStore/project registry (404 otherwise), or require elevated credentials for out-of-registry roots.

---

### 5. [LOW] Credentials accepted via `?auth_token=` query parameter

**ID:** `fin_03ab1e748001kYzI0j7Zibh41e` · **Category:** CWE-598 / A07 · **Confidence:** high
**Location:** `packages/codo/src/server/routes/instance/httpapi/middleware/authorization.ts:77-79`

Both auth middlewares accept Basic credentials base64-encoded in the URL. Query strings land in server/proxy logs, browser history, and `Referer` headers:

```ts
// middleware/authorization.ts:12,77-79 (same pattern in packages/server/src/middleware/authorization.ts:33-34)
const AUTH_TOKEN_QUERY = "auth_token"
function credentialFromURL(url: URL, request) {
  const token = url.searchParams.get(AUTH_TOKEN_QUERY)
  if (token) return decodeCredential(token)
```

**Remediation:** prefer the `Authorization` header everywhere; where query-param auth is genuinely needed (EventSource/WebSocket), issue short-lived random tickets (as the PTY flow already does) instead of accepting the long-lived Basic credential.

---

### 6. [LOW] Password compared with non-constant-time equality

**ID:** `fin_03ab1e75d0011gLGuJnKRJkmlk` · **Category:** CWE-208 / A04 Cryptographic Failures · **Confidence:** high
**Location:** `packages/codo/src/server/auth.ts:28-34`

```ts
export function authorized(credentials: DecodedCredentials, config: Info) {
  return (
    Option.isSome(config.password) &&
    credentials.username === config.username &&
    Redacted.value(credentials.password) === config.password.value   // early-exit string compare
  )
}
```

Timing side channel on the server password. Practical exploitation over TCP is hard but the fix is trivial and this guards the crown-jewel surface.

**Remediation:** hash both sides with SHA-256 and compare digests via `crypto.timingSafeEqual`.

---

### 7. [LOW] CORS origin allowlist uses prefix matching for custom scheme

**ID:** `fin_03ab1e76a001ajzPLFtJFs5Lfv` · **Category:** A02 Security Misconfiguration · **Confidence:** low
**Location:** `packages/codo/src/server/cors.ts:15`

```ts
if (input.startsWith("oc://renderer")) return true
```

Prefix matching accepts origins like `oc://renderer.attacker.tld` as trusted. Only exploitable if a hostile app can register a similar custom-scheme origin (desktop webview context), hence low confidence/severity. The same function's `http://localhost:`/`127.0.0.1:` prefixes allow any port, which is acceptable for this product.

**Remediation:** exact-match the full origin string (`oc://renderer`), or anchor the match at an end-of-host delimiter.

---

## Open Questions (not counted as findings)

- `workspaceProxyURL` concatenates `requestURL.pathname` onto the remote target without segment normalization; Node/Bun fetch normalizes `..` before dialing, so no exploit was demonstrated. Worth a regression test.
- `HttpServerRequest.toURL` honors `Host`/`x-forwarded-*` when building the pagination `Link` header (`handlers/session.ts:130-142`); behind a misconfigured reverse proxy this could echo an attacker-controlled origin into a response header. Not reachable in the default direct-listen topology.

## SEC-RESULT

See structured return in the dispatch reply.
