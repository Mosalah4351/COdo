import { Config } from "effect"

export function truthy(key: string) {
  const value = process.env[key]?.toLowerCase()
  return value === "true" || value === "1"
}

const copy = process.env["CODO_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"]
const fff = process.env["CODO_DISABLE_FFF"]

function enabledByExperimental(key: string) {
  return process.env[key] === undefined ? truthy("CODO_EXPERIMENTAL") : truthy(key)
}

export const Flag = {
  OTEL_EXPORTER_OTLP_ENDPOINT: process.env["OTEL_EXPORTER_OTLP_ENDPOINT"],
  OTEL_EXPORTER_OTLP_HEADERS: process.env["OTEL_EXPORTER_OTLP_HEADERS"],

  CODO_AUTO_HEAP_SNAPSHOT: truthy("CODO_AUTO_HEAP_SNAPSHOT"),
  CODO_GIT_BASH_PATH: process.env["CODO_GIT_BASH_PATH"],
  CODO_CONFIG: process.env["CODO_CONFIG"],
  CODO_CONFIG_CONTENT: process.env["CODO_CONFIG_CONTENT"],
  CODO_DISABLE_AUTOUPDATE: truthy("CODO_DISABLE_AUTOUPDATE"),
  CODO_ALWAYS_NOTIFY_UPDATE: truthy("CODO_ALWAYS_NOTIFY_UPDATE"),
  CODO_DISABLE_PRUNE: truthy("CODO_DISABLE_PRUNE"),
  CODO_DISABLE_TERMINAL_TITLE: truthy("CODO_DISABLE_TERMINAL_TITLE"),
  CODO_SHOW_TTFD: truthy("CODO_SHOW_TTFD"),
  CODO_DISABLE_AUTOCOMPACT: truthy("CODO_DISABLE_AUTOCOMPACT"),
  CODO_DISABLE_MODELS_FETCH: truthy("CODO_DISABLE_MODELS_FETCH"),
  CODO_DISABLE_MOUSE: truthy("CODO_DISABLE_MOUSE"),
  CODO_FAKE_VCS: process.env["CODO_FAKE_VCS"],
  CODO_SERVER_PASSWORD: process.env["CODO_SERVER_PASSWORD"],
  CODO_SERVER_USERNAME: process.env["CODO_SERVER_USERNAME"],
  CODO_DISABLE_FFF: fff === undefined ? process.platform === "win32" : truthy("CODO_DISABLE_FFF"),

  // Experimental
  CODO_EXPERIMENTAL_FILEWATCHER: Config.boolean("CODO_EXPERIMENTAL_FILEWATCHER").pipe(
    Config.withDefault(false),
  ),
  CODO_EXPERIMENTAL_DISABLE_FILEWATCHER: Config.boolean("CODO_EXPERIMENTAL_DISABLE_FILEWATCHER").pipe(
    Config.withDefault(false),
  ),
  CODO_EXPERIMENTAL_DISABLE_COPY_ON_SELECT:
    copy === undefined ? process.platform === "win32" : truthy("CODO_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"),
  CODO_MODELS_URL: process.env["CODO_MODELS_URL"],
  CODO_MODELS_PATH: process.env["CODO_MODELS_PATH"],
  CODO_DB: process.env["CODO_DB"],

  CODO_WORKSPACE_ID: process.env["CODO_WORKSPACE_ID"],
  CODO_EXPERIMENTAL_WORKSPACES: enabledByExperimental("CODO_EXPERIMENTAL_WORKSPACES"),

  // Evaluated at access time (not module load) because tests, the CLI, and
  // external tooling set these env vars at runtime.
  get CODO_DISABLE_PROJECT_CONFIG() {
    return truthy("CODO_DISABLE_PROJECT_CONFIG")
  },
  get CODO_EXPERIMENTAL_REFERENCES() {
    return enabledByExperimental("CODO_EXPERIMENTAL_REFERENCES")
  },
  get CODO_TUI_CONFIG() {
    return process.env["CODO_TUI_CONFIG"]
  },
  get CODO_CONFIG_DIR() {
    return process.env["CODO_CONFIG_DIR"]
  },
  get CODO_PURE() {
    return truthy("CODO_PURE")
  },
  get CODO_PERMISSION() {
    return process.env["CODO_PERMISSION"]
  },
  get CODO_PLUGIN_META_FILE() {
    return process.env["CODO_PLUGIN_META_FILE"]
  },
  get CODO_CLIENT() {
    return process.env["CODO_CLIENT"] ?? "cli"
  },
}
