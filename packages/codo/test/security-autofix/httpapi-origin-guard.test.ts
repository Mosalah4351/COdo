import { afterEach, describe, expect, test } from "bun:test"
import { Context } from "effect"
import path from "path"
import { HttpApiApp } from "../../src/server/routes/instance/httpapi/server"
import { FilePaths } from "../../src/server/routes/instance/httpapi/groups/file"
import { resetDatabase } from "../fixture/db"
import { disposeAllInstances, tmpdir } from "../fixture/fixture"

const context = Context.empty() as Context.Context<unknown>

function request(route: string, directory: string, headers?: Record<string, string>, query?: Record<string, string>) {
  const url = new URL(`http://localhost${route}`)
  for (const [key, value] of Object.entries(query ?? {})) {
    url.searchParams.set(key, value)
  }
  return HttpApiApp.webHandler().handler(
    new Request(url, {
      headers: {
        "x-codo-directory": directory,
        ...headers,
      },
    }),
    context,
  )
}

afterEach(async () => {
  await disposeAllInstances()
  await resetDatabase()
})

describe("httpapi origin guard", () => {
  test("rejects forged cross-site origins with 403 while same-origin requests pass", async () => {
    await using tmp = await tmpdir({ git: true })
    await Bun.write(path.join(tmp.path, "hello.txt"), "hello")

    const [forged, control, local] = await Promise.all([
      request(FilePaths.list, tmp.path, { origin: "https://attacker.example" }, { path: "." }),
      request(FilePaths.list, tmp.path, undefined, { path: "." }),
      request(FilePaths.list, tmp.path, { origin: "http://localhost:3000" }, { path: "." }),
    ])

    expect(forged.status).toBe(403)
    expect(control.status).toBe(200)
    expect(local.status).toBe(200)
  })
})
