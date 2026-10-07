import { render } from "bidi-shaper"

export function hasRtl(text: string) {
  return /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufefc\u{10800}-\u{10fff}\u{1e800}-\u{1eeff}]/u.test(text)
}

export function shouldShape(force: boolean | "auto" = "auto", env: NodeJS.ProcessEnv = process.env) {
  if (typeof force === "boolean") return force
  const program = env.TERM_PROGRAM?.toLowerCase()
  return !(
    program === "iterm.app" ||
    program === "iterm2" ||
    program === "kitty" ||
    env.TERM === "xterm-kitty" ||
    env.ITERM_SESSION_ID ||
    env.KITTY_WINDOW_ID
  )
}

export function visualText(text: string, force: boolean | "auto" = "auto", env: NodeJS.ProcessEnv = process.env) {
  if (!hasRtl(text) || !shouldShape(force, env)) return text
  return render(text)
}
