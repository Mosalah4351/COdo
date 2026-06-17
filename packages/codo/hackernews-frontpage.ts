#!/usr/bin/env bun
// Hacker News front-page scraper
// Usage: bun run hackernews-frontpage.ts

const HN_URL = "https://news.ycombinator.com";

interface HNStory {
  rank: number;
  title: string;
  url: string;
  points: number;
  comments: number;
}

async function scrapeHNFrontPage(): Promise<{ stories: HNStory[]; count: number }> {
  const res = await fetch(HN_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch HN: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();

  const stories: HNStory[] = [];

  // Each story row starts with <tr class="athing submission" ...>
  // We'll split the HTML by these rows and process each segment.
  const storySegments = html.split('<tr class="athing submission"');

  for (const segment of storySegments.slice(1)) {
    // Extract rank
    const rankMatch = segment.match(/<span class="rank">(\d+)\.<\/span>/);
    const rank = rankMatch ? parseInt(rankMatch[1], 10) : 0;

    // Extract title and URL from the first <a> inside titleline
    // The structure is: <span class="titleline"><a href="...">...</a>
    const titleMatch = segment.match(/<span class="titleline">\s*<a href="([^"]+)"[^>]*>([^<]+)<\/a>/);
    let url = titleMatch ? titleMatch[1] : "";
    const title = titleMatch ? titleMatch[2].trim() : "";

    // If the URL is relative (starts with item?id=), prepend the domain
    if (url && !url.startsWith("http")) {
      url = "https://news.ycombinator.com/" + url;
    }

    // Extract points from the subline in the same segment
    // The subline is in the next <tr> after the story row, but since we split by story rows,
    // points might appear later in the same segment or at the start of the next segment.
    const pointsMatch = segment.match(/<span class="score"[^>]*>(\d+)\s+points?<\/span>/);
    const points = pointsMatch ? parseInt(pointsMatch[1], 10) : 0;

    // Extract comments
    // The comments link looks like: <a href="item?id=...">123&nbsp;comments</a> or "discuss"
    const commentsMatch = segment.match(/<a href="item\?id=\d+">(?:\d+)?\s*(&nbsp;)?(comments|comment|discuss)<\/a>/);
    let comments = 0;
    if (commentsMatch) {
      const text = commentsMatch[0];
      const numMatch = text.match(/>(\d+)/);
      if (numMatch) {
        comments = parseInt(numMatch[1], 10);
      } else {
        comments = 0;
      }
    }

    if (title && url) {
      stories.push({ rank, title, url, points, comments });
    }
  }

  // HN sometimes has ads/jobs that are also <tr class="athing"> but not "submission",
  // but since we split by "submission", we should only get actual stories.
  // However, the split approach might miss the last one or include trailing HTML.
  // Let's simply ensure the list is sorted by rank and take the first 30.
  stories.sort((a, b) => a.rank - b.rank);
  const topStories = stories.slice(0, 30);

  return { stories: topStories, count: topStories.length };
}

scrapeHNFrontPage()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
