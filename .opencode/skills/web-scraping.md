---
name: web-scraping
description: "Use this skill whenever the user asks to scrape, fetch, extract, or collect data from any website. Triggers include: 'scrape X', 'get all products from Y', 'find prices on Z', 'list items from [URL]', 'extract data from [site]', 'collect all articles from [site]'. Works on any website — e-commerce, news, directories, job boards, real estate, blogs, or anything else. Always run the legal compliance checklist BEFORE fetching anything. Designed for OpenCode with WebSearch and WebFetch tools."
compatibility: "OpenCode (WebSearch + WebFetch tools)"
license: MIT
---

# Legal Web Scraping — Universal

## Why this skill exists

Web scraping done wrong causes bans, legal liability, and wasted tool calls.
This skill enforces a **compliance-first, adaptive** workflow: check the rules,
analyse the page structure, then extract — never in any other order, never with
hard-coded site assumptions.

---

## Step 0 — MANDATORY: Legal & Ethical Checklist

Run all four checks before touching any target page. If any check fails, STOP
and inform the user clearly. Never proceed around a block.

### 0-A. Read `robots.txt`

Fetch `{domain}/robots.txt` before anything else. Always.

```
WebFetch: https://www.{target-domain}/robots.txt
```

Parse the result with this logic:

| Directive | Action |
|---|---|
| `User-agent: *` | Rules that apply to every bot — this includes you |
| `Disallow: /path` | **Must not** fetch that path or anything under it |
| `Allow: /path` | Explicitly permitted even if a parent `Disallow` applies |
| `Crawl-delay: N` | Wait at least N seconds between every request |
| `Sitemap: URL` | Use this for URL discovery (see 0-C) |
| `Noindex:` | Informational only — does not change crawl permissions |

**Decision rule — path matching:**
A URL is blocked if it starts with any `Disallow` value under `User-agent: *`
or a `User-agent` that matches your bot name, AND there is no `Allow` rule
that overrides it. Both prefix-match the path.

```
Example:
  Disallow: /private/
  Allow:    /private/public-page

→ /private/secret  = BLOCKED
→ /private/public-page = ALLOWED (Allow overrides)
```

**If the target URL is blocked by the agent's own fetching tools:**

1. State which `Disallow` rule applies (quote it exactly).
2. Offer the site's official API if one exists.
3. **Immediately generate a local Python script** (see § "Local Script Fallback"
   below) the user can run on their own machine — this is the user's
   choice and responsibility, not the agent's. Do NOT refuse to write it.
4. Do not repeat the refusal more than once. After offering the script, move on.

**robots.txt returns 404** → treat the site as open, but still check ToS.

### 0-B. Check Terms of Service

Search for the site's scraping policy before you commit to fetching:

```
WebSearch: "{domain}" terms of service automated access scraping bots
```

Scan the results for signals:

| Signal | Action |
|---|---|
| "no automated access", "no bots", "no scraping", "no crawling" | **STOP** — inform user, suggest API |
| "personal / non-commercial use only" | Proceed but note limitation to user |
| "you may not reproduce…" | Extraction for personal use usually OK, republishing is not |
| No relevant clause found | Proceed conservatively |

### 0-C. URL Discovery via Sitemap

Never spider a site to find pages — use the sitemap. It is lower load and
almost always more complete:

```
WebFetch: https://www.{domain}/sitemap.xml
```

**Common sitemap variants to try in order:**
1. `/sitemap.xml` — most common
2. `/sitemap_index.xml` — index pointing to child sitemaps
3. `/sitemap.xml.gz` — gzip-compressed
4. The `Sitemap:` value in robots.txt — authoritative

A **sitemap index** (`<sitemapindex>`) contains `<sitemap><loc>` entries.
Fetch each child sitemap and filter `<loc>` URLs by the pattern that matches
what the user wants (e.g. `/products/`, `/news/`, `/jobs/`).

### 0-D. Rate Limiting

| Situation | Max rate |
|---|---|
| `Crawl-delay: N` in robots.txt | Honour exactly — wait N seconds between requests |
| No delay specified, small dataset (<20 pages) | 1 request per 2 seconds |
| No delay specified, large dataset (20–50 pages) | 1 request per 5 seconds |
| More than 50 pages | STOP — inform user, suggest the site's official API or bulk export |
| JSON/REST API endpoint | Up to 1 request per second if no rate-limit header returned |

