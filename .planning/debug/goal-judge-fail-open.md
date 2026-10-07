# DEBUG: goal judge fail-open on free-tier model (Muse Spark 1.3 Free)

Branch: not-a-fork, HEAD 1fa2632. No code changed (research-only dispatch).

## Symptom
Trivial turn ("tell me a joke" → joke) renders `▼ ! Judge: error (stopped)` + `judge error` text.
That line is `packages/tui/src/routes/session/index.tsx:1592` (`if (v.error) ... "Judge: error (stopped)"`),
published only by `Goal.failOpen` (`packages/codo/src/session/goal.ts:325-341`, `lastVerdict: {ok:true, reason:"judge error", error:true, ...}`).
So the judge call THREW (`JudgeError`, transport-level), caught at `goal.ts:608` (`Effect.catchTag("SessionGoalJudgeError")`).
Not a wrong verdict — a thrown judge call on a 2-message transcript, worker+judge both Muse Spark 1.3 Free.

## 1. Every JudgeError construction site (goal.ts) + plausibility on this transcript
- `goal.ts:450` — `judgeFromText`: `generateText(...).then(r=>r.text)` rejects → `new JudgeError({cause:error})`. PLAUSIBLE (#2). Hit when: structured path's `safeParse` failed first (weak-model non-JSON) so fallback ran, then fallback transport failed (429/5xx/flake on 2nd rapid call), or text path taken directly (`toolcall===false`) and rejected. Earlier "round-3 flake after two verdicts" fits 429 on Nth rapid call.
- `goal.ts:504` — `runJudge` non-OAuth `generateObject(params)` rejects → `JudgeError`. MOST PLAUSIBLE (#1). `capabilities.toolcall` defaults TRUE (`provider.ts:1178`: `toolcall: model.tool_call ?? true`), so an unknown free-tier proxy id almost certainly takes the `generateObject` path (`goal.ts:466` text-first branch NOT taken). A proxy without structured-output/response_format support 400s here → immediate JudgeError BEFORE the text fallback (fallback at `goal.ts:507-508` only runs on `safeParse` failure, not on rejection). Transcript size irrelevant — capability mismatch fails even a joke turn.
- `goal.ts:495` — OAuth `streamObject` path rejects (incl. `throw part.error` at line 491; note `onError: ()=>{}` at 488 swallows mid-stream callback) → `JudgeError`. IMPLAUSIBLE here (requires `resolved.providerID==="openai" && oauth`, lines 356/478; Muse Spark Free is not that).
- `goal.ts:561-563` — guard second-violation: `new JudgeError({cause: new Error("goal judge returned unverifiable verdicts twice")})`. POSSIBLE (#3) but requires TWO successful non-throwing calls both failing Rules A/B/C (`isUnverifiableVerdict`, lines 173-187). Needs two "transcript-integrity check" warnings first (lines 549/557). Less likely than a straight transport 400 on a weak model.
- Confirmed NO parse-throw remains: `goal.ts:497,506` use `Verdict.safeParse`; `judgeFromText` uses `parseVerdictText` (lines 88-97, `decodeUnknownOption` + `safeParse`, returns `undefined`) → synthesized not-ok default (lines 454-460, `produced:false`) which BYPASSES the guard (line 539). Empty/refusal/truncated output → `pending`, never throw.
- NOT JudgeError but taxonomy-relevant: `goal.ts:349` `provider.getModel` → `ModelNotFoundError` (fail-closed, propagates through `gate` signature line 255); `goal.ts:355` `auth.get(...).pipe(Effect.orDie)` → defect/die (fail-closed). `maxOutputTokens` (lines 438/471 via `transform.ts:1369`) can't throw on a trivial transcript (truncation → default, not throw).

## 2. Debug evidence that discriminates (one run)
- `goal.ts:396` DEBUG `goal judge transcript` {condition, messageCount, messages} — proves what the judge actually read.
- `goal.ts:378` WARN `goal judge input dropped empty assistant turns` {condition, dropped} — `dropped>0` on a joke turn = blind-judge setup (`ensureNonEmptyContent`, `transform.ts:526-538`, drops empty assistant turns).
- `goal.ts:549` WARN `...retrying once` {condition, reason} and `goal.ts:557` WARN `...twice` {condition, reason} — presence = guard path (Rules A/B/C), absence + error = transport path.
- `goal.ts:525` WARN `ok verdict cites only non-assistant evidence` (met observability, advisory only).
- `goal.ts:592` INFO `goal judge evaluating` {session.id, condition, attempt} — identifies the STALE condition being judged on the joke turn.
- `goal.ts:610` WARN `goal judge failed; allowing stop` {session.id, attempt} — CURRENTLY DISCARDS THE CAUSE (catchTag at 608 ignores it). This is the missing evidence; it must log error name/message/status to discriminate 400-vs-429-vs-5xx.
- Enable: `--log-level debug` / `CODO_LOG_LEVEL=debug` (`packages/codo/src/index.ts:60-71`, `temporary.ts:17-28` → `process.env.CODO_LOG_LEVEL`; `Effect.logDebug` at 396 only shows at debug).

## 3. Mimo comparison — BLOCKED, read as hypotheses
`D:\MiMo-Code-main\packages\opencode\src\session\` was listed (contains `goal.ts`) but file reads were denied by sandbox `external_directory` policy, so no Mimo line quotes. COdo-side facts framing the diff to check in Mimo's `goal.ts` / `prompt.ts` / `retry.ts` / TUI route:
- (a) Judge model: COdo reuses the WORKER model (`prompt.ts:1186-1191` passes `lastUser.model` into `gate` → `evaluate`). If Mimo uses a dedicated stronger judge model, weak-worker turns still judge fine.
- (b) Call shape: COdo `generateObject`-first with one `generateText` fallback only on safeParse-fail (`goal.ts:463-509`); rejection skips fallback. If Mimo is text-first / try-except-fallback-on-rejection, structured-unsupported models succeed there and throw here.
- (c) Retry: COdo judge has NO backoff/429 handling — `SessionRetry.policy` (`retry.ts:176-199`, `delay` 35-66, `retryable` 68-152) is wired only into the worker stream (`processor.ts:994-1025`); `goal.ts` never imports it. Guard retry (545-553) covers only unverifiable verdicts. If Mimo retries 429/5xx with backoff, flakes succeed there and fail-open here.
- (d) Temperature/capability: COdo `temperature(resolved)` (`transform.ts:541-558`, unknown ids → `undefined`) and `structuredOutputOptions` (`transform.ts:1364-1367`, only default-strict SDKs) + `toolcall ?? true` default (`provider.ts:1178`). Any Mimo-side allowlist/capability detection avoids the 400.
- (e) TUI: COdo renders a scary persistent `Judge: error (stopped)` (`index.tsx:1592`, reason `judge error` from `failOpen`). If Mimo silently allows stop, same backend flake is invisible there.

## 4. Stale-goal verdict: judging this turn is working-as-designed, not a lifecycle bug
- Set: `prompt.ts:1506-1521` (`/goal <cond>` arms `{condition, agent}`, condition text becomes the turn prompt).
- Clear: `prompt.ts:1508-1509` (`/goal clear|reset|empty`), `compaction.ts:310-316` (any compaction clears), `goal.ts:340` (failOpen), `goal.ts:630/638` (satisfied/impossible), `goal.ts:589` (exhausted at >20).
- Foreign-agent turns return `foreign`, goal stays armed (`goal.ts:575-581`).
- Gate runs on EVERY about-to-stop turn with a stored goal for that agent (`prompt.ts:1180-1192`) — no relevance/triviality pre-check.
- State is `InstanceState` memory (`goal.ts:290-296`), cleared on teardown — a restart LOSES the goal, so the joke-turn judge implies a goal armed earlier in the SAME session/instance (excerpt just doesn't show the `/goal` turn), never cleared/satisfied. Correct per current design; questionable UX. Fix with pre-flight, not lifecycle repair.

## 5. Retry/backoff audit: single-attempt + single-guard-retry is the whole story
- Judge transport calls: one `generateObject` attempt (502-505), one `generateText` attempt per fallback entry (433-451). No `SessionRetry`, no 429/5xx discrimination, no backoff import in `goal.ts`.
- The only judge retry (545-553) is guard-only (unverifiable verdicts), not transport. Transport `JudgeError` → immediate `catchTag` → `failOpen` (608-617).
- Worker path DOES have full retry-with-backoff (`processor.ts:994` + `retry.ts:delay/retryable/policy`). Judge bypasses it entirely.

## 6. Fix plan (ranked; keep ModelNotFound loud + auth orDie)
1. Fall back to text on generateObject REJECTION (not just safeParse-fail): try structured, on throw run `judgeFromText`, JudgeError only if both fail. Makes weak models succeed.
2. Retry-with-backoff on retryable transport errors (429/5xx/timeout) reusing `SessionRetry.retryable/delay` with error-code discrimination; keep ModelNotFound fail-closed, auth defect.
3. Capability detection: fix `toolcall ?? true` default (`provider.ts:1178`) or add explicit structured-output capability so unsupported models take the existing text-first branch (`goal.ts:466`) without a wasted 400.
4. Dedicated stronger judge model default/override (config `judge.model`), decoupled from free-tier worker model.
5. Relevance/triviality pre-flight (skip judging when transcript is goal-irrelevant) — semantics change, rank lower.
6. Observability first: log the JudgeError cause (name/message/statusCode/headers) in the `goal.ts:610` warning path — prerequisite to validate 1-4.
7. TUI: soften `index.tsx:1592` only AFTER errors become rare; while failing every turn the loud line is the correct signal.
