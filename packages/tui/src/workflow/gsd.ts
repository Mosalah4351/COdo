import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function initGsd() {
  await execAsync("npx @opengsd/gsd-core@latest")
}

export async function runGsdCommand(command: string) {
  const { stdout, stderr } = await execAsync(`gsd ${command}`)
  return { stdout, stderr }
}
