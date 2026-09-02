# FPL Draft Live GW Scores App - Project Context

This file serves as the technical handoff and context reference for continuing development of the **FPL Draft Live GW Scores App** web application[cite: 8].

---

## 1. Project Overview
- **Objective:** A mobile-first, browser-friendly web app for an FPL Draft league (League ID: `238` by default, override via `?league=` URL param) that provides real-time gameweek scores, live Head-to-Head (H2H) matchups, and projected live standings (table)[cite: 8].
- **Architecture:** A decoupled frontend structure utilising standard web technologies (HTML/CSS/JS). Multi-file structure (`index.html`, `app.js`, `styles.css`, `mockData.js`). It is designed to run with a serverless backend proxy (Vercel) to bypass FPL API CORS restrictions[cite: 8]. Features exponential backoff, client-side session caching, and a graceful fallback to mock data when the live API/proxy is unreachable[cite: 8].

---

## 2. API Endpoints Documented & Used
The application interfaces with the official Premier League Draft API via the proxy[cite: 8]:
- `bootstrap-static`: `/api/proxy?path=bootstrap-static` (Players, teams, current gameweek info)[cite: 8]. 
  - *Draft Schema Quirk:* The Draft API `events` structure can unpredictably shift between a standard array and an object containing `current` and `data` keys. The initialization logic safely parses both schema variants to prevent breaking the application script[cite: 8].
- `league details`: `/api/proxy?path=league/238/details` (Standings, league entries, H2H matches)[cite: 8].
- `team gameweek picks`: `/api/proxy?path=entry/{entry_id}/event/{gameweek}` (Starting XI and bench composition)[cite: 8].
- `live points`: `/api/proxy?path=event/{gameweek}/live` (Live points and minutes played per player)[cite: 8].
- `fixtures`: `/api/proxy?path=fixtures/?event={gameweek}` (Gameweek real-life fixtures mapped to Classic FPL API to calculate opponents and minutes status)[cite: 8].
- `transactions`: `/api/proxy?path=draft/league/{league_id}/transactions` (Waivers, Free Agents, and Trades processed for the league).
- `game status`: `/api/proxy?path=game` (Dedicated endpoint to safely determine current gameweek)[cite: 8].

---

## 3. Key Frontend Modules (`app.js` & `index.html`)
- **`CONFIG`**: Holds global constants like `LEAGUE_ID` and the absolute Vercel proxy prefix (`PROXY_URL`)[cite: 8].
- **`State`**: Centralised state store managing static player metadata, live scores, team lineups, current gameweek, and active team ID[cite: 8]. 
  - *App Phase Routing:* The app determines its state (`ACTIVE` or `INACTIVE`) by evaluating `is_current` or `is_next` on the target event, and comparing the current clock against the `deadline_time`[cite: 8]. 
  - *Live Substitutions:* Evaluates provisionally while a player's match is ongoing (`Live` or `FT`) to instantly reflect potential bench points if the starter has 0 minutes[cite: 8].
- **`UI`**: Handles view switching (tabs: `hub`, `fixtures`, `table`, `pl-fixtures`), dynamic navigation injection, and loading overlays[cite: 8].
  - *Formatting:* Uses native emoji favicons, local timezone formatting for match kickoffs, and specific badge formatting for stat events (Defcon progress `🧱X` is strictly restricted to maintain a clean layout)[cite: 8].
- **`API`**: Manages data fetching through the Vercel proxy[cite: 8]. Integrates an exponential backoff retry wrapper, `sessionStorage` caching, and cache-busting timestamp tokens (`&_t=`) on manual refresh[cite: 8].
- **`Render`**: Dynamically constructs DOM elements using performance-optimised batched string updates for[cite: 8]:
  - **Hub:** Inactive state view displaying countdowns to waiver and gameweek team selection deadlines. Parses and displays successfully processed transactions (Waivers/Trades/FA).
  - **Upcoming/Live Fixtures:** H2H matchup cards comparing scores. During the `INACTIVE` state, displays past historic encounters and current team form (W-D-L squares). Unplayed players are indicated with a `-`. Subbed-out players have their position badge styled with `opacity-40`[cite: 8].
  - **PL Fixtures:** Real-life fixture cards displaying aggregated live stats for players involved in specific real-world matches[cite: 8], now displaying local kick-off times for unplayed matches.
  - **Live Table:** Automatically detects H2H vs Classic format[cite: 8]. Computes projected live H2H/total points and displays form indicators. Hides rank change arrows and replaces the live match result (`Res`) with full `W-D-L` stats during inactive gameweeks.

---

## 4. Deployment Setup (Vercel)
To run this live without CORS issues, you must use this specific structure alongside the frontend files[cite: 8].