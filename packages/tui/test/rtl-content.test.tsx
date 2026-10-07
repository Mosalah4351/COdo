import { expect, test } from "bun:test"
import { BoxRenderable, CodeRenderable, DiffRenderable, MarkdownRenderable, RGBA, Renderable, Selection, SyntaxStyle, TextAttributes, TreeSitterClient } from "@opentui/core"
import { extend, testRender } from "@opentui/solid"
import { createSignal } from "solid-js"
import { RtlCodeRenderable, RtlCode, RtlMarkdown, RtlDiff } from "../src/component/rtl-content"
import { RtlPolicyProvider } from "../src/component/rtl-text"
import { RtlTextRenderable } from "../src/rtl-renderable"

extend({ rtl_code_test: RtlCodeRenderable })

function descendants(node: Renderable): Renderable[] {
  return node.getChildren().flatMap((child) => [child, ...descendants(child)])
}

class HighlightClient extends TreeSitterClient {
  seen: string[] = []
  fail = false
  wait?: Promise<void>

  override async highlightOnce(content: string) {
    this.seen.push(content)
    await this.wait
    if (this.fail) throw new Error("highlight unavailable")
    return { highlights: [] }
  }
}

test("highlight callbacks receive logical text, retain styles and ignore stale asynchronous results", async () => {
  const style = SyntaxStyle.fromStyles({})
  const client = new HighlightClient({ dataPath: "C:/Users/mosal/AppData/Local/Temp/codo" })
  const [content, setContent] = createSignal('const x = "مرحبا"; // src/a.ts 123')
  const app = await testRender(() => <RtlPolicyProvider forceShaping={true}>
    <RtlCode id="async" content={content()} filetype="typescript" treeSitterClient={client} syntaxStyle={style}
      onChunks={(chunks, context) => {
        expect(context.content).toBe(content())
        return chunks.map((chunk) => ({ ...chunk, fg: RGBA.fromHex("#ff0000"), attributes: TextAttributes.BOLD, link: { url: "https://github.com/anomalyco/codo/issues" } }))
      }} />
  </RtlPolicyProvider>, { width: 50, height: 5 })
  try {
    await app.renderOnce()
    const node = app.renderer.root.findDescendantById("async")
    if (!(node instanceof RtlCodeRenderable)) throw new Error("Missing code")
    await node.highlightingDone
    await app.renderOnce()
    expect(client.seen).toContain(content())
    expect(node.content).toBe(content())
    expect(node.plainText).toContain("ﺎﺒﺣﺮﻣ")
    expect(node.plainText).toContain("src/a.ts 123")
    expect(node.visualLayout?.chunks.some((chunk) => chunk.link && chunk.attributes === TextAttributes.BOLD)).toBe(true)
    let release = () => {}
    client.wait = new Promise<void>((resolve) => { release = resolve })
    setContent("مرحبا old")
    await app.renderOnce()
    const stale = node.highlightingDone
    setContent("مرحبا new")
    await app.renderOnce()
    release()
    await stale
    await node.highlightingDone
    await app.renderOnce()
    expect(node.logicalText).toBe("مرحبا new")
    client.fail = true
    setContent("مرحبا fallback")
    await app.renderOnce()
    await node.highlightingDone
    await app.renderOnce()
    expect(node.logicalText).toBe("مرحبا fallback")
    expect(node.plainText).toContain("ﺎﺒﺣﺮﻣ")
    setContent("")
    await app.renderOnce()
    expect(app.captureCharFrame().trim()).toBe("")
  } finally {
    app.renderer.destroy()
    await client.destroy()
    style.destroy()
  }
})

test("Markdown parses structure before shaping and keeps links, nested styles and table cells", async () => {
  const style = SyntaxStyle.fromStyles({ "markup.strong": { bold: true }, "markup.heading": { fg: "#00ff00" } })
  const source = "# مرحبا\n\n**مر[حبا](https://github.com/anomalyco/codo/issues)** src/a.ts 123\n\n| اسم | Path |\n| --- | --- |\n| مرحبا | src/a.ts 123 |\n\n> مرحبا\n\n- مرحبا\n\n```\nمرحبا\n```"
  const [content, setContent] = createSignal(source)
  let ref: MarkdownRenderable | undefined
  const app = await testRender(() => <RtlPolicyProvider forceShaping={true}>
    <RtlMarkdown id="md" content={content()} syntaxStyle={style} streaming tableOptions={{ style: "grid" }} ref={(node) => { ref = node }} />
  </RtlPolicyProvider>, { width: 60, height: 35 })
  try {
    await app.renderOnce()
    expect(ref?.content).toBe(source)
    await app.renderOnce()
    expect(app.captureCharFrame()).toContain("ﺎﺒﺣﺮﻣ")
    const texts = descendants(app.renderer.root).filter((node): node is RtlTextRenderable => node instanceof RtlTextRenderable)
    expect(texts.some((node) => node.logicalText === "مرحبا src/a.ts 123")).toBe(true)
    expect(texts.some((node) => node.logicalText === "مرحبا" && node.parent?.parent?.parent instanceof BoxRenderable)).toBe(true)
    const paragraph = texts.find((node) => node.logicalText === "مرحبا src/a.ts 123")!
    expect(paragraph.visualLayout.chunks.filter((chunk) => chunk.link).map((chunk) => chunk.text).join("")).toBe("ﺎﺒﺣ")
    expect(paragraph.visualLayout.chunks.filter((chunk) => chunk.link).every((chunk) => chunk.attributes === TextAttributes.BOLD)).toBe(true)
    expect(app.captureCharFrame()).toContain("src/a.ts 123")
    expect(app.captureCharFrame()).not.toContain("| --- |")
    expect(app.captureCharFrame()).not.toContain("```")
    setContent(source.replace("مرحبا |", "مرحبا مرحبا |"))
    app.resize(32, 35)
    await app.renderOnce()
    expect(ref?.content).toContain("مرحبا مرحبا |")
    expect(descendants(app.renderer.root).filter((node) => node instanceof RtlTextRenderable).some((node) => node.logicalText === "مرحبا مرحبا")).toBe(true)
  } finally {
    app.renderer.destroy()
    style.destroy()
  }
})

