const logo = {
  // Big COdo banner — █-block letterform (matches the brand direction in the user's brief).
  left: ["███████", "██     ", "██     ", "██     ", "███████"],
  right: [
    " ██████╗  ██████╗   ██████╗ ",
    "██╔═══██╗ ██╔══██╗ ██╔═══██╗",
    "██║   ██║ ██║  ██║ ██║   ██║",
    "╚██████╔╝ ██████╔╝ ╚██████╔╝",
    " ╚═════╝  ╚═════╝   ╚═════╝ ",
  ],
}

const reset = "\x1b[0m"
const bold = "\x1b[1m"
const dim = "\x1b[90m"
// Brand colors from the user's brief: #00FF66 (electric green), #9400e4 (violet).
const brandGreen = "\x1b[38;2;0;255;102m"
const brandViolet = "\x1b[38;2;148;0;228m"

function wordmark(pad = "") {
  const draw = (line: string, fg: string, shadow: string, bg: string) =>
    [...line]
      .map((char) => {
        if (char === "_") return `${bg} ${reset}`
        if (char === "^") return `${fg}${bg}▀${reset}`
        if (char === "~") return `${shadow}▀${reset}`
        if (char === " ") return " "
        return `${fg}${char}${reset}`
      })
      .join("")

  return logo.left.map((line, index) => {
    // C block reads with the brand violet (drawn dim), O-D-O with the brand green.
    const left = draw(line, brandViolet, "\x1b[38;5;53m", "\x1b[48;5;53m")
    const right = draw(logo.right[index] ?? "", brandGreen, "\x1b[38;5;28m", "\x1b[48;5;28m")
    return `${pad}${left} ${right}`
  })
}

export function sessionEpilogue(input: { title: string; sessionID?: string }) {
  const weak = (text: string) => `${dim}${text.padEnd(10, " ")}${reset}`
  return [
    ...wordmark("  "),
    "",
    `  ${weak("Session")}${bold}${input.title}${reset}`,
    `  ${weak("Continue")}${bold}COdo -s ${input.sessionID}${reset}`,
    "",
    `  ${dim}developed by Mosalah4351${reset}`,
    `  ${dim}https://github.com/Mosalah4351${reset}`,
  ].join("\n")
}
