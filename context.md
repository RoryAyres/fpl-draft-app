# FPL Draft Live Tracker - Project Context

This file serves as the technical handoff and context reference for continuing development of the FPL Draft Live Tracker web application.

---

## 1. Project Overview
- **Objective:** A mobile-first, browser-friendly web app for an FPL Draft league (League ID: `238`) that provides real-time gameweek scores, live Head-to-Head (H2H) matchups, and projected live standings (table)[cite: 2].
- **Architecture:** A decoupled frontend structure utilising standard web technologies (HTML/CSS/JS). Multi-file structure (`index.html`, `app.js`, `styles.css`, `mockData.js`). It is designed to run with a serverless backend proxy (Vercel) to bypass FPL API CORS restrictions. Features exponential backoff, client-side session caching, and a graceful fallback to mock data when the live API/proxy is unreachable.

---

## 2. API Endpoints Documented & Used
The application interfaces with the official Premier League Draft API via the proxy[cite: 2]:
- `bootstrap-static`: `/api/proxy?path=bootstrap-static` (Players, teams, current gameweek info)[cite: 2]
- `league details`: `/api/proxy?path=league/238/details` (Standings, league entries, H2H matches)[cite: 2]
- `team gameweek picks`: `/api/proxy?path=entry/{entry_id}/event/{gameweek}` (Starting XI and bench composition)[cite: 2]
- `live points`: `/api/proxy?path=event/{gameweek}/live` (Live points and minutes played per player)[cite: 2]
- `fixtures`: `/api/proxy?path=fixtures/?event={gameweek}` (Gameweek real-life fixtures mapped to Classic FPL API to calculate opponents and minutes status)[cite: 2]
- `game status`: `/api/proxy?path=game` (Dedicated endpoint to safely determine current gameweek)[cite: 2].

---

## 3. Key Frontend Modules (`app.js`)
- **`CONFIG`**: Holds global constants like `LEAGUE_ID` and the absolute Vercel proxy prefix (`PROXY_URL`)[cite: 2].
- **`State`**: Centralised state store managing static player metadata, live scores, team lineups, current gameweek, and active team ID[cite: 2]. Includes setter functions for controlled mutations.
  - *Crucial API Context:* The FPL Draft API uses two distinct IDs for teams. `id` (league-specific entry ID) is used in H2H `matches` and `standings`. `entry_id` (global manager ID) is used to fetch team picks from the `/entry` endpoint[cite: 2].
- **`UI`**: Handles view switching (tabs: `fixtures`, `table`), loading overlays, helper formatters, and stat event emojis (including goals, trainer for assists, glove for saves, bricks for GKP/DEF goals conceded, and sparkles for bonus points)[cite: 2].
- **`API`**: Manages data fetching through the Vercel proxy. Integrates an exponential backoff retry wrapper to handle intermittent network drops smoothly, and utilises `sessionStorage` caching alongside cache-busting timestamp tokens (`&_t=`) on manual refresh to bypass aggressive mobile browser caching.
- **`Render`**: Dynamically constructs DOM elements using performance-optimised batched string updates for:
  - **Fixtures:** H2H matchup cards comparing live scores for the current gameweek. Cards are clickable and expand smoothly to reveal side-by-side formatted Start/Bench lineups. Unplayed players are indicated with a `-` in place of a score. Scores flex around a centered hyphen to prevent layout shifts[cite: 2].
  - **Live Table:** Automatically detects H2H vs Classic format, computes projected live H2H/total points, sorts the standings, and displays rank change arrows. Classic tables actively use the computed `projectedTotalFPL`[cite: 2].

---

## 4. Deployment Setup (Vercel)
To run this live without CORS issues, you must use this specific structure alongside the frontend files.

### `vercel.json`
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,OPTIONS" }
      ]
    }
  ]
}