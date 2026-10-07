import { StyledText, TextRenderable, type RenderContext, type TextOptions } from "@opentui/core"
import { RtlLayoutCache, rtlSelection, type RtlLayout, type RtlWrapMode } from "./rtl-layout"
import { hasRtl, shouldShape } from "./util/rtl"

export type RtlTextOptions = TextOptions & { forceShaping?: boolean | "auto" }

export class RtlTextRenderable extends TextRenderable {
  private cache = new RtlLayoutCache()
  private layout?: RtlLayout
  private manual: boolean
  private policy: boolean | "auto"
  private active = false
  private nodeChunks: StyledText["chunks"] = []

  constructor(ctx: RenderContext, options: RtlTextOptions) {
    super(ctx, options)
    this.manual = options.content !== undefined && options.content !== ""
    this.policy = options.forceShaping ?? "auto"
    const lifecycle = this.onLifecyclePass
    const measure = this.textBufferView.measureForDimensions.bind(this.textBufferView)
    this.onLifecyclePass = () => {
      const dirty = this.rootTextNode.isDirty && !this.manual
      lifecycle()
      if (dirty) {
        this.nodeChunks = this.rootTextNode.gatherWithInheritedStyle({
          fg: this._defaultFg,
          bg: this._defaultBg,
          attributes: this._defaultAttributes,
        })
      }
      this.updateRtl(dirty)
    }
    this.textBufferView.measureForDimensions = (width, height) => {
      if (this.active) this.syncLayout(width)
      return measure(width, height)
    }
    this.updateRtl()
  }

  get forceShaping() {
    return this.policy
  }

  set forceShaping(value: boolean | "auto" | undefined) {
    this.policy = value ?? "auto"
    this.updateRtl()
  }

  override get content(): StyledText {
    return super.content
  }

  override set content(value: StyledText | string) {
    this.manual = true
    super.content = value
    this.updateRtl(true)
  }

  override get wrapMode() {
    return super.wrapMode
  }

  override set wrapMode(value: RtlWrapMode) {
    super.wrapMode = value
    if (this.active) this.textBufferView.setWrapMode("none")
    this.updateRtl()
  }

  get logicalText() {
    return this.logicalChunks.map((chunk) => chunk.text).join("")
  }

  get visualLayout() {
    return this.cache.get(this.logicalChunks, this.width, this.wrapMode)
  }

  override getSelectedText() {
    if (!this.active) return super.getSelectedText()
    const selection = this.lastLocalSelection
    if (!selection?.isActive || !this.layout) return ""
    return rtlSelection(
      this.layout,
      { x: selection.anchorX + this.scrollX, y: selection.anchorY + this.scrollY },
      { x: selection.focusX + this.scrollX, y: selection.focusY + this.scrollY },
    )
  }

  override clear() {
    super.clear()
    this.nodeChunks = []
    this.updateRtl(true)
  }

  protected override onResize(width: number, height: number) {
    super.onResize(width, height)
    if (this.active) this.updateRtl()
  }

  private get logicalChunks() {
    if (this.manual) return this.chunks
    return this.nodeChunks
  }

  private updateRtl(refresh = false) {
    if (!this.cache || !this.rootTextNode) return
    const active = shouldShape(this.policy) && hasRtl(this.logicalText)
    if (!active) {
      if (!this.active) return
      this.active = false
      this.layout = undefined
      if (!this.manual) {
        this.nodeChunks = this.rootTextNode.gatherWithInheritedStyle({
          fg: this._defaultFg,
          bg: this._defaultBg,
          attributes: this._defaultAttributes,
        })
      }
      this.textBuffer.setStyledText(new StyledText(this.logicalChunks))
      this.textBufferView.setWrapMode(this.wrapMode)
      if (this.wrapMode !== "none" && this.width > 0) this.textBufferView.setWrapWidth(this.width)
      this.updateTextInfo()
      return
    }
    this.active = true
    this.textBufferView.setWrapMode("none")
    if (this.syncLayout(this.width, refresh)) this.updateTextInfo()
  }

  private syncLayout(width: number, refresh = false) {
    const layout = this.cache.get(this.logicalChunks, width, this.wrapMode)
    if (layout === this.layout && !refresh) return false
    this.layout = layout
    this.textBuffer.setStyledText(new StyledText(layout.chunks))
    return true
  }
}
