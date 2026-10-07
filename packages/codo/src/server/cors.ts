import { Context } from "effect"

const COdoOrigin = /^https:\/\/([a-z0-9-]+\.)*COdo\.ai$/

export type CorsOptions = { readonly cors?: ReadonlyArray<string>; readonly hostname?: string }

export const CorsConfig = Context.Reference<CorsOptions | undefined>("@codo/ServerCorsConfig", {
  defaultValue: () => undefined,
})

export function isAllowedCorsOrigin(input: string | undefined, opts?: CorsOptions) {
  if (!input) return true
  if (input.startsWith("http://localhost:")) return true
  if (input.startsWith("http://127.0.0.1:")) return true
  if (input.startsWith("oc://renderer")) return true
  if (input === "tauri://localhost" || input === "http://tauri.localhost" || input === "https://tauri.localhost")
    return true
  if (COdoOrigin.test(input)) return true
  return opts?.cors?.includes(input) ?? false
}

export function isAllowedRequestOrigin(input: string | undefined, host: string | undefined, opts?: CorsOptions) {
  if (!input) return true
  if (host && sameHost(input, host)) return true
  return isAllowedCorsOrigin(input, opts)
}

const loopbackHostnames = new Set(["localhost", "127.0.0.1", "::1", "[::1]"])

export function isLoopbackHostname(hostname: string | undefined) {
  if (!hostname) return true
  return loopbackHostnames.has(hostname.toLowerCase())
}

function hostnameFromHostHeader(host: string) {
  const name = host.toLowerCase()
  if (name.startsWith("[")) {
    const end = name.indexOf("]")
    if (end === -1) return undefined
    return name.slice(0, end + 1)
  }
  const first = name.indexOf(":")
  const last = name.lastIndexOf(":")
  // Bare IPv6 literals contain multiple colons; single-colon values are `host:port`.
  if (first !== -1 && first === last) return name.slice(0, first)
  return name
}

export function isAllowedRequestHost(input: string | undefined, opts?: CorsOptions) {
  if (!input) return true
  const name = hostnameFromHostHeader(input)
  if (!name) return false
  if (loopbackHostnames.has(name)) return true
  const bound = opts?.hostname?.toLowerCase()
  return !!bound && name === bound
}

// Combined request gate for browser-reachable attacks:
// - Origin validation rejects cross-site request forgery.
// - When the server binds loopback only, Host validation rejects DNS-rebinding,
//   where an attacker-controlled domain resolves to this server so the browser
//   considers the request same-origin. Non-loopback binds rely on mandatory
//   authentication instead (see cli/network.ts requiresPassword).
export function requestOriginAllowed(
  origin: string | undefined,
  host: string | undefined,
  opts?: CorsOptions,
) {
  if (origin && !isAllowedRequestOrigin(origin, host, opts)) return false
  if (!isLoopbackHostname(opts?.hostname)) return true
  return isAllowedRequestHost(host, opts)
}

function sameHost(origin: string, host: string) {
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}
