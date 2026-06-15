// @ts-nocheck

import { COdo } from "@codo-ai/core"
import { ReadTool } from "@codo-ai/core/tools"

const COdo = COdo.make({})

COdo.tool.add(ReadTool)

COdo.tool.add({
  name: "bash",
  schema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The command to run.",
      },
    },
    required: ["command"],
  },
  execute(input, ctx) {},
})

COdo.auth.add({
  provider: "openai",
  type: "api",
  value: process.env.OPENAI_API_KEY,
})

COdo.agent.add({
  name: "build",
  permissions: [],
  model: {
    id: "gpt-5-5",
    provider: "openai",
    variant: "xhigh",
  },
})

const sessionID = await COdo.session.create({
  agent: "build",
})

COdo.subscribe((event) => {
  console.log(event)
})

await COdo.session.prompt({
  sessionID,
  text: "hey what is up",
})

await COdo.session.prompt({
  sessionID,
  text: "what is up with this",
  files: [
    {
      mime: "image/png",
      uri: "data:image/png;base64,xxxx",
    },
  ],
})

await COdo.session.wait()

console.log(await COdo.session.messages(sessionID))
