import path from "path"
import { Effect } from "effect"
import { FSUtil } from "@codo-ai/core/fs-util"
import { Global } from "@codo-ai/core/global"
import { loadBusinessBundle } from "./business-bundle.macro" with { type: "macro" }
import { loadBusinessBundle as loadBusinessBundleDev } from "./business-bundle.macro"

function loadBundle() {
  try {
    return loadBusinessBundle()
  } catch (error) {
    if (error instanceof ReferenceError) return loadBusinessBundleDev()
    throw error
  }
}

const bundle = loadBundle()

export const skillDirs = Object.keys(bundle.skills).toSorted()

export const extract = Effect.fn("BusinessBundle.extract")(function* (
  fsys: FSUtil.Interface,
  global: Global.Interface,
) {
  const root = path.join(global.data, "business-skills", bundle.hash)
  const marker = path.join(root, ".extracted")
  if (yield* fsys.existsSafe(marker)) return root
  for (const skillDir of skillDirs) {
    const files = bundle.skills[skillDir]
    for (const relPath of Object.keys(files)) {
      yield* fsys.writeWithDirs(path.join(root, skillDir, relPath), files[relPath])
    }
  }
  yield* fsys.writeWithDirs(marker, bundle.hash)
  return root
})

export * as BusinessBundle from "./business-bundle"
