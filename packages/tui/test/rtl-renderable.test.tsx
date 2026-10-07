import { testRender } from "@opentui/solid"
import { RtlPolicyProvider, RtlText } from "../src/component/rtl-text"
import { expect, test } from "bun:test"
import { RtlTextRenderable } from "../src/rtl-renderable"
import { RGBA, Selection, StyledText, TextAttributes, TextRenderable } from "@opentui/core"
import { createSignal } from "solid-js"

function rtlNode(app: { renderer: { root: { findDescendantById(id: string): unknown } } }, id: string) {
  const node = app.renderer.root.findDescendantById(id)
  if (!(node instanceof RtlTextRenderable)) throw new Error(`Missing rtl_text ${id}`)
  return node
}

test("wrapper registers the renderer and forwards styled children and refs", async () => {
  let ref: TextRenderable | undefined
  const app = await testRender(() => (
    <RtlPolicyProvider forceShaping={true}>
      <RtlText id="styled" width={10} fg="#ff0000" ref={(node) => { ref = node }}>
        <b>مر</b><a href="https://github.com/anomalyco/codo/issues">حبا</a>
      </RtlText>
    </RtlPolicyProvider>
  ), { width: 10, height: 3 })
  try {
    await app.renderOnce()
    const node = rtlNode(app, "styled")
    expect(ref).toBe(node)
    expect(app.captureCharFrame().split("\n")[0]).toBe("     ﺎﺒﺣﺮﻣ")
    expect(node.logicalText).toBe("مرحبا")
    expect(node.visualLayout.chunks.filter((chunk) => chunk.attributes === TextAttributes.BOLD).map((chunk) => chunk.text).join("")).toBe("ﺮﻣ")
    expect(node.visualLayout.chunks.filter((chunk) => chunk.link).map((chunk) => chunk.text).join("")).toBe("ﺎﺒﺣ")
    expect(node.visualLayout.chunks.filter((chunk) => chunk.fg).every((chunk) => chunk.fg?.equals(RGBA.fromHex("#ff0000")))).toBe(true)
  } finally {
    app.renderer.destroy()
  }
})

test.each([
  { force: true, program: "kitty", shaped: true },
  { force: false, program: "unknown", shaped: false },
  { force: "auto", program: "kitty", shaped: false },
  { force: "auto", program: "iTerm.app", shaped: false },
  { force: "auto", program: "unknown", shaped: true },
  { force: undefined, program: "kitty", shaped: false },
] as const)("policy matrix", async ({ force, program, shaped }) => {
  const env = { ...process.env }
  try {
    process.env.TERM_PROGRAM = program
    process.env.TERM = "xterm-256color"
    delete process.env.ITERM_SESSION_ID
    delete process.env.KITTY_WINDOW_ID
    const app = await testRender(() => (
      <RtlPolicyProvider forceShaping={force}>
        <RtlText id="policy" width={10}>مرحبا</RtlText>
      </RtlPolicyProvider>
    ), { width: 10, height: 2 })
    try {
      await app.renderOnce()
      const node = rtlNode(app, "policy")
      expect(node.plainText).toBe(shaped ? "     ﺎﺒﺣﺮﻣ" : "مرحبا")
      expect(node.logicalText).toBe("مرحبا")
    } finally {
      app.renderer.destroy()
    }
  } finally {    for (const key of ["TERM_PROGRAM", "TERM", "ITERM_SESSION_ID", "KITTY_WINDOW_ID"]) {
      if (env[key] === undefined) delete process.env[key]
      else process.env[key] = env[key]
    }
  }
})

