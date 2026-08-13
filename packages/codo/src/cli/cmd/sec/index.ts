import type { Argv } from "yargs"
import { cmd } from "../cmd"
import { SecReportCommand } from "./report"

export const SecCommand = cmd({
  command: "sec",
  describe: "security finding tools",
  builder: (yargs: Argv) => yargs.command(SecReportCommand).demandCommand(),
  async handler() {},
})
