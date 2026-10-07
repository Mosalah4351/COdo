// Static UI assets the browser fetches without app-managed credentials, e.g.
// the manifest link in <head>. These bypass auth so the page can install/render
// the manifest icons even when a server password is configured.
export const PUBLIC_UI_PATHS = new Set<string>([
  "/site.webmanifest",
  "/web-app-manifest-192x192.png",
  "/web-app-manifest-512x512.png",
  "/favicon.ico",
  "/favicon-v3.ico",
  "/favicon-v3.svg",
  "/favicon-96x96-v3.png",
  "/apple-touch-icon-v3.png",
])

export function isPublicUIPath(method: string, pathname: string) {
  if (method !== "GET") return false
  if (PUBLIC_UI_PATHS.has(pathname)) return true
  // Allow all assets under /assets/
  if (pathname.startsWith("/assets/")) return true
  return false
}
