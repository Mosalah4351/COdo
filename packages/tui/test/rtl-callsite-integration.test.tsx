import { expect, test } from "bun:test"
import { CodeRenderable, MarkdownRenderable, Renderable, SyntaxStyle, TextAttributes } from "@opentui/core"
import { testRender } from "@opentui/solid"
import { createSignal } from "solid-js"
import { RtlCodeRenderable, RtlMarkdown } from "../src/component/rtl-content"
import { WriteCode } from "../src/routes/session"
import { RtlPolicyProvider } from "../src/component/rtl-text"
import { reasoningSummary } from "../src/context/thinking"
import { RtlTextRenderable } from "../src/rtl-renderable"

function descendants(node: Renderable): Renderable[] {
  return node.getChildren().flatMap((child) => [child, ...descendants(child)])
}

test("write output keeps its native line-number wrapper across RTL and LTR changes", async () => {
  const style = SyntaxStyle.fromStyles({})
  const [content, setContent] = createSignal("hello\npath/a.ts 123")
  const app = await testRender(() => (
    <RtlPolicyProvider forceShaping={true}>
      <WriteCode lineNumberFg="#888888" conceal={false} fg="#ffffff" syntaxStyle={style} content={content()} />
    </RtlPolicyProvider>
  ), { width: 40, height: 8 })
  try {
    await app.renderOnce()
    expect(descendants(app.renderer.root).find((node) => node instanceof CodeRenderable)).toBeInstanceOf(CodeRenderable)
    expect(app.captureCharFrame()).toMatch(/1\s+hello/)
    setContent("مرحبا\npath/a.ts 123")
    await app.renderOnce()
    expect(descendants(app.renderer.root).find((node) => node instanceof CodeRenderable)).toBeInstanceOf(RtlCodeRenderable)
    expect(app.captureCharFrame()).toMatch(/1\s+ﺎﺒﺣﺮﻣ/)
    expect(app.captureCharFrame()).toMatch(/2\s+path\/a.ts 123/)
    setContent("hello again\npath/b.ts 456")
    await app.renderOnce()
    expect(descendants(app.renderer.root).find((node) => node instanceof CodeRenderable)).not.toBeInstanceOf(RtlCodeRenderable)
    expect(app.captureCharFrame()).toMatch(/2\s+path\/b.ts 456/)
  } finally {
    app.renderer.destroy()
    style.destroy()
  }
})

test("reasoning markdown retains logical body, subtle syntax, streaming and conceal toggles", async () => {
  const style = SyntaxStyle.fromStyles({
    default: { fg: "#88888880" },
    "markup.strong": { fg: "#88888880", bold: true },
  })
  const [content, setContent] = createSignal("**Review**\n\n**مرحبا** path/a.ts 123")
  const [conceal, setConceal] = createSignal(true)
  let markdown: MarkdownRenderable | undefined
  const app = await testRender(() => (
    <RtlPolicyProvider forceShaping={true}>
      <RtlMarkdown
        ref={(node) => { markdown = node }}
        streaming={true}
        syntaxStyle={style}
        content={reasoningSummary(content()).body}
        conceal={conceal()}
        concealCode={conceal()}
        fg="#888888"
      />
    </RtlPolicyProvider>
  ), { width: 50, height: 12 })
  try {
    await app.renderOnce()
    expect(markdown?.content).toBe("**مرحبا** path/a.ts 123")
    expect(markdown?.syntaxStyle).toBe(style)
    expect(markdown?.streaming).toBe(true)
    await app.renderOnce()
    expect(app.captureCharFrame()).toContain("ﺎﺒﺣﺮﻣ")
    expect(app.captureCharFrame()).not.toContain("**")
    const paragraph = descendants(app.renderer.root).find(
      (node): node is RtlTextRenderable => node instanceof RtlTextRenderable && node.logicalText.includes("path/a.ts"),
    )
    expect(paragraph?.visualLayout.chunks.some((chunk) => chunk.attributes === TextAttributes.BOLD && chunk.fg && chunk.fg.a < 1)).toBe(true)
    setConceal(false)
    await app.renderOnce()
    expect(markdown?.conceal).toBe(false)
    expect(markdown?.concealCode).toBe(false)
    await app.renderOnce()
    expect(app.captureCharFrame()).toContain("**")
    setContent(content() + "\n\nمرحبا path/b.ts 456")
    await app.renderOnce()
    expect(markdown?.content).toBe(reasoningSummary(content()).body)
    await app.renderOnce()
    expect(app.captureCharFrame()).toContain("path/b.ts 456")
  } finally {
    app.renderer.destroy()
    style.destroy()
  }
})
