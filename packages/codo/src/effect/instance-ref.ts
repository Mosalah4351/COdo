import { Context } from "effect"
import type { InstanceContext } from "@/project/instance-context"
import type { WorkspaceV2 } from "@codo-ai/core/workspace"

export const InstanceRef = Context.Reference<InstanceContext | undefined>("~COdo/InstanceRef", {
  defaultValue: () => undefined,
})

export const WorkspaceRef = Context.Reference<WorkspaceV2.ID | undefined>("~COdo/WorkspaceRef", {
  defaultValue: () => undefined,
})
