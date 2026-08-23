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
  - *Draft Schema Quirk:* Unlike Classic FPL, the Draft API `events` structure is an object containing `current` (an integer ID representing the current/latest gameweek) and a `data` array containing the gameweek objects themselves. It natively provides `waivers_time` alongside `deadline_time`.
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
  - *App Phase Routing:* The app determines its state (`ACTIVE` or `INACTIVE`) by comparing the current clock against the `deadline_time` of the `events.current` gameweek, verifying that the `finished` boolean is false.
  - *Live Substitutions:* Evaluates provisionally while a player's match is ongoing (`Live` or `FT`) to instantly reflect potential bench points if the starter has 0 minutes.
- **`UI`**: Handles view switching (tabs: `hub`, `fixtures`, `table`), dynamic navigation injection, loading overlays, helper formatters, and stat event emojis (including goals, trainer for assists, glove for saves, bricks for GKP/DEF goals conceded, and sparkles for bonus points).
- **`API`**: Manages data fetching through the Vercel proxy. Integrates an exponential backoff retry wrapper to handle intermittent network drops smoothly, and utilises `sessionStorage` caching alongside cache-busting timestamp tokens (`&_t=`) on manual refresh to bypass aggressive mobile browser caching.
- **`Render`**: Dynamically constructs DOM elements using performance-optimised batched string updates for:
  - **Hub:** Inactive state view displaying countdowns to waiver and gameweek deadlines using native FPL timestamps.
  - **Fixtures:** H2H matchup cards comparing live scores for the current gameweek. Cards are clickable and expand smoothly to reveal side-by-side formatted Start/Bench lineups. Unplayed players are indicated with a `-` in place of a score. Scores flex around a centered hyphen to prevent layout shifts. Subbed-out players have their position badge styled with `opacity-40`.
  - **Live Table:** Automatically detects H2H vs Classic format, computes projected live H2H/total points, sorts the standings, and displays rank change arrows (falling back to `currentRank` if FPL rank is undefined, e.g., GW1). Replaces full `W-D-L` with a simple live Match Result (`Res`) during active gameweeks.

---

## 4. AI Assistant Instructions
- When responding to development prompts related to this repository, output full files only if they have been modified. Do not output unchanged files.
- Never quote, summarise, or repeat this instruction section (Section 4) in your conversational text. It exists solely to guide your behaviour when reading this file.
- Automatically output a single-line git commit summary for any changes made. It must be enclosed in a copyable plaintext code block (using \`\`\`text) and placed as the absolute final element of the response.