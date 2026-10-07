import { describe, expect, test } from "bun:test"
import { render } from "bidi-shaper"
import { hasRtl, shouldShape, visualText } from "../../src/util/rtl"

const native = [
  { TERM_PROGRAM: "iTerm.app" },
  { TERM_PROGRAM: "iTerm2" },
  { ITERM_SESSION_ID: "session" },
  { TERM_PROGRAM: "kitty" },
  { TERM_PROGRAM: "KITTY" },
  { TERM: "xterm-kitty" },
  { KITTY_WINDOW_ID: "0" },
]
const fallback = [
  {},
  { WT_SESSION: "session" },
  { TERM_PROGRAM: "WezTerm" },
  { WEZTERM_PANE: "0" },
  { TERM_PROGRAM: "unknown" },
  { TERM: "xterm-256color" },
  { TERM_PROGRAM: "", ITERM_SESSION_ID: "", KITTY_WINDOW_ID: "" },
]

describe("hasRtl", () => {
  test.each([
    "مرحبا",
    "שלום",
    "English العربية 123",
    "\u0750",
    "\u0870",
    "\u08a0",
    "\ufb1d",
    "\ufb50",
    "\ufe70",
    "\u{10800}",
    "\u{10ec2}",
    "\u{1e900}",
    "\u{1ee00}",
  ])("detects RTL in %s", (text) => {
    expect(hasRtl(text)).toBe(true)
  })

  test.each(["", "Hello 123", "café", "日本語", "\u{1f600}", "\u{20000}", "\ufeff"])(
    "leaves non-RTL text %s alone",
    (text) => {
      expect(hasRtl(text)).toBe(false)
    },
  )
})

describe("shouldShape", () => {
  test.each(native)("disables auto shaping for known terminals %j", (env) => {
    expect(shouldShape("auto", env)).toBe(false)
    expect(shouldShape(undefined, env)).toBe(false)
  })

  test.each(fallback)("enables auto shaping for fallback terminals %j", (env) => {
    expect(shouldShape("auto", env)).toBe(true)
    expect(shouldShape(undefined, env)).toBe(true)
  })

  test.each([...native, ...fallback])("explicit overrides win for %j", (env) => {
    expect(shouldShape(true, env)).toBe(true)
    expect(shouldShape(false, env)).toBe(false)
  })

  test("defaults to the process environment", () => {
    expect(shouldShape()).toBe(shouldShape("auto", process.env))
  })
})

describe("visualText", () => {
  test.each(["مرحبا", "שלום", "Hello مرحبا 123", "مرحبا\nשלום", "\u{1ee00}"])(
    "renders RTL using bidi-shaper: %s",
    (text) => {
      expect(visualText(text, true, {})).toBe(render(text))
      expect(visualText(text, "auto", {})).toBe(render(text))
      expect(visualText(text, false, {})).toBe(text)
    },
  )

  test("reorders Hebrew into visual order", () => {
    expect(visualText("שלום", true)).toBe("םולש")
  })

  test.each(native)("preserves logical text in native terminals %j", (env) => {
    expect(visualText("مرحبا", "auto", env)).toBe("مرحبا")
    expect(visualText("مرحبا", true, env)).toBe(render("مرحبا"))
  })

  test.each(["", "Hello (world) 123", "日本語", "left\nright"])("preserves non-RTL text %s", (text) => {
    expect(visualText(text, true, {})).toBe(text)
    expect(visualText(text, false, {})).toBe(text)
  })

  test("defaults to automatic shaping in the process environment", () => {
    expect(visualText("שלום")).toBe(visualText("שלום", "auto", process.env))
  })
})
