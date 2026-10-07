import type { TextChunk } from "@opentui/core"
import { analyze, getEmbeddingLevels, shape } from "bidi-shaper"

export type RtlWrapMode = "none" | "char" | "word"
export type RtlPosition = { x: number; y: number }
export type RtlLine = {
  text: string
  chunks: TextChunk[]
  cells: number[][]
  separator: number[]
}
export type RtlLayout = {
  logicalText: string
  text: string
  chunks: TextChunk[]
  lines: RtlLine[]
}

type Glyph = {
  text: string
  indices: number[]
  level: number
  reset: boolean
  space: boolean
  chunks: TextChunk[]
}

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" })
const hidden = /^[\u00ad\u061c\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]+$/u
const resettable = /^[\t\u000b\u000c\u0020\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\u2066-\u2069]*$/u

export function rtlLayout(chunks: TextChunk[], width: number, wrapMode: RtlWrapMode = "word"): RtlLayout {
  const logicalText = chunks.map((chunk) => chunk.text).join("")
  const styles = chunks.flatMap((chunk) => Array.from(chunk.text, () => chunk))
  const columns = Number.isFinite(width) ? Math.max(0, Math.floor(width)) : 0
  const parts = logicalText.split(/(\r\n|[\r\n\u0085\u2028\u2029])/u)
  const lines: RtlLine[] = []
  let offset = 0
  for (let part = 0; part < parts.length; part += 2) {
    const text = parts[part]
    const points = Array.from(text)
    const rtl = /[\u0590-\u08ff\u200e\u200f\u202a-\u202e\u2066-\u2069\ufb1d-\ufeff]/u.test(text)
    const analysis = rtl ? analyze(text, { shape: false, paragraphs: "single" }) : undefined
    const levels = rtl ? getEmbeddingLevels(text, { paragraphs: "single" }) : new Uint8Array(points.length)
    const shaped = rtl ? Array.from(shape(text, { ligatures: false })) : points
    const visual = Array.from(analysis?.text ?? "")
    const mirrored = new Map(analysis?.visualToLogical.map((index, position) => [index, visual[position]]))
    const base = analysis?.direction === "rtl" ? 1 : 0
    const glyphs: Glyph[] = []
    let point = 0
    for (const segment of segmenter.segment(text)) {
      const indices = Array.from(segment.segment, (_, index) => point + index)
      const start = point
      point += indices.length
      if (hidden.test(segment.segment)) continue
      const visible = indices.filter((index) => !hidden.test(points[index]) || /[\u200c\u200d]/u.test(points[index]))
      const output = visible.map((index) => {
        const value = mirrored.get(index)
        return {
          ...styles[offset + index],
          __isChunk: true as const,
          text: value && value !== points[index] ? value : shaped[index],
        }
      })
      glyphs.push({
        text: output.map((chunk) => chunk.text).join(""),
        indices: indices.map((index) => offset + index),
        level: levels[start],
        reset: resettable.test(segment.segment),
        space: /^[ \t]+$/u.test(segment.segment),
        chunks: output,
      })
    }
    for (let index = 0; index < glyphs.length; index++) {
      const from = index ? Math.max(...glyphs[index - 1].indices) + 1 : offset
      const to = Math.min(...glyphs[index].indices)
      glyphs[index].indices.unshift(...Array.from({ length: to - from }, (_, position) => from + position))
    }
    if (glyphs.length) {
      const last = glyphs[glyphs.length - 1]
      const from = Math.max(...last.indices) + 1
      last.indices.push(...Array.from({ length: offset + points.length - from }, (_, index) => from + index))
    }
    const rows = wrapGlyphs(glyphs, columns, wrapMode)
    for (const row of rows) {
      const line = reorderLine(row, base, columns)
      lines.push(line)
    }
    const separator = Array.from(parts[part + 1] ?? "", (_, index) => offset + points.length + index)
    lines[lines.length - 1].separator = separator
    offset += points.length + separator.length
  }
  return {
    logicalText,
    text: lines.map((line) => line.text).join("\n"),
    chunks: lines.flatMap((line, index) => [
      ...(index ? [{ __isChunk: true as const, text: "\n" }] : []),
      ...line.chunks,
    ]),
    lines,
  }
}

