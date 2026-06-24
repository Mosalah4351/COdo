import type { ColorInput } from "@opentui/core"
import { RGBA } from "@opentui/core"
import type { ColorGenerator } from "opentui-spinner"

export interface CometOptions {
  width?: number
  tailLength?: number
  gap?: number
  color?: ColorInput
  defaultColor?: ColorInput
  inactiveFactor?: number
}

export function createCometFrames(options: CometOptions = {}): string[] {
  const width = options.width ?? 8
  const tailLength = options.tailLength ?? 4
  const gap = options.gap ?? 6

  const totalFrames = width + tailLength + gap

  return Array.from({ length: totalFrames }, (_, frameIndex) => {
    const headPos = frameIndex - tailLength
    return Array.from({ length: width }, (_, charIndex) => {
      const dist = headPos - charIndex
      if (dist === 0) return "◉"
      if (dist > 0 && dist <= tailLength) return dist <= 2 ? "─" : "╌"
      return "·"
    }).join("")
  })
}

export function createCometColors(options: CometOptions = {}): ColorGenerator {
  const tailLength = options.tailLength ?? 4
  const gap = options.gap ?? 6
  const inactiveFactor = options.inactiveFactor ?? 0.12

  const base =
    options.color instanceof RGBA
      ? options.color
      : RGBA.fromHex((options.color as string) ?? "#60aaff")

  const defaultColor =
    options.defaultColor instanceof RGBA
      ? options.defaultColor
      : options.defaultColor
        ? RGBA.fromHex(options.defaultColor as string)
        : RGBA.fromValues(base.r, base.g, base.b, inactiveFactor)

  return (frameIndex, charIndex, _totalFrames, totalChars) => {
    const period = totalChars + tailLength + gap
    const headPos = (frameIndex % period) - tailLength
    const dist = headPos - charIndex

    if (dist === 0) {
      return RGBA.fromValues(base.r, base.g, base.b, 1)
    }

    if (dist > 0 && dist <= tailLength) {
      const t = dist / tailLength
      const alpha = Math.pow(1 - t, 1.5)
      return RGBA.fromValues(base.r * (1 - t * 0.8), base.g * (1 - t * 0.6), base.b * (1 - t * 0.25), alpha)
    }

    return defaultColor
  }
}
