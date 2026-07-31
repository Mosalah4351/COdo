import { beforeEach, describe, expect, test } from "bun:test"

const src = await Bun.file(new URL("../public/oc-theme-preload.js", import.meta.url)).text()

const run = () => Function(src)()

beforeEach(() => {
  document.head.innerHTML = ""
  document.documentElement.removeAttribute("data-theme")
  document.documentElement.removeAttribute("data-color-scheme")
  localStorage.clear()
  Object.defineProperty(window, "matchMedia", {
    value: () =>
      ({
        matches: false,
      }) as MediaQueryList,
    configurable: true,
  })
})

describe("theme preload", () => {
  test("migrates legacy oc-1 to COdo before mount", () => {
    localStorage.setItem("codo-theme-id", "oc-1")
    localStorage.setItem("codo-theme-css-light", "--background-base:#fff;")
    localStorage.setItem("codo-theme-css-dark", "--background-base:#000;")

    run()

    expect(document.documentElement.dataset.theme).toBe("COdo")
    expect(document.documentElement.dataset.colorScheme).toBe("light")
    expect(localStorage.getItem("codo-theme-id")).toBe("COdo")
    expect(localStorage.getItem("codo-theme-css-light")).toBeNull()
    expect(localStorage.getItem("codo-theme-css-dark")).toBeNull()
    expect(document.getElementById("oc-theme-preload")).toBeNull()
  })

  test("keeps cached css for non-default themes", () => {
    localStorage.setItem("codo-theme-id", "nightowl")
    localStorage.setItem("codo-theme-css-light", "--background-base:#fff;")

    run()

    expect(document.documentElement.dataset.theme).toBe("nightowl")
    expect(document.getElementById("codo-theme-preload")?.textContent).toContain("--background-base:#fff;")
  })
})
