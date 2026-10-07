import { RGBA, type TextChunk } from "@opentui/core"
import { expect, test } from "bun:test"
import { RtlLayoutCache, rtlLayout, rtlSelection } from "../src/rtl-layout"

const chunk = (text: string): TextChunk => ({ __isChunk: true, text })

test("exact Arabic and unchanged English, paths and numbers", () => {
  expect(rtlLayout([chunk("مرحبا")], 5).text).toBe("\ufe8e\ufe92\ufea3\ufeae\ufee3")
  for (const text of ["Hello world", "src/routes/index.tsx", "123 ٤٥٦"]) {
    expect(rtlLayout([chunk(text)], 80).text).toBe(text)
  }
})

test("mixed Facebook posts preserve Latin runs and punctuation", () => {
  expect(rtlLayout([chunk("مرحبا facebook 123")], 18).text).toBe("facebook 123 \ufe8e\ufe92\ufea3\ufeae\ufee3")
  expect(rtlLayout([chunk("facebook: مرحبا (123)")], 80).text).toBe("facebook: (123) \ufe8e\ufe92\ufea3\ufeae\ufee3")
  expect(rtlLayout([chunk("مرحبا src/routes/index.tsx 123")], 40).text).toBe(
    "          src/routes/index.tsx 123 \ufe8e\ufe92\ufea3\ufeae\ufee3",
  )
})

test("shapes across styled boundaries while preserving links and attributes", () => {
  const fg = RGBA.fromHex("#ff0000")
  const bg = RGBA.fromHex("#0000ff")
  const input = [{ ...chunk("مر"), fg, attributes: 1 }, { ...chunk("حبا"), bg, link: { url: "https://example.com" } }]
  const layout = rtlLayout(input, 8)
  expect(layout.text).toBe("   \ufe8e\ufe92\ufea3\ufeae\ufee3")
  expect(layout.chunks.slice(1, 4).every((value) => value.link?.url === "https://example.com" && value.bg === bg)).toBe(true)
  expect(layout.chunks.slice(4).every((value) => value.fg === fg && value.attributes === 1)).toBe(true)
  expect(input.map((value) => value.text)).toEqual(["مر", "حبا"])
})

test("wraps logical line order before L2 rather than reversing a paragraph then wrapping", () => {
  expect(rtlLayout([chunk("مرحبا مرحبا")], 6, "char").text).toBe(
    " \ufe8e\ufe92\ufea3\ufeae\ufee3\n \ufe8e\ufe92\ufea3\ufeae\ufee3",
  )
  expect(rtlLayout([chunk("مرحبا 123 abc")], 6, "char").text).toBe(
    " \ufe8e\ufe92\ufea3\ufeae\ufee3\nab 123\n     c",
  )
})

test("continuation numbers inherit full paragraph resolution", () => {
  expect(rtlLayout([chunk("مرحبا 123 456")], 6, "word").text).toBe(
    " \ufe8e\ufe92\ufea3\ufeae\ufee3\n   123\n   456",
  )
  expect(rtlLayout([chunk("abc אבג 123")], 4, "char").text).toBe("abc \nגבא \n123")
})

test("L1 resets trailing spaces on each line inside explicit RTL embeddings", () => {
  expect(rtlLayout([chunk("x \u202bאב  cd\u202c")], 5, "char").lines.map((line) => line.text)).toEqual([
    "x בא ",
    "cd ",
  ])
})

test("graphemes and double-width cells survive layout and copy", () => {
  const logical = "مرحبا 👩‍💻 界 é"
  const layout = rtlLayout([chunk(logical)], 10)
  expect(layout.text).toContain("👩‍💻")
  expect(layout.text).toContain("é")
  expect(layout.lines.every((line) => Bun.stringWidth(line.text) <= 10)).toBe(true)
  expect(rtlSelection(layout, { x: 0, y: 0 }, { x: 100, y: layout.lines.length - 1 })).toBe(logical)
})

test("logical selection excludes alignment and soft wraps, preserves hard breaks and controls", () => {
  const logical = "مرحبا\r\nلا \u202babc\u202c"
  const layout = rtlLayout([chunk(logical)], 8)
  expect(rtlSelection(layout, { x: 0, y: 0 }, { x: 8, y: layout.lines.length - 1 })).toBe(logical)
  const arabic = rtlLayout([chunk("مرحبا")], 10)
  expect(rtlSelection(arabic, { x: 0, y: 0 }, { x: 5, y: 0 })).toBe("")
  expect(rtlSelection(arabic, { x: 5, y: 0 }, { x: 7, y: 0 })).toBe("با")
  expect(rtlSelection(arabic, { x: 7, y: 0 }, { x: 5, y: 0 })).toBe("با")
})

test("cache keys include text, style, links, wrap mode and width", () => {
  const cache = new RtlLayoutCache()
  const input = [chunk("مرحبا")]
  const first = cache.get(input, 10)
  expect(cache.get([chunk("مرحبا")], 10)).toBe(first)
  input[0].attributes = 1
  const styled = cache.get(input, 10)
  expect(styled).not.toBe(first)
  input[0].link = { url: "https://example.com" }
  const linked = cache.get(input, 10)
  expect(linked).not.toBe(styled)
  expect(cache.get(input, 6)).not.toBe(linked)
  const wrapped = cache.get(input, 3, "char")
  expect(wrapped.lines).toHaveLength(2)
  expect(cache.get(input, 3, "none").lines).toHaveLength(1)
  input[0].text += " مرحبا"
  expect(cache.get(input, 3).logicalText).toBe("مرحبا مرحبا")
})