const patch = "--- a/file.ts\n+++ b/file.ts\n@@ -1,2 +1,2 @@\n-مرحبا old\n+مرحبا new\n path/a.ts 123\n"

test.each(["unified", "split"] as const)("diff %s retains rows, signs, logical copy and wrapping", async (view) => {
  const app = await testRender(() => <RtlPolicyProvider forceShaping={true}>
    <RtlDiff id="patch" diff={patch} view={view} wrapMode="word" />
  </RtlPolicyProvider>, { width: 70, height: 20 })
  try {
    await app.renderOnce()
    const text = app.captureCharFrame()
    expect(text).toContain("@@ -1,2 +1,2 @@")
    expect(text).toContain("ﺎﺒﺣﺮﻣ")
    expect(text).toContain("path/a.ts 123")
    const nodes = descendants(app.renderer.root).filter((node): node is RtlTextRenderable => node instanceof RtlTextRenderable)
    expect(nodes.some((node) => node.logicalText === "- ")).toBe(true)
    expect(nodes.some((node) => node.logicalText === "+ ")).toBe(true)
    const line = nodes.find((node) => node.logicalText === "مرحبا new")!
    const selection = new Selection(line, { x: line.x, y: line.y }, { x: line.x + line.width, y: line.y })
    selection.isActive = true
    line.onSelectionChanged(selection)
    expect(line.getSelectedText()).toBe("مرحبا new")
    app.resize(40, 30)
    await app.renderOnce()
    expect(app.captureCharFrame()).toContain("ﺎﺒﺣﺮﻣ")
  } finally {
    app.renderer.destroy()
  }
})

test.each([true, false])("LTR and policy-disabled adapters use native renderers (%s)", async (force) => {
  const style = SyntaxStyle.fromStyles({})
  const [value, setValue] = createSignal(force ? "English src/a.ts 123" : "مرحبا")
  const app = await testRender(() => <RtlPolicyProvider forceShaping={force}>
    <RtlCode id="native-code" content={value()} syntaxStyle={style} />
    <RtlMarkdown id="native-md" content={value()} syntaxStyle={style} />
    <RtlDiff id="native-diff" diff={force ? patch.replaceAll("مرحبا", "hello") : patch} />
  </RtlPolicyProvider>, { width: 60, height: 20 })
  try {
    await app.renderOnce()
    const code = app.renderer.root.findDescendantById("native-code")
    expect(code).toBeInstanceOf(CodeRenderable)
    expect(code).not.toBeInstanceOf(RtlCodeRenderable)
    expect(app.renderer.root.findDescendantById("native-diff")).toBeInstanceOf(DiffRenderable)
    if (force) {
      setValue("مرحبا")
      await app.renderOnce()
      expect(app.renderer.root.findDescendantById("native-code")).toBeInstanceOf(RtlCodeRenderable)
      setValue("English")
      await app.renderOnce()
      expect(app.renderer.root.findDescendantById("native-code")).not.toBeInstanceOf(RtlCodeRenderable)
    }
  } finally {
    app.renderer.destroy()
    style.destroy()
  }
})

test("RTL code keeps logical source and wraps visual output on resize", async () => {
  const style = SyntaxStyle.fromStyles({})
  const app = await testRender(() => <rtl_code_test id="code" content="مرحبا مرحبا" syntaxStyle={style} wrapMode="word" />, { width: 6, height: 4 })
  try {
    await app.renderOnce()
    const node = app.renderer.root.findDescendantById("code")
    if (!(node instanceof RtlCodeRenderable)) throw new Error("Missing code")
    expect(node.content).toBe("مرحبا مرحبا")
    expect(node.plainText).toBe(" ﺎﺒﺣﺮﻣ\n ﺎﺒﺣﺮﻣ")
    expect(node.height).toBe(2)
    app.resize(12, 4)
    await app.renderOnce()
    expect(node.plainText).toBe(" ﺎﺒﺣﺮﻣ ﺎﺒﺣﺮﻣ")
    const selection = new Selection(node, { x: 0, y: 0 }, { x: 12, y: 0 })
    selection.isActive = true
    node.onSelectionChanged(selection)
    expect(node.getSelectedText()).toBe("مرحبا مرحبا")
  } finally {
    app.renderer.destroy()
    style.destroy()
  }
})
