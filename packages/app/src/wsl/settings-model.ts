import type { WslCOdoCheck, WslServerRuntime } from "./types"

export const wslRuntimeRetryable = (runtime: WslServerRuntime) =>
  runtime.kind === "failed" || runtime.kind === "stopped"

export async function enterWslCOdoStep(
  distro: string,
  probe: (distro: string) => Promise<unknown>,
  select: (step: "COdo") => void,
) {
  await probe(distro)
  select("COdo")
}

export function wslCOdoAction(check?: WslCOdoCheck) {
  if (!check) return
  if (!check.resolvedPath) return "Install COdo"
  if (check.matchesDesktop === false) return "Update COdo"
}
