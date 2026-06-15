declare global {
  const COdo_VERSION: string
  const COdo_CHANNEL: string
}

export const InstallationVersion = typeof COdo_VERSION === "string" ? COdo_VERSION : "local"
export const InstallationChannel = typeof COdo_CHANNEL === "string" ? COdo_CHANNEL : "local"
export const InstallationLocal = InstallationChannel === "local"
