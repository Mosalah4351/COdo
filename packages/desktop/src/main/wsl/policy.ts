import type { WslDistroProbe, WslCOdoCheck, WslServerItem } from "../../preload/types"

export function wslServerIdToRestart(servers: WslServerItem[], distro: string) {
  return servers.find((item) => item.config.distro === distro)?.config.id
}

export function clearWslDistroState(
  distroProbes: Record<string, WslDistroProbe>,
  COdoChecks: Record<string, WslCOdoCheck>,
  distro: string,
) {
  const nextDistroProbes = { ...distroProbes }
  const nextCOdoChecks = { ...COdoChecks }
  delete nextDistroProbes[distro]
  delete nextCOdoChecks[distro]
  return { distroProbes: nextDistroProbes, COdoChecks: nextCOdoChecks }
}

export function wslTerminalArgs(distro?: string | null) {
  return ["/c", "start", "", "wsl", ...(distro ? ["-d", distro] : [])]
}

export function requireWslIpcString(name: string, value: unknown) {
  if (typeof value === "string" && value.length > 0) return value
  throw new Error(`Invalid ${name}`)
}
