const stage = process.env.SST_STAGE || "dev"

export default {
  url: stage === "production" ? "https://codo-ai.vercel.app" : `https://${stage}.codo-ai.vercel.app`,
  console: stage === "production" ? "https://codo-ai.vercel.app/auth" : `https://${stage}.codo-ai.vercel.app/auth`,
  email: "help@anoma.ly",
  socialCard: "https://social-cards.sst.dev",
  github: "https://github.com/Mosalah4351/COdo",
  discord: "https://codo-ai.vercel.app/discord",
  headerLinks: [
    { name: "app.header.home", url: "/" },
    { name: "app.header.docs", url: "/docs/" },
  ],
}
