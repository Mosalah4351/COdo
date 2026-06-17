import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

async function checkSpecifyInstalled(): Promise<boolean> {
  try {
    await execAsync("specify --version")
    return true
  } catch {
    return false
  }
}

export async function initSpecKit(projectName: string, integration: string) {
  const isInstalled = await checkSpecifyInstalled()
  if (!isInstalled) {
    throw new Error("Specify CLI not installed. Install: npm install -g @specifyapp/cli")
  }
  await execAsync(`specify init ${projectName} --integration ${integration}`)
}

export async function runSpecKitCommand(command: string) {
  const { stdout, stderr } = await execAsync(`specify ${command}`)
  return { stdout, stderr }
}
