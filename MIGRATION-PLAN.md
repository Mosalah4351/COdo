# COdo Identity Migration Plan
## OpenCode → COdo Full Rebrand

---

## Decisions

| # | Decision | Chosen |
|---|---|---|
| 1 | SVG mark style | **C** — Hybrid: `>_` terminal icon + "COdo" wordmark |
| 2 | `opencode-dev/` directory | **A** — Rename to `codo-dev/` and update all internal references |
| 3 | `packages/docs/` branding | **Yes** — Update `docs.json` with COdo branding |

---

## Scope Summary

| Metric | Count |
|---|---|
| Identity assets to replace | 6 files |
| Package.json files to edit | ~35 |
| Source files with `.opencode` paths | ~15 |
| i18n translation files | ~25 (19 web locales + app/ui/console) |
| External npm packages to skip | `opencode-gitlab-auth`, `opencode-poe-auth`, `@gitlab/opencode-gitlab-auth` |
| Root directories to rename | 1 (`opencode-dev/` → `codo-dev/`) |
| Generated artifacts to clean | `dist/`, `qr-landing/`, `build-source.tar`, `source.tar` |

---

## Wave 1 — Root & Assets (Identity Foundation)

### 1.1 Generate Identity Assets

**Source**: `D:\CD_website\public\`
- `favicon.svg` — terminal `>_` motif, green on black
- `COdo_big_logo.png` — primary logo source
- `social.png` — social card source

**Target**: `packages/identity/`

| Output File | Source | Method |
|---|---|---|
| `mark.svg` | favicon.svg + COdo wordmark | Write SVG: hybrid of terminal icon and "COdo" text |
| `mark-light.svg` | favicon.svg + light strokes | Write SVG: light color variant |
| `mark-96x96.png` | COdo_big_logo.png | Bun script with photon-node to resize |
| `mark-192x192.png` | COdo_big_logo.png | Bun script with photon-node to resize |
| `mark-512x512.png` | COdo_big_logo.png | Bun script with photon-node to resize |
| `mark-512x512-light.png` | COdo_big_logo.png + light bg | Bun script with photon-node to resize + light bg override |

### 1.2 Root Documentation

| File | Changes |
|---|---|
| `README.md` | `OpenCode` → `COdo` |
| `DEEP_MINDS_POSTER.md` | `OpenCode` → `COdo` |
| `walkthrough.md` | `OpenCode` → `COdo` |
| `AGENTS.md` | `OpenCode` → `COdo` in prose; leave `@opencode-ai/core/project` import examples as code references (those refer to actual npm scope, not display name) |
| Root `package.json` | Verify `description` says "COdo" |

### 1.3 Clean Generated Artifacts

```powershell
# Remove from git
git rm -rf dist/
git rm -rf qr-landing/
git rm build-source.tar
git rm source.tar

# Ensure .gitignore covers them
check .gitignore for dist/, *.tar, qr-landing/
```

---

## Wave 2 — Core Engine & Config (Foundation Layer)

### 2.1 Config Directory Migration (`.opencode` → `.codo`)

**File list**:
| File | Lines | Action |
|---|---|---|
| `packages/core/src/config.ts` | 180, 188, 194 | Replace `.opencode` → `.codo` + add `.opencode` fallback |
| `packages/codo/src/config/config.ts` | ~424 | Replace `.opencode` → `.codo` + add `.opencode` fallback |
| `packages/codo/src/config/paths.ts` | 29, 35 | Replace `.opencode` → `.codo` |
| `packages/codo/src/config/tui.ts` | 201, 204 | Replace `.opencode` → `.codo` |

**Fallback logic** (pseudo):
```typescript
// Try .codo first, fall back to .opencode with warning
const codoDir = path.join(cwd, ".codo")
const legacyDir = path.join(cwd, ".opencode")
const configDir = (await fs.exists(codoDir)) ? codoDir
  : (await fs.exists(legacyDir)) ? legacyDir
  : codoDir // default to new
```

### 2.2 Root Directory Rename

```powershell
# Rename directory
Move-Item opencode-dev codo-dev

