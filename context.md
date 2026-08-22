# FPL Draft Live Tracker - Project Context

This file serves as the technical handoff and context reference for continuing development of the FPL Draft Live Tracker web application in a new chat session.

---

## 1. Project Overview
- **Objective:** A mobile-first, browser-friendly web app for an FPL Draft league (League ID: `238`) that provides real-time gameweek scores, live Head-to-Head (H2H) matchups, and projected live standings (table).
- **Architecture:** Single-page application (SPA) built with Tailwind CSS, vanilla JavaScript (modular object structure), and designed to run with a serverless backend proxy (Vercel) to bypass FPL API CORS restrictions. Features a graceful fallback to mock data when the live API/proxy is unreachable.

---

## 2. API Endpoints Documented & Used
The application interfaces with the official Premier League Draft API:
- `bootstrap-static`: `/api/proxy?path=bootstrap-static` (Players, teams, current gameweek info)
- `league details`: `/api/proxy?path=league/238/details` (Standings, league entries, H2H matches)
- `team gameweek picks`: `/api/proxy?path=entry/{entry_id}/event/{gameweek}` (Starting XI and bench composition)
- `live points`: `/api/proxy?path=event/{gameweek}/live` (Live points and minutes played per player)
- `fixtures`: `/api/proxy?path=fixtures/?event={gameweek}` (Gameweek real-life fixtures mapped to Classic FPL API to calculate opponents and minutes status)
- `game status`: `/api/proxy?path=game` (Dedicated endpoint to safely determine current gameweek).

*Note: In local preview or offline environments, the app automatically falls back to an internal `MockData` object to populate all three tabs.*

---

## 3. Key Frontend Modules (`index.html`)
- **`CONFIG`**: Holds global constants like `LEAGUE_ID` and the absolute Vercel proxy prefix (`PROXY_URL`).
- **`State`**: Centralized state store managing static player metadata, live scores, team lineups, current gameweek, and active team ID. 
  - *Crucial API Context:* The FPL Draft API uses two distinct IDs for teams. `id` (league-specific entry ID) is used in H2H `matches` and `standings`. `entry_id` (global manager ID) is used to fetch team picks from the `/entry` endpoint. `State.entries` is keyed by the league-specific `id` to map correctly to table data.
- **`UI`**: Handles view switching (tabs: `my-team`, `fixtures`, `table`), loading overlays, error banners, and helper formatters (positions badges). Standardises name formatting to "Rory A" when detected.
- **`API`**: Manages data fetching through the Vercel proxy with automatic fallback error handling. Includes specific logic to query the `/api/game` endpoint to determine the current gameweek, bypassing bugs with the `events` object in the Draft API.
- **`Render`**: Dynamically constructs DOM elements for:
  - **My Team:** Position-sorted Starting XI and bench, opponent status badges (`(H)`/`(A)`), fixture state (`Live`, `FT`, `Soon`), and minutes played.
  - **Fixtures:** H2H matchup cards comparing live scores for the current gameweek. Uses soft equality for event matching and fallbacks for standard H2H properties (`entry_1_entry` vs `league_entry_1`).
  - **Live Table:** Automatically detects H2H vs Classic format, computes projected live H2H/total points, sorts the standings, and displays rank change arrows. Classic tables actively use the computed `projectedTotalFPL`.

---

## 4. Deployment Setup (Vercel)
To run this live without CORS issues, you must use this specific structure:

1. **`index.html`**: Root frontend file.
2. **`vercel.json`**: Basic rewrites.
3. **`proxy.js`**: Routes standard requests to Draft API, and paths starting with `fixtures` to the Classic FPL API.