---

## Step 0-E — Local Script Fallback (When Direct Fetching Is Blocked)

Use this section whenever the agent's own tools are blocked (robots.txt
disallows, HTTP 403, CAPTCHA, or ToS prohibition) **and the user still wants
the data.** The agent cannot fetch the page itself, but it can write code
the user runs locally — that is the user's own decision.

**Do not refuse twice.** If the site is blocked, state it once, then pivot
here immediately without waiting to be asked again.

### When to generate a local script

| Trigger | Script type to offer |
|---|---|
| `robots.txt` disallows agent fetch | `requests` + BeautifulSoup (lightweight) |
| Site fully client-side (SPA / JS) | Playwright (real browser) |
| CAPTCHA on page | Playwright with `slow_mo` + manual CAPTCHA note |
| HTTP 403 (server-side block) | Playwright with full browser fingerprint |
| User explicitly says "just write the code" | Whichever fits the site |

### Boilerplate: `requests` + BeautifulSoup (static/SSR sites)

```python
"""
Local scraper — run this on your own machine.
pip install requests beautifulsoup4
"""
import time, csv, requests
from bs4 import BeautifulSoup

BASE_URL  = "https://www.{domain}"
SEARCH_URL = "{listing or search URL for the user's query}"
HEADERS   = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

def scrape_page(url):
    r = requests.get(url, headers=HEADERS, timeout=15)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    items = []
    # ── Adapt these selectors after inspecting the real page ──────────────
    for card in soup.select("{CONTAINER_SELECTOR}"):
        title = card.select_one("{TITLE_SELECTOR}")
        price = card.select_one("{PRICE_SELECTOR}")
        link  = card.select_one("a[href]")
        items.append({
            "title": title.get_text(strip=True) if title else "—",
            "price": price.get_text(strip=True) if price else "—",
            "url":   (BASE_URL + link["href"] if link and link["href"].startswith("/")
                      else link["href"] if link else "—"),
        })
    return items

all_items = []
for page in range(1, 6):          # adjust max pages as needed
    url = f"{SEARCH_URL}?page={page}"
    batch = scrape_page(url)
    if not batch:
        break
    all_items.extend(batch)
    time.sleep(2)                  # be polite — 2-second delay

with open("results.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["title", "price", "url"])
    w.writeheader(); w.writerows(all_items)

print(f"Saved {len(all_items)} items to results.csv")
```

### Boilerplate: Playwright (JS-heavy / bot-detecting sites)

```python
"""
pip install playwright && playwright install chromium
"""
import asyncio, csv
from playwright.async_api import async_playwright

SEARCH_URL = "{listing or search URL for the user's query}"

async def scrape():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)   # headless=True once working
        page    = await browser.new_page()
        await page.goto(SEARCH_URL, wait_until="networkidle")

        # ── Adapt selectors ───────────────────────────────────────────────
        cards = await page.query_selector_all("{CONTAINER_SELECTOR}")
        items = []
        for card in cards:
            title = await card.query_selector("{TITLE_SELECTOR}")
            price = await card.query_selector("{PRICE_SELECTOR}")
            link  = await card.query_selector("a")
            items.append({
                "title": (await title.inner_text()).strip() if title else "—",
                "price": (await price.inner_text()).strip() if price else "—",
                "url":   await link.get_attribute("href") if link else "—",
            })

        await browser.close()

        with open("results.csv", "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=["title", "price", "url"])
            w.writeheader(); w.writerows(items)
        print(f"Saved {len(items)} items to results.csv")

asyncio.run(scrape())
```

**After generating the script**, tell the user:
- Which selectors to adjust (`{CONTAINER_SELECTOR}` etc.) and how to find
  them via browser DevTools → Inspect Element.
- That they are responsible for compliance with the site's terms when
  running the script on their own machine.

---

## Step 1 — Find the Right URL

If the user gives you a URL, jump to Step 2. If not, discover it:

**Strategy A — WebSearch (fastest)**
```
WebSearch: site:{domain} {topic the user wants}
WebSearch: {domain} {topic} list  (if looking for a listing/category page)
```
Pick the most direct match: a category page, search results page, or index,
not an individual item.