function wrapGlyphs(glyphs: Glyph[], width: number, mode: RtlWrapMode) {
  if (!width || mode === "none" || !glyphs.length) return [glyphs]
  const lines: Glyph[][] = []
  let start = 0
  while (start < glyphs.length) {
    let end = start
    let columns = 0
    let boundary = start
    while (end < glyphs.length) {
      const size = glyphs[end].text === "\t" ? 4 - columns % 4 : Bun.stringWidth(glyphs[end].text)
      if (end > start && columns + size > width) break
      columns += size
      end++
      if (glyphs[end - 1].space) boundary = end
    }
    const stop = mode === "word" && end < glyphs.length && boundary > start ? boundary : end
    lines.push(glyphs.slice(start, stop))
    start = stop
  }
  return lines
}

function reorderLine(glyphs: Glyph[], base: number, width: number): RtlLine {
  const levels = glyphs.map((glyph) => glyph.level)
  for (let index = glyphs.length - 1; index >= 0 && glyphs[index].reset; index--) levels[index] = base
  for (let index = 0; index < glyphs.length; index++) {
    if (glyphs[index].text !== "\t") continue
    levels[index] = base
    for (let previous = index - 1; previous >= 0 && glyphs[previous].reset; previous--) levels[previous] = base
  }
  const order = glyphs.map((_, index) => index)
  const odd = levels.filter((level) => level % 2)
  for (let level = Math.max(0, ...levels); odd.length && level >= Math.min(...odd); level--) {
    let start = 0
    while (start < order.length) {
      if (levels[order[start]] < level) {
        start++
        continue
      }
      let end = start + 1
      while (end < order.length && levels[order[end]] >= level) end++
      order.splice(start, end - start, ...order.slice(start, end).reverse())
      start = end
    }
  }
  const chunks: TextChunk[] = []
  const cells: number[][] = []
  for (const index of order) {
    const glyph = glyphs[index]
    const size = glyph.text === "\t" ? 4 - cells.length % 4 : Bun.stringWidth(glyph.text)
    chunks.push(...glyph.text === "\t" ? [{ ...glyph.chunks[0], text: " ".repeat(size) }] : glyph.chunks)
    cells.push(...Array.from({ length: size }, () => glyph.indices))
  }
  const padding = base === 1 ? Math.max(0, width - cells.length) : 0
  if (padding) {
    chunks.unshift({ __isChunk: true, text: " ".repeat(padding) })
    cells.unshift(...Array.from({ length: padding }, () => []))
  }
  return { text: chunks.map((chunk) => chunk.text).join(""), chunks, cells, separator: [] }
}

export function rtlSelection(layout: RtlLayout, anchor: RtlPosition, focus: RtlPosition) {
  const reverse = anchor.y > focus.y || anchor.y === focus.y && anchor.x > focus.x
  const start = reverse ? focus : anchor
  const end = reverse ? anchor : focus
  const indices = new Set<number>()
  for (let row = Math.max(0, start.y); row <= Math.min(end.y, layout.lines.length - 1); row++) {
    const line = layout.lines[row]
    const from = row === start.y ? Math.max(0, start.x) : 0
    const to = row === end.y ? end.x : line.cells.length
    for (const cell of line.cells.slice(from, Math.max(from, to))) {
      for (const index of cell) indices.add(index)
    }
    if (row < end.y) for (const index of line.separator) indices.add(index)
  }
  const points = Array.from(layout.logicalText)
  const selected = [...indices].sort((a, b) => a - b)
  return selected.map((index) => points[index]).join("")
}

export class RtlLayoutCache {
  private key?: string
  private value?: RtlLayout

  get(chunks: TextChunk[], width: number, mode: RtlWrapMode = "word") {
    const key = JSON.stringify([width, mode, chunks])
    if (key === this.key && this.value) return this.value
    this.key = key
    this.value = rtlLayout(chunks, width, mode)
    return this.value
  }
}
