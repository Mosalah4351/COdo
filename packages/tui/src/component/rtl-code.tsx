import {
  CodeRenderable,
  StyledText,
  getTreeSitterClient,
  treeSitterToTextChunks,
  type CodeOptions,
  type OptimizedBuffer,
  type RenderContext,
  type TextChunk,
} from "@opentui/core"
import { RtlLayoutCache, rtlSelection, type RtlLayout } from "../rtl-layout"

export class RtlCodeRenderable extends CodeRenderable {
  private cache = new RtlLayoutCache()
  private layout?: RtlLayout
  private logical: TextChunk[] = []
  private signature?: unknown[]
  private revision = 0
  private pending = Promise.resolve()
  private loading = false
  private drawable = true
  private initial?: StyledText

  constructor(ctx: RenderContext, options: CodeOptions) {
    super(ctx, options)
    this.initial = options.initialStyledText
    const measure = this.textBufferView.measureForDimensions.bind(this.textBufferView)
    this.textBufferView.measureForDimensions = (width, height) => {
      this.syncLayout(width)
      return measure(width, height)
    }
    this.onLifecyclePass = () => this.refresh()
    this.refresh()
  }

  override set initialStyledText(value: StyledText | undefined) {
    this.initial = value
    super.initialStyledText = value
  }

  override get isHighlighting() {
    return this.loading
  }

  override get highlightingDone() {
    return this.pending
  }

  get logicalText() {
    return this.logical.map((chunk) => chunk.text).join("")
  }

  get visualLayout() {
    return this.layout
  }

  override getSelectedText() {
    const selection = this.lastLocalSelection
    if (!selection?.isActive || !this.layout) return ""
    return rtlSelection(this.layout,
      { x: selection.anchorX + this.scrollX, y: selection.anchorY + this.scrollY },
      { x: selection.focusX + this.scrollX, y: selection.focusY + this.scrollY })
  }

  protected override onResize(width: number, height: number) {
    super.onResize(width, height)
    if (this.cache) {
      this.syncLayout(width)
      super.updateTextInfo()
    }
  }

  protected override renderSelf(buffer: OptimizedBuffer) {
    this.refresh()
    if (this.drawable) buffer.drawTextBuffer(this.textBufferView, this.screenX, this.screenY)
  }

  private refresh() {
    const signature = [this.content, this.filetype, this.syntaxStyle, this.conceal, this.baseHighlight,
      this.onHighlight, this.onChunks, this.treeSitterClient, this.initial, this.drawUnstyledText, this.streaming]
    if (this.signature?.every((value, index) => value === signature[index])) {
      this.syncLayout(this.width)
      return
    }
    this.signature = signature
    const revision = ++this.revision
    this.logical = this.content ? this.initial?.chunks ?? [{ __isChunk: true, text: this.content }] : []
    this.drawable = this.drawUnstyledText || !this.filetype
    this.syncLayout(this.width)
    super.updateTextInfo()
    if (!this.filetype || !this.content) {
      this.loading = false
      this.pending = Promise.resolve()
      return
    }
    this.loading = true
    const content = this.content
    const filetype = this.filetype
    const syntaxStyle = this.syntaxStyle
    const conceal = this.conceal
    const baseHighlight = this.baseHighlight
    const onHighlight = this.onHighlight
    const onChunks = this.onChunks
    this.pending = (async () => {
      const result = await (this.treeSitterClient ?? getTreeSitterClient()).highlightOnce(content, filetype)
      if (this.isDestroyed || revision !== this.revision) return
      const context = { content, filetype, syntaxStyle }
      const highlights = await onHighlight?.(result.highlights ?? [], context) ?? result.highlights ?? []
      if (this.isDestroyed || revision !== this.revision) return
      const chunks = treeSitterToTextChunks(content, highlights, syntaxStyle, { enabled: conceal, baseHighlight })
      const transformed = await onChunks?.(chunks, { ...context, highlights }) ?? chunks
      if (this.isDestroyed || revision !== this.revision) return
      this.logical = transformed
    })().catch(() => {
      if (this.isDestroyed || revision !== this.revision) return
      this.logical = this.initial?.chunks ?? [{ __isChunk: true, text: content }]
    }).then(() => {
      if (this.isDestroyed || revision !== this.revision) return
      this.loading = false
      this.drawable = true
      this.syncLayout(this.width)
      super.updateTextInfo()
      this.requestRender()
    })
  }

  private syncLayout(width: number) {
    const layout = this.cache.get(this.logical, width, this.wrapMode)
    this.textBufferView.setWrapMode("none")
    if (layout === this.layout && this.plainText === layout.text) return
    this.layout = layout
    this.textBuffer.setStyledText(new StyledText(layout.chunks))
  }
}
