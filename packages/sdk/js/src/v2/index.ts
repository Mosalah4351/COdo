export * from "./client.js"
export * from "./server.js"

import { createCOdoClient } from "./client.js"
import { createCOdoServer } from "./server.js"
import type { ServerOptions } from "./server.js"

export * as data from "./data.js"

export async function createCOdo(options?: ServerOptions) {
  const server = await createCOdoServer({
    ...options,
  })

  const client = createCOdoClient({
    baseUrl: server.url,
  })

  return {
    client,
    server,
  }
}