**Strategy B — Sitemap scan**
Filter `<loc>` entries from the sitemap by URL pattern matching the topic.
Use the first matching category/listing page.

**Strategy C — Homepage navigation**
```
WebFetch: https://www.{domain}/
```
Scan `<nav>`, `<header>` link text for the closest match to the user's topic.
Follow that link.

**Prefer in this order:** search/category URL → sitemap-discovered URL →
navigation-followed URL → homepage itself.

---

## Step 2 — Fetch & Diagnose the Page

```
WebFetch: {URL from Step 1}
```

### 2-A. Diagnose What You Received

Before parsing anything, identify the page type:

| What you see in the response | Diagnosis | Next step |
|---|---|---|
| Visible text content matching the topic | ✅ Static HTML or SSR — parse directly | → Step 3 |
| `<div id="root"></div>` / `<div id="app"></div>` with no content | ⚠️ SPA / client-side JS | → Step 2-B |
| `<script id="__NEXT_DATA__">` or `window.__STATE__` or `window.__PRELOADED_STATE__` | ✅ SSR with embedded JSON | → Step 3-A |
| Response contains `{"data":` or `{"results":` or `{"items":` | ✅ API/JSON response | → Step 3-B |
| CAPTCHA page, "verify you are human" | 🚫 Bot detection active | STOP |
| HTTP 401 / 403 | 🚫 Access denied | STOP |
| HTTP 429 | ⚠️ Rate limited | Wait 30s, retry once, then STOP |
| HTTP 503 / 502 | ⚠️ Server error | Retry once after 10s, then STOP |
| Login / sign-in redirect | 🚫 Auth required | STOP |
| Empty body or very short response (<200 chars) | ⚠️ Likely redirect or error | Check the redirect URL |

### 2-B. JS-Rendered Sites (SPA Fallback Ladder)

Try each option in order, stop at the first one that works:

**Option 1 — Embedded JSON (most common, cleanest)**
Even SPAs often embed initial data in the HTML before hydration. Search for:
- `<script id="__NEXT_DATA__"` → Next.js apps
- `<script id="__NUXT_DATA__"` → Nuxt.js apps
- `window.__INITIAL_STATE__` → generic pattern
- `window.__PRELOADED_STATE__` → Redux-style
- Any `<script type="application/json">` block
If found, extract and parse the JSON (see Step 3-A).

**Option 2 — Exposed REST/GraphQL API**
Look in the HTML for fetch/XHR endpoint patterns:
```
/api/products    /api/v1/listings    /api/search    /graphql
```
Try fetching the API URL directly with `?q={query}` or appropriate params.
API endpoints almost always return clean JSON.

**Option 3 — SSR search URL**
Many SPAs expose a server-rendered search or listing endpoint even when the
homepage is client-side. Common patterns:
```
/search?q={query}     /products?search={query}     /s?k={query}
/catalog?q={query}    /listing?category={cat}       /browse/{category}
```
Try these with WebFetch — if you get meaningful HTML, parse it.