# Update references
# - Check root .gitignore
# - Check any CI scripts (GitHub Actions, Docker)
# - Check any build scripts referencing opencode-dev
```

### 2.3 Package.json Descriptions

| Package | Field |
|---|---|
| `packages/core/package.json` | `description` |
| `packages/codo/package.json` | `description` |
| `packages/cli/package.json` | `description` |
| `packages/server/package.json` | `description` |
| `packages/llm/package.json` | `description` |

### 2.4 Source Code Strings in Core

Search `packages/core/src/**` and `packages/codo/src/**` for "OpenCode" in:
- Comments
- Error messages
- Help text
- Tool descriptions (`.txt` files)
- Replace with "COdo"

### 2.5 Provider References

| File | Change |
|---|---|
| Any `provider-opencode` test files | Rename to `provider-codo` if it's a custom provider ID |
| `packages/codo/src/provider/provider.ts` | Check for provider ID/name strings |
| `packages/core/src/catalog.ts` | Check for provider display names |

---

## Wave 3 — All UI Layers (TUI, App, Desktop, Session-UI, UI)

### 3.1 TUI (`packages/tui/`)

| File | Changes |
|---|---|
| `src/component/logo.tsx` | ASCII art / logo text: "OpenCode" → "COdo" |
| `src/app.tsx` | App title, welcome messages |
| `src/util/locale.ts` or i18n files | Product name strings |

### 3.2 App (`packages/app/`)

| File | Changes |
|---|---|
| `src/app.tsx` | HTML `<title>`, meta tags |
| `src/entry.tsx` | App name in initialization |
| `index.html` | `<title>`, favicon link |
| `src/context/server.tsx` | `api.opencode.ai` → `api.codo-ai.vercel.app` |
| `src/desktop-menu.ts` | App name in menus |
| i18n files | Product name translations |

### 3.3 Desktop (`packages/desktop/`)

| File | Changes |
|---|---|
| `package.json` | `productName`, `description`, `homepage` |
| `electron-builder.config.ts` | `appId`, `productName`, `publish` URLs, icon paths |
| `src/main/index.ts` | App name in crash reporter, logs |
| `src/renderer/index.tsx` | App name in Sentry init, platform API |

### 3.4 Session-UI (`packages/session-ui/`)

| File | Changes |
|---|---|
| Component files with branding | Any "OpenCode" in UI text |

### 3.5 UI (`packages/ui/`)

| File | Changes |
|---|---|
| Theme files (`src/theme/*.ts`) | Any brand-specific theme descriptions |
| i18n files (`src/i18n/*.ts`) | Product name translations |
| `src/components/logo*` if exists | Logo component text |

---

## Wave 4 — API, SDK, Plugin, Browser, Server

### 4.1 SDK (`packages/sdk/js/`)

| File | Changes |
|---|---|
| `package.json` | `description`, `homepage` |
| Source files | Any "OpenCode" in comments/docs |

### 4.2 Plugin (`packages/plugin/`)

| File | Changes |
|---|---|
| `package.json` | `description`, `homepage` |
| `src/index.ts` | Plugin descriptions |
| `src/tui.ts` | TUI plugin docs |

### 4.3 Browser (`packages/browser/`)

| File | Changes |
|---|---|
| `package.json` | `description` |
| `src/tools/core.ts` | Tool descriptions mentioning OpenCode |

### 4.4 Server (`packages/server/`)

| File | Changes |
|---|---|
| `package.json` | `description` |
| `src/api.ts` | OpenAPI title/description |

---

## Wave 5 — Cloud, Docs, Stats, Enterprise, Slack

### 5.1 Console (`packages/console/`)

| File | Changes |
|---|---|
| `app/package.json` | `description`, `homepage` |
| `core/package.json` | `description` |
| `app/src/routes/**/*.tsx` | Landing page copy |
| `app/src/i18n/*.ts` or `*.json` | Product name translations |
| `mail/emails/**/*.tsx` | Email subject/body |
| `function/src/auth.ts` | Auth issuer branding |

### 5.2 Enterprise (`packages/enterprise/`)

| File | Changes |
|---|---|
| `package.json` | `description` |
| `src/app.tsx` | App name |
| `src/core/share.ts` | Share URL generation branding |

### 5.3 Web Docs (`packages/web/`)

| File | Changes |
|---|---|
| `package.json` | `description`, `homepage` |
| `astro.config.mjs` | `site` URL, `docs.opencode.ai` → `docs.codo-ai.vercel.app` |
| `src/content/docs/**/*.mdx` | All content references |
| `src/i18n/*.json` (19 locales) | Product name translations |
| `src/middleware.ts` | Any hardcoded domains |

### 5.4 Docs (`packages/docs/`)

| File | Changes |
|---|---|
| `docs.json` | `name`, `logo`, `favicon`, any URL references |

### 5.5 Stats (`packages/stats/`)

| File | Changes |
|---|---|
| `*/package.json` | `description` |
| `app/src/app.tsx` | App name |

### 5.6 Slack (`packages/slack/`)

| File | Changes |
|---|---|
| `package.json` | `description` |
| `src/index.ts` | Bot references to OpenCode → COdo |

### 5.7 Function (`packages/function/`)

| File | Changes |
|---|---|
| `package.json` | `description` |
| `src/api.ts` | Any branding in share/sync endpoints |

---

## Wave 6 — Infrastructure & Remaining

### 6.1 Infrastructure (`infra/`)

| File | Changes |
|---|---|
| `infra/stage.ts` | `opencode.ai` → `codo-ai.vercel.app`, `dev.opencode.ai` → `dev.codo-ai.vercel.app` |
| `infra/app.ts` | All domain references, worker names |
| `infra/console.ts` | Console domain |
| `infra/enterprise.ts` | Enterprise domain |
| `infra/lake.ts` | Any branding |
| `infra/monitoring.ts` | Any branding |
| `sst.config.ts` | Verify no hardcoded domains |

### 6.2 HTTP Recorder (`packages/http-recorder/`)

| File | Changes |
|---|---|
| `package.json` | `name` (already `@codo-ai/http-recorder`? verify), `description`, `homepage`, `repository` |

### 6.3 Effect SQLite Packages (`packages/effect-*`)

| File | Changes |
|---|---|
| `package.json` | `description`, `name` if `@opencode-ai/*` |

### 6.4 Script (`packages/script/`)

| File | Changes |
|---|---|
| `package.json` | `description` |

---

## Wave 7 — Verification & Cleanup

### 7.1 String Audit

```powershell
# Should only match external npm packages and migration artifacts
cd D:\COdo
Select-String -Recurse -Pattern 'OpenCode' -Exclude 'node_modules','.git','dist' |
  Where-Object { $_.Path -notmatch 'opencode-gitlab-auth|opencode-poe-auth|MIGRATION-PLAN' }

# Check for remaining .opencode path references (should only be fallback code)
Select-String -Recurse -Pattern '\.opencode' -Exclude 'node_modules','.git','dist' |
  Where-Object { $_.Path -notmatch 'fallback|legacy|backward|compatibility' }

# Check for opencode.ai domains
Select-String -Recurse -Pattern 'opencode\.ai' -Exclude 'node_modules','.git','dist'
```

### 7.2 Typecheck

```bash
cd D:\COdo
bun turbo typecheck
```

### 7.3 Build Verification

```bash
cd D:\COdo
bun run --cwd packages/codo build
# bun run --cwd packages/desktop build  # (optional, takes longer)
# bun run --cwd packages/app build       # (optional)
```

### 7.4 Test Run (Sample)

```bash
cd D:\COdo\packages\core && bun test
cd D:\COdo\packages\codo && bun test
cd D:\COdo\packages\llm && bun test
```

### 7.5 Asset Verification

- [ ] `packages/identity/mark.svg` renders in browser (green `>_` + "COdo")
- [ ] `packages/identity/mark-light.svg` renders (light variant)
- [ ] `packages/identity/mark-96x96.png` opens without corruption
- [ ] `packages/identity/mark-192x192.png` opens without corruption
- [ ] `packages/identity/mark-512x512.png` opens without corruption
- [ ] `packages/identity/mark-512x512-light.png` opens without corruption

---

## Post-Migration Commit Message

```
chore(rebrand): migrate entire identity from OpenCode to COdo

- Replace all 6 identity assets with COdo-branded versions
- Rename .opencode config dirs to .codo (with .opencode fallback)
- Rename opencode-dev/ to codo-dev/
- Replace OpenCode → COdo in all user-facing strings
- Replace opencode.ai domains with codo-ai.vercel.app
- Update package descriptions and metadata
- Clean generated artifacts (dist/, tarballs)
- Update all i18n translations (19 locales)
```

---

*Plan generated before execution. Check this file before each wave.*
