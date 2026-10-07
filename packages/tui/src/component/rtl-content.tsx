import { extend, useRenderer, type CodeProps, type MarkdownProps } from "@opentui/solid"
import { createMemo, Show, splitProps } from "solid-js"
import { RtlCodeRenderable } from "./rtl-code"
import { rtlMarkdownNode } from "./rtl-markdown"
import { useRtlPolicy } from "./rtl-text"
import { hasRtl, shouldShape } from "../util/rtl"

export { RtlDiff, type RtlDiffProps } from "./rtl-diff"
export { RtlCodeRenderable } from "./rtl-code"

export const rtlContentCoverage = {
  code: "highlighted chunks with logical selection; callbacks see logical source; filetype=markdown remains native (use RtlMarkdown)",
  markdown: "parsed paragraphs, headings, lists, quotes, fences and tables",
  tables: "equal-width cell grid fallback; native column fitting and table-wide selection are not retained",
  diff: "parsed unified/split row fallback; no syntax highlighting, synchronized scrolling or DiffRenderable ref methods",
  unsupported: "custom renderNode output, HTML and unknown markdown tokens remain native; invalid diffs remain native",
} as const

declare module "@opentui/solid" {
  interface OpenTUIComponents {
    rtl_code: typeof RtlCodeRenderable
  }
}

extend({ rtl_code: RtlCodeRenderable })

export function RtlCode(props: CodeProps) {
  const policy = useRtlPolicy()
  const [local, rest] = splitProps(props, ["ref"])
  const ref = (node: import("@opentui/core").CodeRenderable) => {
    if (typeof local.ref === "function") local.ref(node)
  }
  return <Show when={shouldShape(policy()) && props.filetype !== "markdown" && hasRtl(props.content ?? "")} fallback={<code {...rest} ref={ref} />}>
    <rtl_code {...rest} ref={ref} />
  </Show>
}

export function RtlMarkdown(props: MarkdownProps) {
  const policy = useRtlPolicy()
  const renderer = useRenderer()
  const [local, rest] = splitProps(props, ["renderNode", "internalBlockMode", "tableOptions"])
  const active = () => shouldShape(policy()) && hasRtl(props.content ?? "")
  const renderNode = createMemo<MarkdownProps["renderNode"]>(() => {
    const custom = local.renderNode
    const tables = local.tableOptions
    const fg = props.fg
    const bg = props.bg
    const streaming = props.streaming
    if (!active()) return custom
    return (token, context) => custom?.(token, context) ?? rtlMarkdownNode(token, context, renderer, {
      syntaxStyle: context.syntaxStyle,
      conceal: context.conceal,
      concealCode: context.concealCode,
      treeSitterClient: context.treeSitterClient,
      tableOptions: tables,
      fg, bg, streaming,
    })
  })
  return <markdown
    {...rest}
    tableOptions={local.tableOptions}
    internalBlockMode={active() ? "top-level" : local.internalBlockMode}
    renderNode={renderNode()}
  />
}