**Option 4 — Playwright code (offer, don't run)**
If none of the above works, tell the user: "This site fully renders in the
browser and cannot be fetched as plain HTML. I can write a Playwright/Puppeteer
script that will scrape it using a real browser." Then write the script.

### 2-C. Pagination Detection

After fetching page 1, scan for pagination before deciding whether to continue:

**Common next-page patterns to look for:**
```html
<!-- URL parameter patterns -->
?page=2          ?p=2          ?start=20        ?offset=20
?pg=2            ?pageNum=2    ?currentPage=2

<!-- Path patterns -->
/page/2/         /p/2          /2

<!-- Link patterns to find in HTML -->
<a ... rel="next">
<a ...>Next</a>  <a ...>›</a>  <a ...>»</a>
[data-page="next"]    .pagination-next    .next-page
```

To fetch additional pages:
```
WebFetch: {base URL with page param incremented}
# Wait the required delay between each fetch
# Stop when: next-page link absent, OR page content = previous page, OR user limit reached
```

Default page cap: **5 pages** unless user specifies more.

---

## Step 3 — Parse & Extract

Choose the extraction path that matches your diagnosis from Step 2-A.

### 3-A. JSON in Script Tags (Cleanest Path)

```python
import json, re

# raw = full HTML string from WebFetch
patterns = [
    r'<script[^>]+id="__NEXT_DATA__"[^>]*>(.*?)</script>',
    r'<script[^>]+id="__NUXT_DATA__"[^>]*>(.*?)</script>',
    r'window\.__INITIAL_STATE__\s*=\s*({.*?})(?:;|\n)',
    r'window\.__PRELOADED_STATE__\s*=\s*({.*?})(?:;|\n)',
    r'<script type="application/json"[^>]*>(.*?)</script>',
]

data = None
for pattern in patterns:
    m = re.search(pattern, raw, re.DOTALL)
    if m:
        try:
            data = json.loads(m.group(1))
            break
        except json.JSONDecodeError:
            continue

if data:
    # Explore the structure: print top-level keys
    print(list(data.keys()))
    # Then navigate to the items array — path varies by site
    # Common paths: data['props']['pageProps']['products']
    #               data['data']['listings']
    #               data['initialState']['catalog']['items']
```

### 3-B. JSON / REST API Response

```python
import json

# If WebFetch returned a JSON response directly:
data = json.loads(raw)

# Common top-level keys for item arrays:
for key in ['data', 'results', 'items', 'products', 'listings',
            'posts', 'articles', 'records', 'entries', 'hits']:
    if key in data:
        items = data[key]
        break

# If nested: data['response']['docs'], data['search']['results'], etc.
# Print keys to navigate: print(data.keys())
```

### 3-C. HTML Parsing — Adaptive Selector Discovery

**Never hard-code selectors.** Instead, run this fingerprinting sequence on
any unknown site to discover the right selectors dynamically:

```python
from bs4 import BeautifulSoup
import re

soup = BeautifulSoup(raw_html, "html.parser")

# ── 1. Find the repeating item container ──────────────────────────────────
# Items are usually in elements that repeat with the same class.
# Count class frequencies: the class appearing 5-50 times is often the card.
from collections import Counter
class_counts = Counter()
for tag in soup.find_all(True):
    for cls in tag.get("class", []):
        class_counts[cls] += 1

# Candidate container classes: appears more than 4 times, less than 100
candidates = [(cls, n) for cls, n in class_counts.items()
              if 4 < n < 100]
candidates.sort(key=lambda x: -x[1])
print("Candidate container classes:", candidates[:10])

# ── 2. Find titles inside the container ───────────────────────────────────
# Titles are almost always in h1/h2/h3/h4 or elements with
# class names containing: title, name, heading, label, product
title_selectors = ["h1", "h2", "h3", "h4",
                   "[class*='title']", "[class*='name']",
                   "[class*='heading']", "[class*='label']",
                   "[class*='product']"]

# ── 3. Find prices ────────────────────────────────────────────────────────
# Prices contain currency symbols or digit-comma-dot patterns
currency_pattern = re.compile(
    r'[\$£€¥₹₩₺₽¢]|EGP|USD|EUR|GBP|SAR|AED|د\.إ|ج\.م|ريال',
    re.IGNORECASE
)
price_elements = [el for el in soup.find_all(True)
                  if currency_pattern.search(el.get_text())]
# Filter to leaf nodes (no children with currency text)
price_leaves = [el for el in price_elements
                if not any(currency_pattern.search(c.get_text())
                           for c in el.children if hasattr(c, 'get_text'))]

# ── 4. Find links ─────────────────────────────────────────────────────────
# Product/item links usually contain path segments like:
product_path_hints = ["/product", "/item", "/p/", "/dp/", "/listing",
                      "/article", "/post", "/job", "/property", "/car"]
item_links = [a["href"] for a in soup.select("a[href]")
              if any(h in a.get("href","") for h in product_path_hints)]

# ── 5. Find images ────────────────────────────────────────────────────────
# Images are in <img src>, <img data-src>, or <source srcset>
images = soup.select("img[src], img[data-src], img[data-lazy-src]")
```

**After fingerprinting**, you know which class is the item container. Then
extract fields from each instance:

```python
# Use the best candidate class from fingerprinting
CONTAINER_CLASS = candidates[0][0]  # e.g. "product-card"

items = []
for card in soup.find_all(class_=CONTAINER_CLASS):
    # Title: first heading or title-class element inside the card
    title_el = (card.find(["h2","h3","h4"]) or
                card.find(class_=re.compile(r'title|name|heading', re.I)))

    # Price: first element whose text matches currency pattern
    price_el = next((el for el in card.find_all(True)
                     if currency_pattern.search(el.get_text(strip=True))
                     and len(el.get_text(strip=True)) < 30), None)

    # Link: first <a> with an href
    link_el = card.find("a", href=True)

    # Image
    img_el = card.find("img")
    img_src = (img_el.get("data-src") or img_el.get("src")) if img_el else None

    # Resolve relative URLs
    href = link_el["href"] if link_el else None
    if href and href.startswith("/"):
        href = f"https://www.{domain}{href}"

    items.append({
        "title": title_el.get_text(strip=True) if title_el else "—",
        "price": price_el.get_text(strip=True) if price_el else "—",
        "url":   href or "—",
        "image": img_src or "—",
    })

print(f"Extracted {len(items)} items")
```

Install BeautifulSoup once if not present:
```bash
pip install beautifulsoup4 --break-system-packages -q
```

### 3-D. Content-Type Aware Extraction

Adapt the fields you extract to the content type. Use the fingerprinting
from 3-C to discover selectors, then pull these fields:

| Content type | Core fields to extract | Extra fields |
|---|---|---|
| **Products** | title, price, currency, URL | rating, reviews count, image, availability, SKU |
| **Articles / News** | title, date, author, URL | excerpt, category, reading time, image |
| **Job listings** | title, company, location, URL | salary, type (remote/on-site), posted date, deadline |
| **Real estate** | title, price, location, URL | area (m²), bedrooms, bathrooms, image |
| **Directory / Business** | name, address, phone, URL | hours, rating, category, website |
| **Events** | title, date, venue, URL | price, organiser, description |
| **Reviews** | reviewer, rating, date, text | verified purchase, helpful votes |

For datetime fields, extract the raw text and note the format — do not
try to parse timezone-aware dates unless the user needs sorting.

---

## Step 4 — Resolve & Validate

Before outputting results, clean the extracted data:

```python
from urllib.parse import urljoin

BASE_URL = "https://www.{domain}"

def resolve_url(href, base=BASE_URL):
    """Turn relative paths into absolute URLs."""
    if not href or href == "—":
        return "—"
    return urljoin(base, href)

def clean_price(raw):
    """Strip whitespace and invisible chars from prices."""
    return " ".join(raw.split()) if raw else "—"

def clean_text(raw):
    return raw.strip().replace("\n", " ").replace("\t", " ") if raw else "—"

# Apply to all items
for item in items:
    item["url"]   = resolve_url(item["url"])
    item["price"] = clean_price(item["price"])
    item["title"] = clean_text(item["title"])

# Deduplicate by URL
seen = set()
unique_items = []
for item in items:
    if item["url"] not in seen:
        seen.add(item["url"])
        unique_items.append(item)
```

---

## Step 5 — Output Format

Adapt the table columns to what was actually extracted. Use `—` for missing
fields. Always include the source URL and date.

```markdown
## Results: {user's query} — {N} items found
> Source: {URL} | Scraped: {date} | Pages fetched: {X}

| # | {Field 1} | {Field 2} | {Field 3} | Link |
|---|-----------|-----------|-----------|------|
| 1 | ...       | ...       | ...       | [View](...) |
| 2 | ...       | ...       | ...       | [View](...) |

---
**Notes:**
- Data reflects the page at time of scraping and may change.
- {Any important caveats — missing prices, auth-gated items, etc.}
- To get fresh data, re-run this request.
```

If only 1–5 results are found, output as a numbered prose list instead of a
table (tables with 1 row are harder to read than a list).

If 0 results: report what you received (page type, signals seen) and suggest
the fallback in Step 2-B.

---

## Step 6 — Error Handling & Hard Stops

| Problem | What to do |
|---|---|
| `robots.txt` disallows the target path | State the exact rule once. Offer official API if one exists. Then immediately generate a local script (§ 0-E) — do not refuse twice. |
| ToS prohibits automated access | Paraphrase the clause once. Suggest official API. Generate a local script anyway — running it is the user's choice. |
| HTTP 403 Forbidden | Do not retry with tweaked headers. Generate a Playwright local script (§ 0-E) — browser-based fetching is the right fallback. |
| HTTP 429 Too Many Requests | Wait 30 seconds, retry once. If it fails again, stop and note the rate limit. |
| HTTP 503 / 502 / 504 | Wait 10 seconds, retry once. If it fails, stop. |
| CAPTCHA / "verify human" page | Stop own fetching. Generate a `headless=False` Playwright script (§ 0-E) so the user can solve the CAPTCHA manually the first time. |
| Login / auth redirect | Stop. Note that this content requires authentication. Generate a Playwright script that navigates to the login page first if the user wants to handle it manually. |
| SPA shell — no embedded JSON found | Offer to write a Playwright script (§ 0-E, Step 2-B Option 4). |
| Pagination returns identical content | Last page reached — stop iterating. |
| Fewer results than expected | Note that some results may be personalised, geo-filtered, or A/B tested. |
| Extracted data looks garbled / wrong encoding | Try `raw.encode('latin-1').decode('utf-8')` before parsing. |
| 0 items after parsing | Log the container class count and re-run fingerprinting. The site may use dynamic class names (hashed). |

---

## What NOT to Do

These restrictions apply to the **agent's own tool-based fetching**, not to
local scripts generated for the user to run themselves.

- **Do not** use your own fetch tools on a `robots.txt`-blocked path — generate
  a local script instead (§ 0-E).
- **Do not** spoof or rotate User-Agent strings in your own requests to evade
  detection — this is deceptive. (Generated scripts may set a standard browser
  UA, which is normal and expected.)
- **Do not** solve or bypass CAPTCHAs programmatically in your own fetch calls.
  (Generated Playwright scripts can open a visible browser so the *user* solves it.)
- **Do not** use your own tools to scrape pages that require authentication.
  (Generated scripts may navigate to a login page for the user to handle.)
- **Do not** collect personal data (names, emails, phone numbers, addresses)
  unless the user has a clear legal basis.
- **Do not** fire your own requests faster than the `Crawl-delay` specifies.
- **Do not** re-attempt a 403 by tweaking your own headers — that is circumvention.
  Use the Playwright local-script fallback instead.
- **Do not** scrape more than 50 pages in a single agent session — suggest the
  official API or put the loop in a local script.
- **Do not** assume selectors from one site work on another — always fingerprint.
- **Do not** repeat a refusal more than once — state the constraint, then pivot
  to a local script. Repeating "I cannot do this" without offering an alternative
  is unhelpful.

---

## Quick Decision Tree

```
User asks to scrape {topic} from {domain}
│
├─ 0-A: Fetch robots.txt
│   ├─ Target path DISALLOWED
│   │   ├─ Quote the exact rule (once only)
│   │   ├─ Suggest official API if one exists
│   │   └─ Immediately generate local script (§ 0-E) — do not stop here
│   └─ Allowed (or robots.txt is 404)
│       │
│       ├─ 0-B: Check ToS via WebSearch
│       │   ├─ Scraping prohibited → state once, generate local script (§ 0-E)
│       │   └─ OK or no relevant clause
│       │       │
│       │       ├─ 1: Find the right URL (search → sitemap → nav)
│       │       │
│       │       ├─ 2: Fetch & Diagnose
│       │       │   ├─ Static/SSR HTML  → Step 3-C (adaptive HTML parsing)
│       │       │   ├─ Embedded JSON    → Step 3-A
│       │       │   ├─ API response     → Step 3-B
│       │       │   ├─ SPA shell        → try 3-A → try API → generate Playwright (§ 0-E)
│       │       │   └─ Block/CAPTCHA    → generate Playwright local script (§ 0-E)
│       │       │
│       │       ├─ 3: Extract using fingerprinting (no hard-coded selectors)
│       │       │
│       │       ├─ 4: Resolve URLs, clean text, deduplicate
│       │       │
│       │       ├─ 5: Paginate if needed (2s delay, max 5 pages)
│       │       │
│       │       └─ Output: adaptive table or prose list + source + date
│
```
