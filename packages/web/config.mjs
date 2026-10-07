const stage = process.env.SST_STAGE || "dev"

export default {
  url: stage === "production" ? "https://codo-ai.vercel.app" : `https://${stage}.codo-ai.vercel.app`,
  console: stage === "production" ? "https://codo-ai.vercel.app/auth" : `https://${stage}.codo-ai.vercel.app/auth`,
  email: "help@anoma.ly",
  // Empty string disables the remote social-card service; consumers fall back to the local static asset.
  // Set to a deployed card-service URL (e.g. https://social-cards.<your-domain>) to re-enable generated OG images.
  socialCard: "",
  github: "https://github.com/Mosalah4351/COdo",
  headerLinks: [
    { name: "app.header.home", url: "/" },
    { name: "app.header.docs", url: "/docs/" },
  ],
}
