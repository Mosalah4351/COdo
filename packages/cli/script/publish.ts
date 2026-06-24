#!/usr/bin/env bun
import { $ } from "bun"
import pkg from "../package.json"
import { Script } from "@codo-ai/script"
import { fileURLToPath } from "url"
import path from "path"

const dir = fileURLToPath(new URL("..", import.meta.url))
process.chdir(dir)

async function published(name: string, version: string) {
  return (await $`npm view ${name}@${version} version`.nothrow()).exitCode === 0
}

async function publish(dir: string, name: string, version: string) {
  if (process.platform !== "win32") await $`chmod -R 755 .`.cwd(dir)
  if (await published(name, version)) return console.log(`already published ${name}@${version}`)
  await $`bun pm pack`.cwd(dir)
  await $`npm publish *.tgz --access public --tag ${Script.channel}`.cwd(dir)
}

// Read full app binaries from packages/codo/dist/ instead of packages/cli/dist/
const codoDistDir = path.resolve(dir, "../../packages/codo/dist")
const binaries: Record<string, string> = {}
for (const filepath of new Bun.Glob("*/package.json").scanSync({ cwd: codoDistDir })) {
  const item = await Bun.file(path.join(codoDistDir, filepath)).json()
  binaries[item.name] = item.version
}
console.log("binaries", binaries)
const version = Object.values(binaries)[0]

await $`mkdir -p ./dist/${pkg.name}/bin`
await $`cp ./bin/codo.cjs ./dist/${pkg.name}/bin/codo.cjs`
await Bun.file(`./dist/${pkg.name}/package.json`).write(
  JSON.stringify(
    {
      name: pkg.name,
      bin: { codo: "./bin/codo.cjs" },
      version,
      license: pkg.license,
      repository: { type: "git", url: "git+https://github.com/Mosalah4351/COdo.git" },
      os: ["darwin", "linux", "win32"],
      cpu: ["arm64", "x64"],
      optionalDependencies: binaries,
    },
    null,
    2,
  ),
)

// Publish full app binaries from codo dist
await Promise.all(
  Object.entries(binaries).map(async ([name, version]) => {
    const dirName = name.replace("@codo-ai/", "")
    await publish(path.join(codoDistDir, dirName), name, version)
  }),
)
await publish(`./dist/${pkg.name}`, pkg.name, version)
