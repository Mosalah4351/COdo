import { HTTPRequest, Page } from 'puppeteer-core';

interface HNStory {
  rank: number;
  title: string;
  url: string;
  points: number;
  comments: number;
}

export async function scrapeHNFrontPage(page: Page): Promise<{ stories: HNStory[]; count: number }> {
  await page.goto('https://news.ycombinator.com', { waitUntil: 'networkidle2' });

  const stories: HNStory[] = await page.evaluate(() => {
    const rows = document.querySelectorAll('tr.athing');
    const data: HNStory[] = [];

    rows.forEach((row) => {
      const rankElement = row.querySelector('td.title > span.rank');
      const titleElement = row.querySelector('td.title > span.titleline > a');
      const subtextRow = row.nextElementSibling;
      const subline = subtextRow?.querySelector('span.subline');

      if (!titleElement || !subline) return;

      const rank = parseInt(rankElement?.textContent?.replace('.', '') || '0', 10);
      const title = titleElement.textContent?.trim() || '';
      const url = (titleElement as HTMLAnchorElement).href || '';

      const scoreElement = subline.querySelector('span.score');
      const points = parseInt(scoreElement?.textContent?.replace(' points', '').replace(' point', '') || '0', 10);

      const commentsElement = subline.querySelector('a[href^="item?id="]:last-child');
      const commentsText = commentsElement?.textContent?.trim() || '0';
      const comments = commentsText === 'discuss' ? 0 : parseInt(commentsText.replace(' comments', '').replace(' comment', ''), 10);

      data.push({
        rank,
        title,
        url,
        points,
        comments,
      });
    });

    return data;
  });

  return {
    stories,
    count: stories.length,
  };
}
