import { exec } from "child_process"
import { promisify } from "util"
import { homedir } from "os"
import { join } from "path"

const execAsync = promisify(exec)

export async function initGStack() {
  const gstackPath = join(homedir(), ".codo", "skills", "gstack")
  await execAsync(`git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ${gstackPath}`)
  await execAsync(`cd ${gstackPath} && ./setup`)
}

export async function runGStackCommand(command: string) {
  const { stdout, stderr } = await execAsync(command)
  return { stdout, stderr }
}