test.each(["none", "char", "word"] as const)("native parity for English and disabled RTL with %s wrapping", async (wrapMode) => {
  const [value, setValue] = createSignal("English words with a long tail")
  const [force, setForce] = createSignal(false)
  const [truncate, setTruncate] = createSignal(false)
  const app = await testRender(() => (
    <box flexDirection="column">
      <box height={5} flexShrink={0}>
        <text id="native" wrapMode={wrapMode} truncate={truncate()}><b>{value()}</b></text>
      </box>
      <box height={5} flexShrink={0}>
        <RtlPolicyProvider forceShaping={force()}>
          <RtlText id="parity" wrapMode={wrapMode} truncate={truncate()}><b>{value()}</b></RtlText>
        </RtlPolicyProvider>
      </box>
    </box>
  ), { width: 8, height: 10 })
  try {
    const native = app.renderer.root.findDescendantById("native")
    if (!(native instanceof TextRenderable)) throw new Error("Missing native text")
    const node = rtlNode(app, "parity")
    for (const text of ["English words with a long tail", "مرحبا مرحبا مرحبا", "English again"]) {
      setValue(text)
      setForce(text === "English again")
      for (const truncated of [false, true]) {
        setTruncate(truncated)
        for (const width of [8, 12]) {
          app.resize(width, 10)
          await app.renderOnce()
          const lines = app.captureCharFrame().split("\n")
          expect(lines.slice(0, 5)).toEqual(lines.slice(5, 10))
          expect([node.width, node.height, node.lineInfo]).toEqual([native.width, native.height, native.lineInfo])
          expect(node.plainText).toBe(native.plainText)
          for (const target of [native, node]) {
            const selection = new Selection(target, { x: target.x, y: target.y }, { x: target.x + 4, y: target.y })
            selection.isActive = true
            target.onSelectionChanged(selection)
          }
          expect(node.getSelectedText()).toBe(native.getSelectedText())
        }
      }
    }
    native.clear()
    node.clear()
    await app.renderOnce()
    expect(node.plainText).toBe(native.plainText)
  } finally {
    app.renderer.destroy()
  }
})

test("reactive children invalidate measurement and policy is local and reversible", async () => {  const [value, setValue] = createSignal("مرحبا")
  const [force, setForce] = createSignal<boolean | "auto">(true)
  const app = await testRender(() => (
    <box>
      <RtlPolicyProvider forceShaping={force()}>
        <RtlText id="reactive" wrapMode="char"><b>{value()}</b></RtlText>
        <RtlPolicyProvider forceShaping={false}>
          <RtlText id="disabled">مرحبا</RtlText>
        </RtlPolicyProvider>
      </RtlPolicyProvider>
    </box>
  ), { width: 6, height: 8 })
  try {
    await app.renderOnce()
    const node = rtlNode(app, "reactive")
    const disabled = rtlNode(app, "disabled")
    expect(node.height).toBe(1)
    setValue("مرحبا مرحبا")
    await app.renderOnce()
    expect(node.height).toBe(2)
    expect(node.plainText).toBe(" ﺎﺒﺣﺮﻣ\n ﺎﺒﺣﺮﻣ")
    expect(disabled.plainText).toBe("مرحبا")
    setForce(false)
    await app.renderOnce()
    expect(node.plainText).toBe("مرحبا مرحبا")
    setForce(true)
    await app.renderOnce()
    expect(node.plainText).toBe(" ﺎﺒﺣﺮﻣ\n ﺎﺒﺣﺮﻣ")
    app.resize(12, 8)
    await app.renderOnce()
    expect(node.height).toBe(1)
    expect(node.plainText).toBe(" ﺎﺒﺣﺮﻣ ﺎﺒﺣﺮﻣ")
    const selection = new Selection(node, { x: 0, y: 0 }, { x: 12, y: 0 })
    selection.isActive = true
    node.onSelectionChanged(selection)
    expect(node.getSelectedText()).toBe("مرحبا مرحبا")
    setValue("plain English")
    await app.renderOnce()
    expect(node.plainText).toBe("plain English")
    setValue("مرحبا")
    await app.renderOnce()
    expect(node.plainText).toBe("       ﺎﺒﺣﺮﻣ")
    node.clear()
    await app.renderOnce()
    expect(node.plainText).toBe("")
  } finally {
    app.renderer.destroy()
  }
})

test("explicit styled content remains logical through streaming and resizing", async () => {
  const source = new StyledText([
    { __isChunk: true, text: "مر", attributes: TextAttributes.BOLD },
    { __isChunk: true, text: "حبا", link: { url: "https://github.com/anomalyco/codo/issues" } },
  ])
  const [value, setValue] = createSignal<StyledText | string>(source)
  let ref: TextRenderable | undefined
  const app = await testRender(() => (
    <RtlPolicyProvider forceShaping={true}>
      <RtlText id="content" content={value()} ref={ref} />
    </RtlPolicyProvider>
  ), { width: 10, height: 4 })
  try {
    await app.renderOnce()
    const node = rtlNode(app, "content")
    expect(ref).toBe(node)
    expect(node.content).toBe(source)
    expect(node.chunks.map((chunk) => chunk.text)).toEqual(["مر", "حبا"])
    expect(node.plainText).toBe("     ﺎﺒﺣﺮﻣ")
    expect(node.visualLayout.chunks.filter((chunk) => chunk.link).map((chunk) => chunk.text).join("")).toBe("ﺎﺒﺣ")
    setValue("مرحبا مرحبا")
    await app.renderOnce()
    expect(node.logicalText).toBe("مرحبا مرحبا")
    app.resize(12, 4)
    await app.renderOnce()
    expect(node.plainText).toBe(" ﺎﺒﺣﺮﻣ ﺎﺒﺣﺮﻣ")
    expect(source.chunks.map((chunk) => chunk.text)).toEqual(["مر", "حبا"])
  } finally {
    app.renderer.destroy()
  }
})

