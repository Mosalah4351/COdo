import scrapeContent from "./scrape/scrape/SKILL.md" with { type: "text" }
import briefContent from "./scrape/brief/SKILL.md" with { type: "text" }
import staticFetchContent from "./scrape/static-fetch/SKILL.md" with { type: "text" }
import browserRenderContent from "./scrape/browser-render/SKILL.md" with { type: "text" }
import apiDiscoveryContent from "./scrape/api-discovery/SKILL.md" with { type: "text" }
import authSessionContent from "./scrape/auth-session/SKILL.md" with { type: "text" }
import politenessContent from "./scrape/politeness/SKILL.md" with { type: "text" }
import checkpointsContent from "./scrape/checkpoints/SKILL.md" with { type: "text" }
import deliverContent from "./scrape/deliver/SKILL.md" with { type: "text" }

export interface ScrapeSkill {
  name: string
  description: string
  content: string
}

export const scrapeSkills: ScrapeSkill[] = [
  {
    name: "scrape",
    description:
      "Umbrella for the scraping skill set - routes a web-extraction request into the scrape:* sub-skills (brief, rungs, politeness, checkpoints, delivery)",
    content: scrapeContent,
  },
  {
    name: "scrape:brief",
    description:
      "Plan a scraping run: topics with schema contracts, seed URL discovery, politeness budget, auth check, swarm layout",
    content: briefContent,
  },
  {
    name: "scrape:static-fetch",
    description:
      "Ladder rung 1: plain HTTP GET with browser-realistic headers, challenge-page detection, honeypot avoidance",
    content: staticFetchContent,
  },
  {
    name: "scrape:browser-render",
    description:
      "Ladder rungs 2-3: Playwright headless with session warming and human pacing, Patchright hardening mode, opportunistic API capture, CAPTCHA stop rule",
    content: browserRenderContent,
  },
  {
    name: "scrape:api-discovery",
    description:
      "Ladder rung 4: find internal JSON/GraphQL endpoints via network capture, persisted-query handling, pagination amplification, JS-bundle mining",
    content: apiDiscoveryContent,
  },
  {
    name: "scrape:auth-session",
    description:
      "Ladder rung 5, consent-gated: authenticated crawling via manually-created storageState sessions",
    content: authSessionContent,
  },
  {
    name: "scrape:politeness",
    description:
      "Cross-cutting ban-avoidance rules: delay tiers, concurrency caps, backoff schedule, session warming, cache rules, robots.txt ask-first",
    content: politenessContent,
  },
  {
    name: "scrape:checkpoints",
    description:
      "Durability layer: JSONL checkpoint schema with provenance quintet, run manifest, resume semantics, layered merge/dedupe",
    content: checkpointsContent,
  },
  {
    name: "scrape:deliver",
    description:
      "QA gates (schema, ranges, uniqueness, completeness, diversity, freshness, drift) then Excel workbook generation via business:xlsx-official",
    content: deliverContent,
  },
]

export const SCRAPE_SKILL_NAMES = new Set(scrapeSkills.map((s) => s.name))

export function isScrapeSkill(name: string): boolean {
  return SCRAPE_SKILL_NAMES.has(name)
}
