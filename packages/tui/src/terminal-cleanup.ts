/**
 * Terminal cleanup for mouse tracking and alt-screen.
 *
 * Single source of truth for the teardown sequence. On Windows/PowerShell a
 * leaked mouse-tracking subscription floods the user shell with raw SGR
 * sequences (`[555;62;13M`) every time the mouse moves, so every exit path
 * must run this deterministically.
 *
 * opentui#20458 tracks the underlying ordering bug: the library's own
 * `cleanupBeforeDestroy` re-enables echo before it disables mouse tracking,
 * so events arriving in the gap get echoed. We can't rely on the library to
 * order itself, so we belt-and-suspenders it here.
 */

import { win32FlushInputBuffer } from "./terminal-win32"

export const TERMINAL_MOUSE_OFF_SEQUENCE =
  "\x1b[?1049l" + // leave alt screen
  "\x1b[?1000l" + // X10 mouse tracking off
  "\x1b[?1002l" + // button-event tracking off
  "\x1b[?1003l" + // any-event tracking off
  "\x1b[?1006l" + // SGR extended mode off
  "\x1b[?1015l" + // urxvt extended mode off
  "\x1b[?1016l" // SGR pixels off

let cleanupRan = false

/**
 * Idempotent. Writes to both streams so whichever one is attached to the
 * console actually receives the sequence. On win32 also drains any pending
 * mouse input so a final event isn't delivered after tracking is disabled.
 */
export function forceTerminalCleanup() {
  if (cleanupRan) return
  cleanupRan = true

  win32FlushInputBuffer()

  for (const out of [process.stderr, process.stdout]) {
    try {
      out.write(TERMINAL_MOUSE_OFF_SEQUENCE)
    } catch {
      // Console may already be half-closed; ignore.
    }
  }
}

/** Reset internal latch — exposed for tests. */
export function resetTerminalCleanupForTests() {
  cleanupRan = false
}
