# Domain Research: Fork vs Independent Project

Date: 2026-09-24. Method: first principles plus external docs (GitHub Docs, LibreOffice, VSCodium, MariaDB docs). The old roadmap file was deliberately NOT read.

## 1. Three levels of fork (independent axes)

### A. GitHub-level (mechanical, binary)
- Pressing Fork creates a repo in the same fork network: the page shows a forked-from-upstream banner, PRs default back upstream, and git objects are shared across the network (upstream owners can read fork commits).
- Visibility is inherited: public forks of a public repo stay public in one network.
- Exit hatch is mechanical: Settings, Leave fork network (public forks under 1 GB, no child forks) or the manual route: bare-clone, delete the fork, re-create as a new repo, mirror-push. Result: the banner disappears, issues/PRs/stars do NOT carry over, commit hashes DO carry over.
- Cheapest full escape: never press Fork at all — clone upstream locally, push to a fresh repo. No network link ever exists. GitHub documents this as Duplicating a repository.
- Takeaway: GitHub-fork status is a hosting metadata flag, removable in minutes. It proves nothing about the code relationship.

### B. Legal-level (copyright: a derivative at birth)
- Under MIT (and any FOSS license), a project seeded from upstream code IS a derivative work on day one, regardless of the GitHub flag. The license permits this explicitly; the hard obligations are preserving copyright and license notices.
- There is NO legal threshold (no percent-rewritten) where derivative status evaporates: copyright in surviving original expression persists until you have literally replaced it. Clean-room reimplementation is the only path to not-a-derivative, and that is not the goal — MIT wants derivatives.
- What law actually cares about: (1) license compliance (keep MIT attributions), (2) trademarks — names, logos, trade dress belong to upstream even when code is MIT (VS Code binaries vs vscode source; OpenOffice vs LibreOffice). Rebrand early; trademarks are the one legal risk that bites.
- Takeaway: stop trying to legally stop being a derivative. Stay compliant, rebrand, and the law is satisfied permanently.


### C. Community-perception-level (the only level that matters, and it is earned)
- Nobody checks the fork flag. People decide fork-vs-independent from signals: distinct name/brand, own website/docs, own releases with own versioning, own roadmap and governance, and visible technical divergence (features upstream lacks, or an architecture upstream would not take).
- Perception flips when the project is the better upstream for its users — when following the new project gives you something tracking old upstream does not.

## 2. Case studies: forks that became independent

### LibreOffice from OpenOffice.org (2010, The Document Foundation)
- Trigger: Oracle acquired Sun; the community feared for OpenOffice governance.
- What they actually changed:
  1. Governance first: independent non-profit (TDF) — not a code change at all.
  2. Merged the backlog: pulled in Go-oo patches and distro patchsets Oracle never accepted — instant visible divergence at low risk.
  3. Release cadence: time-based regular releases plus security fixes while OpenOffice stalled (last major 4.1 in 2014; LibreOffice ships yearly majors).
  4. Rebrand plus formats: new name/logo, aggressive OOXML compat work.
- Outcome: distros switched defaults; LibreOffice now frames OpenOffice as the stale legacy. Community memory flipped in about 2-3 release cycles.

### MariaDB from MySQL (2009, Monty Widenius after the Sun/Oracle acquisition)
- Started as a drop-in compatible fork — deliberately 100 percent compatible at first.
- What they actually changed, in order:
  1. Drop-in promise to capture the user base with zero migration cost.
  2. Storage engines plus optimizer features MySQL lacked (Aria, ColumnStore, threadpool, parallel replication) — reasons to stay on MariaDB beyond compatibility.
  3. Independent versioning (10.x series diverging from MySQL 5.x/8.x numbering), own release train, own stewardship (MariaDB Foundation plus Corporation).
  4. Distro default swaps (Debian, Fedora, RHEL replaced MySQL with MariaDB) sealed it.
- Outcome: universally treated as an independent DBMS, not a MySQL fork. Note: divergence later broke strict compatibility — independence has a cost curve.


### VSCodium from VS Code (counter-example: independent WITHOUT diverging)
- Changes almost no code: build scripts that clone MIT-licensed vscode source, strip Microsoft telemetry/branding/endpoints, ship MIT binaries under a new name.
- Independence signals are pure packaging/governance: own name, own releases, own docs/site, telemetry-off-by-default stance.
- Lesson: when the value proposition is policy (privacy/licensing), near-zero code divergence still reads as independent. Code percent is not the metric — distinct reason to exist is.
- Nextcloud from ownCloud (2016) follows the LibreOffice playbook: founder-led fork plus same-day rebrand plus own company/governance plus faster enterprise cadence.

## 3. Concrete thresholds and criteria (checklist, not law)

No source consulted gives a code-percentage rule, because none exists. What recurs:

1. GitHub network link — bar: the forked-from banner is gone (Leave-network or fresh-repo push). Why: removes the literal fork label every visitor sees.
2. Brand — bar: own name, logo, README first paragraph with zero upstream marks. Why: trademark safety plus first-impression independence.
3. Release independence — bar: own tags/versions/changelog, installable without referencing upstream. Why: a project you install beats a repo you compare.
4. Governance — bar: own org, own issue-tracker decisions, CONTRIBUTING that never mentions upstream sync. Why: contributors need to know who decides.
5. Directional divergence — bar: at least 1 user-visible capability or architectural stance upstream would not take. Why: the reason to exist — 5-15 percent of surface can suffice.
6. Upstream-lag tolerance — bar: can go 1-2 upstream release cycles without merging and still ship. Why: proves you are not a mirror with patches.
7. Attribution hygiene — bar: upstream copyright/license notices preserved in LICENSE/NOTICE, origin acknowledged. Why: keeps MIT compliance trivially defensible.

Ordering that worked historically: 2 plus 4 plus 3 first (brand, governance, releases — all achievable without touching code), then 5 (divergent features), then 1 (mechanical de-fork whenever convenient — it is cosmetic). Legal compliance (7) is continuous.

Rule of thumb for code: nothing in the case studies suggests a 50-percent-plus rewrite was ever needed. LibreOffice and MariaDB were perceived as independent within about 2-3 release cycles while still sharing most code with upstream. VSCodium proves near-zero can suffice when the differentiator is policy/packaging. Optimize for one capability users can only get from you, not for a rewrite percentage.

## Sources
- GitHub Docs: About forks
- GitHub Docs: Detaching a fork
- GitHub Docs: Duplicating a repository
- LibreOffice: Who are we, plus LibreOffice vs OpenOffice
- VSCodium site (plus linked MS maintainer comment on product.json builds)
- MariaDB product docs (history per public record: 2009 fork by the MySQL founder)

## Risks and caveats
- Detach-via-delete loses issues/PRs/stars — plan the cutover, or use Leave-network.
- Diverging version numbers (MariaDB path) eventually break cherry-picks; budget merge cost.
- Rebrand must include binary/product names, telemetry endpoints, update URLs, extension marketplace defaults — misses here re-trigger just-a-fork perception.
- Wikipedia was unreachable from this environment; case-study dates verified against project-owned pages where possible.

