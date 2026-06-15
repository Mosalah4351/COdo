import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function initSpecKit(projectName: string, integration: string) {
  await execAsync(`specify init ${projectName} --integration ${integration}`)
}

export async function runSpecKitCommand(command: string) {
  const { stdout, stderr } = await execAsync(`specify ${command}`)
  return { stdout, stderr }
}
