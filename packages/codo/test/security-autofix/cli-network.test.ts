import { describe, expect, test } from "bun:test"
import { requiresPassword } from "../../src/cli/network"

// Anything beyond loopback exposes the API to the network; requiresPassword is
// the gate that refuses to start such a listener without CODO_SERVER_PASSWORD.
describe("requiresPassword", () => {
  test("loopback listeners need no password", () => {
    expect(requiresPassword("127.0.0.1")).toBe(false)
    expect(requiresPassword("localhost")).toBe(false)
    expect(requiresPassword("::1")).toBe(false)
  })

  test("loopback check is case-insensitive", () => {
    expect(requiresPassword("LOCALHOST")).toBe(false)
    expect(requiresPassword("LocalHost")).toBe(false)
  })

  test("network-exposed listeners require a password", () => {
    expect(requiresPassword("0.0.0.0")).toBe(true)
    expect(requiresPassword("192.168.1.10")).toBe(true)
    expect(requiresPassword("10.0.0.5")).toBe(true)
    expect(requiresPassword("172.16.0.2")).toBe(true)
    expect(requiresPassword("example.com")).toBe(true)
  })

  test("mDNS domains are network-exposed regardless of case", () => {
    expect(requiresPassword("COdo.local")).toBe(true)
    expect(requiresPassword("codo.local")).toBe(true)
    expect(requiresPassword("CODO.LOCAL")).toBe(true)
  })
})
