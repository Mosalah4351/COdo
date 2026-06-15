/**
 * Application-wide constants and configuration
 */
export const config = {
  // Base URL
  baseUrl: "https://COdo.ai",

  // GitHub
  github: {
    repoUrl: "https://github.com/anomalyco/COdo",
    starsFormatted: {
      compact: "160K",
      full: "160,000",
    },
  },

  // Social links
  social: {
    twitter: "https://x.com/COdo",
    discord: "https://discord.gg/COdo",
  },

  // Static stats (used on landing page)
  stats: {
    contributors: "900",
    commits: "13,000",
    monthlyUsers: "7.5M",
  },
} as const
