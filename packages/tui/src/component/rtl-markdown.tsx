import {
  BoxRenderable,
  CodeRenderable,
  MarkdownRenderable,
  StyledText,
  TextTableRenderable,
  TextAttributes,
  type MarkdownOptions,
  type RenderContext,
  type RenderNodeContext,
  type TextChunk,
} from "@opentui/core"
import { RtlTextRenderable } from "../rtl-renderable"
import { RtlCodeRenderable } from "./rtl-code"
import { hasRtl } from "../util/rtl"

type Token = Parameters<NonNullable<MarkdownOptions["renderNode"]>>[0]

export function rtlMarkdownNode(token: Token, context: RenderNodeContext, ctx: RenderContext, options: MarkdownOptions) {
  if (!hasRtl(token.raw)) return undefined
  if (token.type === "code" && "text" in token) {
    const RenderCode = "lang" in token && token.lang?.split(/\s+/)[0] === "markdown" ? CodeRenderable : RtlCodeRenderable
    return new RenderCode(ctx, {
      content: token.text,
      filetype: "lang" in token ? token.lang?.split(/\s+/)[0] : undefined,
      syntaxStyle: context.syntaxStyle,
      treeSitterClient: context.treeSitterClient,
      conceal: context.concealCode,
      fg: options.fg,
      bg: options.bg,
      width: "100%",
    })
  }
  if (token.type === "table") {
    const native = context.defaultRender()
    if (!(native instanceof TextTableRenderable)) return native
    const table = new BoxRenderable(ctx, { width: "100%", flexDirection: "column", flexShrink: 0 })
    for (const cells of native.content) {
      const row = new BoxRenderable(ctx, { width: "100%", flexDirection: "row", flexShrink: 0 })
      for (const chunks of cells) {
        const cell = new BoxRenderable(ctx, {
          width: `${100 / cells.length}%`,
          flexShrink: 0,
          border: native.showBorders && native.border,
          borderStyle: native.borderStyle,
          borderColor: native.borderColor,
          paddingX: native.cellPaddingX,
          paddingY: native.cellPaddingY,
        })
        cell.add(new RtlTextRenderable(ctx, {
          content: new StyledText(chunks ?? []),
          forceShaping: true,
          width: "100%",
          wrapMode: native.wrapMode,
          selectable: options.tableOptions?.selectable ?? true,
          fg: options.fg,
          bg: options.bg,
        }))
        row.add(cell)
      }
      table.add(row)
    }
    return table
  }
  if (token.type === "blockquote" && "tokens" in token) {
    const quote = new BoxRenderable(ctx, { width: "100%", border: ["left"], paddingLeft: 1, flexShrink: 0 })
    for (const child of token.tokens ?? []) {
      const node = parsedBlock(child, context, ctx, options)
      if (node) quote.add(node)
    }
    return quote
  }
  if (token.type === "list" && "items" in token) {
    const list = new BoxRenderable(ctx, { width: "100%", flexShrink: 0 })
    for (const [index, item] of token.items.entries()) {
      const row = new BoxRenderable(ctx, { width: "100%", flexDirection: "row", flexShrink: 0 })
      const marker = `${token.ordered ? `${Number(token.start || 1) + index}.` : "-"} ${item.task ? item.checked ? "[x] " : "[ ] " : ""}`
      row.add(new RtlTextRenderable(ctx, { content: marker, width: marker.length, selectable: false, fg: options.fg }))
      const body = new BoxRenderable(ctx, { flexGrow: 1, flexShrink: 1, minWidth: 0 })
      for (const child of item.tokens) {
        const node = parsedBlock(child, context, ctx, options)
        if (node) body.add(node)
      }
      row.add(body)
      list.add(row)
    }
    return list
  }
  if (["paragraph", "heading", "text"].includes(token.type) && "tokens" in token && token.tokens?.length) {
    return new RtlTextRenderable(ctx, {
      content: new StyledText(inlineChunks(token.tokens, context, token.type === "heading" ? "markup.heading" : "default")),
      forceShaping: true,
      width: "100%",
      fg: options.fg,
      bg: options.bg,
    })
  }
  return undefined
}

function parsedBlock(token: Token, context: RenderNodeContext, ctx: RenderContext, options: MarkdownOptions) {
  if (token.type === "space") return undefined
  const child = new MarkdownRenderable(ctx, {
    ...options,
    content: token.raw,
    width: "100%",
    renderNode: (next, nested) => rtlMarkdownNode(next, nested, ctx, options),
  })
  return child
}

function inlineChunks(tokens: Token[], context: RenderNodeContext, group = "default", inherited: Partial<TextChunk> = {}): TextChunk[] {
  return tokens.flatMap((token): TextChunk[] => {
    const next = token.type === "strong" ? "markup.strong"
      : token.type === "em" ? "markup.italic"
      : token.type === "del" ? "markup.strikethrough"
      : token.type === "codespan" ? "markup.raw"
      : token.type === "link" || token.type === "image" ? "markup.link.label" : group
    const style = context.syntaxStyle.mergeStyles("default", group, next)
    const attributes = (inherited.attributes ?? 0) | style.attributes
      | (token.type === "strong" ? TextAttributes.BOLD : 0)
      | (token.type === "em" ? TextAttributes.ITALIC : 0)
      | (token.type === "del" ? TextAttributes.STRIKETHROUGH : 0)
    const chunk = {
      ...inherited,
      fg: style.fg ?? inherited.fg,
      bg: style.bg ?? inherited.bg,
      attributes,
      ...("href" in token && typeof token.href === "string" ? { link: { url: token.href } } : {}),
    }
    const children = "tokens" in token && token.tokens?.length
      ? inlineChunks(token.tokens, context, next, chunk)
      : [{ ...chunk, __isChunk: true as const, text: token.type === "br" ? "\n" : "text" in token ? token.text : token.raw }]
    if (context.conceal) return children
    const marker = token.type === "strong" ? "**" : token.type === "em" ? "*" : token.type === "del" ? "~~" : token.type === "codespan" ? "`" : ""
    if (marker) return [{ ...chunk, __isChunk: true, text: marker }, ...children, { ...chunk, __isChunk: true, text: marker }]
    if ("href" in token && typeof token.href === "string") {
      return [{ ...chunk, __isChunk: true, text: token.type === "image" ? "![" : "[" }, ...children, { ...chunk, __isChunk: true, text: `](${token.href})` }]
    }
    return children
  })
}
