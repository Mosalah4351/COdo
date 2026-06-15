import { $ } from "bun"

await $`bun ./scripts/copy-icons.ts ${process.env.CODO_CHANNEL ?? "dev"}`

await $`cd ../COdo && bun script/build-node.ts`
