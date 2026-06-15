declare global {
  const CODO_VERSION: string
  const CODO_CHANNEL: string
}

export const InstallationVersion = typeof CODO_VERSION === "string" ? CODO_VERSION : "local"
export const InstallationChannel = typeof CODO_CHANNEL === "string" ? CODO_CHANNEL : "local"
export const InstallationLocal = InstallationChannel === "local"
