import { spawn } from "child_process"

function checkSpecifyInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("specify", ["--version"], {
      shell: true,
      stdio: "ignore",
      windowsHide: true,
    })
    child.on("close", (code) => resolve(code === 0))
    child.on("error", () => resolve(false))
  })
}

function runSpecifyInit(integration: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("specify", [
      "init", "--here",
      "--integration", integration,
      "--ignore-agent-tools",
      "--force",
    ], {
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    })

    child.stdin.write("y\n")
    child.stdin.end()

    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (data: Buffer) => { stdout += data.toString() })
    child.stderr.on("data", (data: Buffer) => { stderr += data.toString() })

    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr })
      else reject(new Error(`specify init failed (exit ${code}): ${stderr || stdout}`))
    })
    child.on("error", reject)
  })
}

export async function initSpecKit(integration: string) {
  const isInstalled = await checkSpecifyInstalled()
  if (!isInstalled) {
    throw new Error("Specify CLI not installed. Run: uv tool install specify-cli --from git+https://github.com/github/spec-kit.git")
  }
  const { stdout, stderr } = await runSpecifyInit(integration)
  return { stdout, stderr }
}

export async function runSpecKitCommand(command: string) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn("specify", command.split(" "), {
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    })
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (data: Buffer) => { stdout += data.toString() })
    child.stderr.on("data", (data: Buffer) => { stderr += data.toString() })
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr })
      else reject(new Error(`specify ${command} failed (exit ${code}): ${stderr || stdout}`))
    })
    child.on("error", reject)
  })
}
