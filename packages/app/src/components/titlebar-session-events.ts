import type { ServerConnection } from "@/context/server"

export const SESSION_TABS_REMOVED_EVENT = "COdo:session-tabs-removed"

export type SessionTabsRemovedDetail = {
  /** Server whose tabs should be closed. Kept in the detail, but the tab-strip applies removals against the currently selected server — this is informational. */
  server: ServerConnection.Key
  directory: string
  sessionIDs: string[]
}

export function notifySessionTabsRemoved(input: SessionTabsRemovedDetail) {
  window.dispatchEvent(new CustomEvent(SESSION_TABS_REMOVED_EVENT, { detail: input }))
}

export function readSessionTabsRemovedDetail(event: Event): SessionTabsRemovedDetail | undefined {
  if (!(event instanceof CustomEvent)) return undefined

  const detail: unknown = event.detail
  if (!detail || typeof detail !== "object") return undefined
  if (!("server" in detail)) return undefined
  if (!("directory" in detail)) return undefined
  if (!("sessionIDs" in detail)) return undefined
  if (typeof detail.server !== "string") return undefined
  if (typeof detail.directory !== "string") return undefined
  if (!Array.isArray(detail.sessionIDs)) return undefined

  const sessionIDs = detail.sessionIDs.filter((id): id is string => typeof id === "string")
  if (sessionIDs.length === 0) return undefined

  return {
    server: detail.server as ServerConnection.Key,
    directory: detail.directory,
    sessionIDs,
  }
}
