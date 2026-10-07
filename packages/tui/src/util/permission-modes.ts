import { createSignal } from "solid-js"

// Global permission-mode toggles (like Claude Code's bypass/auto-decide modes).
// Skip-permissions auto-approves every tool permission prompt; Never-ask
// auto-answers agent questions with their first option.

const [skip, setSkip] = createSignal(false)
const [neverAsk, setNeverAsk] = createSignal(false)

export const skipPermissions = skip
export const neverAskMode = neverAsk

export function toggleSkipPermissions(): boolean {
  setSkip((v) => !v)
  return skip()
}

export function toggleNeverAsk(): boolean {
  setNeverAsk((v) => !v)
  return neverAsk()
}

// Guards against double-replying when a prompt component remounts after an
// automatic reply was already sent for the same request.
const replied = new Set<string>()

export function markReplied(requestID: string) {
  replied.add(requestID)
}

export function hasReplied(requestID: string): boolean {
  return replied.has(requestID)
}
