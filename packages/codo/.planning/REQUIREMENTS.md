# Requirements

## REQ-01: User Registration & Authentication
- Email/password signup and login
- OAuth via Google and Apple
- JWT session management with refresh tokens
- Profile: display name, avatar, country flag

## REQ-02: Squad Selection
- Pick a 15-player squad from the 48-team player pool
- Budget cap of $100m (virtual currency)
- Max 3 players from any one national team
- Formation constraint: must name starting XI in valid formation (4-4-2, 4-3-3, 3-5-2, etc.)

## REQ-03: Lineup & Transfers
- Set starting XI and bench each matchday
- Auto-sub from bench if starter doesn't play
- Free transfer each gameweek, additional transfers cost 4 points each
- Transfer windows: open between matchdays, locked during live play

## REQ-04: Scoring System
- Points for goals, assists, clean sheets, saves
- Bonus points (3-2-1) per match from algorithm
- Negative points for cards, own goals, penalties missed
- Captain double points, vice-captain if captain doesn't play
- Live scoring: points update in real-time during matches

## REQ-05: Leagues & Leaderboards
- Global leaderboard (all players)
- Create/join private mini-leagues with invite codes
- Friends league: head-to-head or classic format
- League chat / trash-talk messages

## REQ-06: Live Match Integration
- Pull match events (goals, cards, subs) from data feed
- Match ticker: live event stream with player-impact highlights
- Push notifications for key events involving your players

## REQ-07: Mobile-First PWA
- Responsive design, mobile-first
- Installable as PWA from browser
- Offline shell: view squad and last scores without network
- Fast: <3s LCP on 3G

## REQ-08: Admin & Content
- Admin panel to manage player data, prices, injuries
- News/announcements feed
- Rules page and FAQ

## Non-Functional Requirements

## NFR-01: Performance
- LCP < 3s on mobile 3G
- API p50 < 100ms, p99 < 500ms
- Handle 5k concurrent WebSocket connections during live matches

## NFR-02: Reliability
- 99.5% uptime during matchdays
- Graceful degradation: if live feed drops, show last-known scores with "data delayed" banner

## NFR-03: Security
- HTTPS everywhere
- Rate limiting on auth endpoints
- Input sanitization, CSRF protection
- No PII in URLs or logs

## NFR-04: Scale
- Design for 10k users, architecture to support 50k
- Server cost under $200/month at 10k users
