import { exec } from "child_process"
import { promisify } from "util"
import { homedir } from "os"
import { join } from "path"
import { existsSync } from "fs"
import { rm } from "fs/promises"

const execAsync = promisify(exec)

export async function initGStack() {
  const gstackPath = join(homedir(), ".codo", "skills", "gstack")
  
  if (existsSync(gstackPath)) {
    try {
      await execAsync(`cd ${gstackPath} && git pull`)
    } catch {
      await rm(gstackPath, { recursive: true, force: true })
      await execAsync(`git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ${gstackPath}`)
    }
  } else {
    await execAsync(`git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ${gstackPath}`)
  }
}

export async function runGStackCommand(command: string) {
  const { stdout, stderr } = await execAsync(command)
  return { stdout, stderr }
}
