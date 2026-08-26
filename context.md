# FPL Draft Live Tracker - Project Context

This file serves as the technical handoff and context reference for continuing development of the FPL Draft Live Tracker web application.

---

## 1. Project Overview
- **Objective:** A mobile-first, browser-friendly web app for an FPL Draft league (League ID: `238` by default, override via `?league=` URL param) that provides real-time gameweek scores, live Head-to-Head (H2H) matchups, and projected live standings (table).
- **Architecture:** A decoupled frontend structure utilising standard web technologies (HTML/CSS/JS). Multi-file structure (`index.html`, `app.js`, `styles.css`, `mockData.js`). It is designed to run with a serverless backend proxy (Vercel) to bypass FPL API CORS restrictions. Features exponential backoff, client-side session caching, and a graceful fallback to mock data when the live API/proxy is unreachable.

---

## 2. API Endpoints Documented & Used
The application interfaces with the official Premier League Draft API via the proxy:
- `bootstrap-static`: `/api/proxy?path=bootstrap-static` (Players, teams, current gameweek info). 
  - *Draft Schema Quirk:* The Draft API `events` structure can unpredictably shift between a standard array and an object containing `current` and `data` keys. The initialization logic safely parses both schema variants to prevent breaking the application script.
- `league details`: `/api/proxy?path=league/238/details` (Standings, league entries, H2H matches).
- `team gameweek picks`: `/api/proxy?path=entry/{entry_id}/event/{gameweek}` (Starting XI and bench composition).
- `live points`: `/api/proxy?path=event/{gameweek}/live` (Live points and minutes played per player).
- `fixtures`: `/api/proxy?path=fixtures/?event={gameweek}` (Gameweek real-life fixtures mapped to Classic FPL API to calculate opponents and minutes status).
- `game status`: `/api/proxy?path=game` (Dedicated endpoint to safely determine current gameweek).

---

## 3. Key Frontend Modules (`app.js`)
- **`CONFIG`**: Holds global constants like `LEAGUE_ID` and the absolute Vercel proxy prefix (`PROXY_URL`).
- **`State`**: Centralised state store managing static player metadata, live scores, team lineups, current gameweek, and active team ID. Includes setter functions for controlled mutations.
  - *Crucial API Context:* The FPL Draft API uses two distinct IDs for teams. `id` (league-specific entry ID) is used in H2H `matches` and `standings`. `entry_id` (global manager ID) is used to fetch team picks from the `/entry` endpoint.
  - *App Phase Routing:* The app determines its state (`ACTIVE` or `INACTIVE`) by comparing the current clock against the `deadline_time` of the target gameweek, verifying that the `finished` boolean is false.
  - *Live Substitutions:* Evaluates provisionally while a player's match is ongoing (`Live` or `FT`) to instantly reflect potential bench points if the starter has 0 minutes.
- **`UI`**: Handles view switching (tabs: `hub`, `fixtures`, `table`, `pl-fixtures`), dynamic navigation injection, loading overlays, helper formatters, and stat event emojis (including goals, assists, saves, bonus points, etc.).
  - *Badge Formatting:* Defcon progress (`🧱X`) is strictly restricted to the PL Fixtures tab and is always injected last in the sequence to maintain a clean layout.
- **`API`**: Manages data fetching through the Vercel proxy. Integrates an exponential backoff retry wrapper to handle intermittent network drops smoothly, and utilises `sessionStorage` caching alongside cache-busting timestamp tokens (`&_t=`) on manual refresh to bypass aggressive mobile browser caching.
- **`Render`**: Dynamically constructs DOM elements using performance-optimised batched string updates for:
  - **Hub:** Inactive state view displaying countdowns to waiver and gameweek deadlines using native FPL timestamps.
  - **Fixtures:** H2H matchup cards comparing live scores for the current gameweek. Unplayed players are indicated with a `-`. Subbed-out players have their position badge styled with `opacity-40`.
  - **PL Fixtures:** Real-life fixture cards displaying aggregated live stats for players involved in specific real-world matches.
  - **Live Table:** Automatically detects H2H vs Classic format, computes projected live H2H/total points, sorts the standings, and displays rank change arrows. Replaces full `W-D-L` with a simple live Match Result (`Res`) during active gameweeks.

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