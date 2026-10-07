import { describe, expect, test } from "bun:test"
import {
  isAllowedRequestHost,
  isAllowedRequestOrigin,
  isLoopbackHostname,
  requestOriginAllowed,
} from "../../src/server/cors"

describe("isLoopbackHostname", () => {
  test("accepts loopback names and missing hostname (default bind)", () => {
    expect(isLoopbackHostname(undefined)).toBe(true)
    expect(isLoopbackHostname("localhost")).toBe(true)
    expect(isLoopbackHostname("127.0.0.1")).toBe(true)
    expect(isLoopbackHostname("::1")).toBe(true)
    expect(isLoopbackHostname("[::1]")).toBe(true)
  })

  test("is case-insensitive", () => {
    expect(isLoopbackHostname("LOCALHOST")).toBe(true)
    expect(isLoopbackHostname("LocalHost")).toBe(true)
  })

  test("rejects non-loopback names including the wildcard bind", () => {
    expect(isLoopbackHostname("evil.com")).toBe(false)
    expect(isLoopbackHostname("0.0.0.0")).toBe(false)
    expect(isLoopbackHostname("[fe80::1]")).toBe(false)
  })
})

describe("isAllowedRequestHost", () => {
  test("allows a missing Host header", () => {
    expect(isAllowedRequestHost(undefined)).toBe(true)
  })

  test("strips the port from host headers before checking", () => {
    expect(isAllowedRequestHost("localhost:4096")).toBe(true)
    expect(isAllowedRequestHost("127.0.0.1:4096")).toBe(true)
  })

  test("parses bare IPv6 and bracketed IPv6 with port", () => {
    expect(isAllowedRequestHost("::1")).toBe(true)
    expect(isAllowedRequestHost("[::1]:4096")).toBe(true)
    // Bracket parsing must not treat ":4096" as part of an IPv6 name.
    expect(isAllowedRequestHost("[fe80::1]:4096")).toBe(false)
  })

  test("rejects DNS-rebound hosts on loopback binds", () => {
    const rebound = "evil.com:4096"
    expect(isAllowedRequestHost(rebound)).toBe(false)
    expect(isAllowedRequestHost(rebound, { hostname: "127.0.0.1" })).toBe(false)
    expect(isAllowedRequestHost(rebound, { hostname: undefined })).toBe(false)
  })

  test("matches explicit non-loopback binds case-insensitively", () => {
    expect(isAllowedRequestHost("EVIL.com:4096", { hostname: "evil.com" })).toBe(true)
    expect(isAllowedRequestHost("other.com:8080", { hostname: "evil.com" })).toBe(false)
  })
})

describe("isAllowedRequestOrigin", () => {
  test("allows requests without an Origin header", () => {
    expect(isAllowedRequestOrigin(undefined, "localhost:4096")).toBe(true)
  })

  test("accepts local development, tauri, renderer, and COdo origins", () => {
    expect(isAllowedRequestOrigin("http://localhost:3000")).toBe(true)
    expect(isAllowedRequestOrigin("http://127.0.0.1:3000")).toBe(true)
    expect(isAllowedRequestOrigin("tauri://localhost")).toBe(true)
    expect(isAllowedRequestOrigin("http://tauri.localhost")).toBe(true)
    expect(isAllowedRequestOrigin("https://tauri.localhost")).toBe(true)
    expect(isAllowedRequestOrigin("oc://renderer/index.html")).toBe(true)
    expect(isAllowedRequestOrigin("https://app.COdo.ai")).toBe(true)
  })

  test("rejects cross-site origins not present in the allowlist", () => {
    expect(isAllowedRequestOrigin("https://attacker.example", "localhost:4096")).toBe(false)
    expect(isAllowedRequestOrigin("http://evil.com:4096", "localhost:4096")).toBe(false)
    expect(
      isAllowedRequestOrigin("https://attacker.example", "localhost:4096", { cors: ["https://friend.example"] }),
    ).toBe(false)
  })

  test("allows same-host origins even when not on the allowlist", () => {
    expect(isAllowedRequestOrigin("http://localhost:4096", "localhost:4096")).toBe(true)
  })
})

// Regression guard for DNS rebinding + cross-site request forgery against the
// browser-reachable API surface.
describe("requestOriginAllowed", () => {
  test("rejects cross-site origins", () => {
    expect(requestOriginAllowed("https://attacker.example", "localhost:4096", {})).toBe(false)
    expect(requestOriginAllowed("https://attacker.example", undefined, {})).toBe(false)
  })

  test("accepts localhost, tauri, and renderer origins", () => {
    expect(requestOriginAllowed("http://localhost:3000", "localhost:4096", {})).toBe(true)
    expect(requestOriginAllowed("tauri://localhost", "localhost:4096", {})).toBe(true)
    expect(requestOriginAllowed("oc://renderer", "localhost:4096", {})).toBe(true)
  })

  test("rejects DNS-rebound Host when bound to loopback or unknown bind", () => {
    const rebound = { origin: "http://evil.com:4096", host: "evil.com:4096" } as const
    expect(requestOriginAllowed(rebound.origin, rebound.host, {})).toBe(false)
    expect(requestOriginAllowed(rebound.origin, rebound.host, { hostname: "127.0.0.1" })).toBe(false)
    expect(requestOriginAllowed(rebound.origin, rebound.host, { hostname: "localhost" })).toBe(false)
  })

  test("rejects DNS-rebound Host even without an Origin header", () => {
    expect(requestOriginAllowed(undefined, "evil.com:4096", {})).toBe(false)
    expect(requestOriginAllowed(undefined, "evil.com:4096", { hostname: "127.0.0.1" })).toBe(false)
  })

  test("relies on authentication instead of Host checks for non-loopback binds", () => {
    expect(requestOriginAllowed("http://evil.com:4096", "evil.com:4096", { hostname: "0.0.0.0" })).toBe(true)
    expect(requestOriginAllowed(undefined, "evil.com:4096", { hostname: "0.0.0.0" })).toBe(true)
  })

  test("still validates Origin on non-loopback binds", () => {
    expect(requestOriginAllowed("https://attacker.example", "evil.com:4096", { hostname: "0.0.0.0" })).toBe(false)
    // Explicit CORS allowlist entries remain honored on non-loopback binds.
    expect(
      requestOriginAllowed("https://friend.example", "evil.com:4096", {
        hostname: "0.0.0.0",
        cors: ["https://friend.example"],
      }),
    ).toBe(true)
  })
})