test("fallback to logical restores current styles, not stale gathered chunks", async () => {
  const app = await testRender(() => (
    <RtlPolicyProvider forceShaping={true}>
      <RtlText id="stale" width={10}>مرحبا</RtlText>
    </RtlPolicyProvider>
  ), { width: 10, height: 2 })
  try {
    await app.renderOnce()
    const node = rtlNode(app, "stale")
    expect(node.plainText).toBe("     ﺎﺒﺣﺮﻣ")
    node.fg = "#00ff00"
    node.forceShaping = false
    await app.renderOnce()
    expect(node.plainText).toBe("مرحبا")
    const spans = app.captureSpans().lines[0].spans
    expect(spans.some((span) => span.text.includes("م") && span.fg.equals(RGBA.fromHex("#00ff00")))).toBe(true)
  } finally {
    app.renderer.destroy()
  }
})

test("native selection copies logical Arabic", async () => {
  const app = await testRender(() => <rtl_text forceShaping={true} id="copy" width={10} height={1}>مرحبا</rtl_text>, { width: 10, height: 2 })
  try {
    await app.renderOnce()
    const node = rtlNode(app, "copy")
    const selection = new Selection(node, { x: 5, y: 0 }, { x: 10, y: 0 })
    selection.isActive = true
    node.onSelectionChanged(selection)
    expect(node.getSelectedText()).toBe("مرحبا")
  } finally {
    app.renderer.destroy()
  }
})

test("streaming content updates reflow without shaping raw input", async () => {
  const app = await testRender(() => <rtl_text forceShaping={true} id="stream" width={10} height={1}>مرحبا</rtl_text>, { width: 10, height: 2 })
  try {
    await app.renderOnce()
    const node = rtlNode(app, "stream")
    const before = node.logicalText
    node.content = "abc אבג"
    await app.renderOnce()
    expect(app.captureCharFrame().split("\n")[0]).toBe("abc גבא   ")
    expect(before).toBe("مرحبا")
    expect(node.getSelectedText()).toBe("")
    node.content = "مرحبا"
    await app.renderOnce()
    expect(app.captureCharFrame().split("\n")[0]).toBe("     \ufe8e\ufe92\ufea3\ufeae\ufee3")
  } finally {
    app.renderer.destroy()
  }
})

test("resize re-pads and re-wraps from the same logical text", async () => {
  const app = await testRender(
    () => (
      <rtl_text forceShaping={true} id="wrap" wrapMode="char">
        مرحبا مرحبا
      </rtl_text>
    ),
    { width: 6, height: 4 },
  )
  try {
    await app.renderOnce()
    expect(app.captureCharFrame().split("\n").slice(0, 2)).toEqual([
      " ﺎﺒﺣﺮﻣ",
      " ﺎﺒﺣﺮﻣ",
    ])
    const node = rtlNode(app, "wrap")
    expect(node.width).toBe(6)
    app.resize(12, 4)
    await app.renderOnce()
    expect(node.width).toBe(12)
    expect(app.captureCharFrame().split("\n")[0].trimEnd()).toBe(" ﺎﺒﺣﺮﻣ ﺎﺒﺣﺮﻣ")
    expect(node.logicalText).toBe("مرحبا مرحبا")
    expect(node.visualLayout.lines).toHaveLength(1)
  } finally {
    app.renderer.destroy()
  }
})

test("renders exact shaped Arabic through a TextRenderable subclass", async () => {
  const app = await testRender(() => <rtl_text forceShaping={true} width={10} height={1}>مرحبا</rtl_text>, { width: 10, height: 2 })
  try {
    await app.renderOnce()
    expect(app.captureCharFrame().split("\n")[0]).toBe("     \ufe8e\ufe92\ufea3\ufeae\ufee3")
  } finally {
    app.renderer.destroy()
  }
})
