import { base64Encode } from "@codo-ai/core/util/encode"
import { useNavigate, useSearchParams } from "@solidjs/router"
import { createMemo } from "solid-js"
import type { PromptProjectControls } from "@/components/prompt-project-selector"
import { useDirectoryPicker } from "@/components/directory-picker"
import { useGlobal } from "@/context/global"
import { useLayout } from "@/context/layout"
import { serverName, ServerConnection, useServer } from "@/context/server"
import { useSDK } from "@/context/sdk"
import { useTabs } from "@/context/tabs"

export function createPromptProjectControls() {
  const navigate = useNavigate()
  const layout = useLayout()
  const server = useServer()
  const sdk = useSDK()
  const tabs = useTabs()
  const global = useGlobal()
  const pickDirectory = useDirectoryPicker()
  const [search] = useSearchParams<{ draftId?: string }>()
  const projectServer = () => server.current
  const projectServerCtx = createMemo(() => {
    const conn = projectServer()
    if (!conn) return undefined
    return global.createServerCtx(conn)
  })
  const projects = createMemo(() => {
    if (server.list.length <= 1) {
      return search.draftId ? (projectServerCtx()?.projects.list() ?? []) : layout.projects.list()
    }
    return server.list.flatMap((conn) => {
      const item = { key: ServerConnection.key(conn), name: serverName(conn) }
      return global
        .createServerCtx(conn)
        .projects.list()
        .map((project) => ({ ...project, server: item }))
    })
  })
  const selectProject = (worktree: string, serverKey?: string) => {
    const conn = serverKey ? server.list.find((conn) => ServerConnection.key(conn) === serverKey) : projectServer()
    if (search.draftId) {
      if (!conn) return
      const target = global.createServerCtx(conn)
      target.projects.open(worktree)
      target.projects.touch(worktree)
      tabs.updateDraft(search.draftId, { server: ServerConnection.key(conn), directory: worktree })
      return
    }

    if (!serverKey) {
      layout.projects.open(worktree)
      server.projects.touch(worktree)
      navigate(`/${base64Encode(worktree)}/session`)
      return
    }

    if (!conn) return
    const target = global.createServerCtx(conn)
    target.projects.open(worktree)
    target.projects.touch(worktree)
    server.setActive(ServerConnection.key(conn))
    navigate(`/${base64Encode(worktree)}/session`)
  }

  const addProject = (title: string, serverKey?: string) => {
    const conn = serverKey ? server.list.find((conn) => ServerConnection.key(conn) === serverKey) : projectServer()
    if (!conn) return
    pickDirectory({
      server: conn,
      title,
      onSelect: (result) => {
        const directory = Array.isArray(result) ? result[0] : result
        if (directory) selectProject(directory, serverKey)
      },
    })
  }

  const activeServerKey = createMemo(() => {
    if (server.list.length <= 1) return undefined
    const conn = projectServer()
    if (!conn) return undefined
    return ServerConnection.key(conn)
  })

  return createMemo<PromptProjectControls>(() => ({
    available: projects(),
    directory: sdk.directory,
    server: activeServerKey(),
    select: selectProject,
    add: addProject,
  }))
}
