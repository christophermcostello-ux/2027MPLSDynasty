# Dynasty Draft HQ

## Overview

Dynasty Draft HQ is a full-stack web application for managing live fantasy baseball drafts in a 10-team dynasty league. The app supports real-time draft management with commissioner controls, player filtering/sorting, OTL (Outside The League) drafting mechanics, and roster management with automatic lineup slotting.

**Core Features:**
- **LIVE DRAFT ONLY** - All mock/offline draft functionality has been removed
- Live draft room with 16-round Major League (ML) draft and 10-round Minor League (MiL) draft
- Fixed draft order (Team 1→10 every round, non-snake)
- OTL token system for drafting players outside the main pool
- Player database with detailed stats, splits, and defensive ratings
- Commissioner mode for draft administration
- Real-time sync across all connected clients (1.5s polling)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework:** React 18 with TypeScript
- **Routing:** Wouter (lightweight React router)
- **State Management:** Zustand with Immer for immutable updates
- **UI Components:** shadcn/ui built on Radix UI primitives
- **Styling:** Tailwind CSS v4 with CSS variables for theming
- **Data Fetching:** TanStack Query (React Query)
- **Build Tool:** Vite

**Key Design Decisions:**
- **LIVE-ONLY ARCHITECTURE** - All pages read from `useLiveDraftStore` and `/api/live/...` endpoints
- Player data loaded from static JSON files (`mock_data.json`, `roster_data.json`) into `useLiveDraftStore`
- Theme support (light/dark) and font size preferences stored in localStorage
- **Live Draft State Persistence:** Global `useLiveDraftStore` Zustand store with `LiveDraftProvider` ensures live draft state persists across all routes:
  - RoomId stored in sessionStorage and rehydrated on app mount
  - Single poller in `LiveDraftProvider` (1.5s interval) keeps state synced across all tabs
  - "LIVE: roomId" indicator in header shows connection status
- If no room is set in sessionStorage, header shows "Join Live Draft" button to redirect to `/live/dynasty2025`

### Backend Architecture
- **Runtime:** Node.js with Express
- **Language:** TypeScript (ESM modules)
- **Development:** tsx for running TypeScript directly
- **Production Build:** esbuild bundles server code

**API Structure (Live Draft):**
- `GET /api/live/:roomId/state` - Get full live draft state (teams, picks, current pick)
- `POST /api/live/:roomId/init` - Initialize a new draft room (requires ROOM_CODE)
- `POST /api/live/:roomId/pick` - Make a live draft pick (validates turn, requires ROOM_CODE)
- `POST /api/live/:roomId/undo` - Commissioner undo (requires COMMISH_PIN)
- `POST /api/live/:roomId/pause` - Commissioner pause/resume (requires COMMISH_PIN)
- `POST /api/live/:roomId/set-pick` - Commissioner set pick number (requires COMMISH_PIN)
- `GET /api/live/:roomId/export.csv` - Export picks as CSV

### Data Storage
- **Database:** PostgreSQL with Drizzle ORM
- **Schema Location:** `shared/schema.ts`
- **Storage Implementation:** DatabaseStorage class with MemStorage fallback

**Database Schema:**
- `draft_rooms` table - Live draft room metadata
- `draft_teams` table - Teams with OTL token counts
- `draft_picks` table - Individual picks with player assignments
- `draft_state` table - Current pick number, on-clock team, pause state
- `audit_log` table - Action history for debugging

### Environment Variables (Secrets)
- `DATABASE_URL` - PostgreSQL connection string (auto-provisioned)
- `ROOM_CODE` - Shared code for all draft participants (anti-trolling)
- `COMMISH_PIN` - Commissioner-only PIN for admin actions

### Player Data Model
Players have detailed stats including:
- Identity: ID, name, positions, team, handedness
- Batting splits (vs L and vs R)
- Defensive ratings by position
- Speed, baserunning, durability attributes
- Pitcher-specific: role (SP/RP), endurance, hold, jam ratings

### Draft Rules Implementation
- 10 teams with exactly 100 total keepers league-wide
- ML Draft: 16 rounds × 10 picks = 160 total (4-year contracts)
- MiL Draft: 10 rounds × 10 picks = 100 total (2-year contracts)
- Each team starts with 1 tradeable OTL token
- Draft order read from Excel data (`raw_draft_grid.json`)

## External Dependencies

### Database
- **PostgreSQL** - Primary data store (requires `DATABASE_URL` environment variable)
- **Drizzle ORM** - Type-safe database queries and migrations
- **drizzle-kit** - Migration tooling (`npm run db:push`)

### UI Libraries
- **Radix UI** - Accessible component primitives (dialogs, dropdowns, tabs, etc.)
- **Lucide React** - Icon library
- **cmdk** - Command palette component
- **embla-carousel-react** - Carousel functionality

### Data Processing
- **xlsx** - Excel file parsing for importing player/draft data
- **zod** - Runtime type validation
- **date-fns** - Date formatting utilities

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal** - Error overlay in development
- **@replit/vite-plugin-cartographer** - Development tooling
- **@replit/vite-plugin-dev-banner** - Development environment indicator

### Build & Development
- **Vite** - Frontend build and dev server
- **esbuild** - Server bundling for production
- **tsx** - TypeScript execution for development

## Draft Day Runbook

### Starting a Live Draft Room

1. **Initialize the Room (One-Time Setup)**
   - Navigate to `/live/dynasty2025` (or your chosen room ID)
   - The commissioner should call the init endpoint to create the room:
     ```
     POST /api/live/dynasty2025/init
     Body: { "roomCode": "<ROOM_CODE>" }
     ```
   - This creates 10 teams and 260 picks (16 ML rounds + 10 MiL rounds)

2. **Share the Room Link**
   - Give all participants: `https://your-app.replit.app/live/dynasty2025`
   - Share the ROOM_CODE with all participants (they'll enter it when joining)
   - Only share the COMMISH_PIN with the commissioner

3. **Each Participant Logs In**
   - Select their team from the dropdown
   - Click "Login" and confirm
   - Their team selection is saved for the session

4. **Commissioner Starts the Draft**
   - Click "Commissioner" button
   - Enter the COMMISH_PIN
   - Click "Resume Draft" to start (draft starts paused)

### During the Draft

- **Making Picks**: When it's your turn, click "Make Your Pick", search for a player, and confirm
- **OTL Picks**: Check the "Use OTL Token" box when drafting an OTL player
- **Commissioner Override**: Commissioner can pick for any team using the team dropdown in the pick modal

### Commissioner Controls

- **Pause/Resume**: Stop the draft for breaks
- **Undo Last Pick**: Remove the most recent pick
- **Export CSV**: Download all picks as a spreadsheet

### Verifying Sync (Two Browser Test)

1. Open the room in two different browsers
2. Make a pick in Browser A
3. Within 1-2 seconds, Browser B should show the pick
4. The "Connected" indicator should stay green on both

### Exporting Results

- Click "Export CSV" or visit: `/api/live/dynasty2025/export.csv`
- CSV includes: Pick #, Round, Team, Player, OTL status, Phase, Timestamp

### Troubleshooting

- **"Not your turn"**: Wait for the on-clock indicator to show your team
- **"Invalid room code"**: Re-enter the ROOM_CODE in the join modal
- **"Disconnected" status**: Refresh the page to reconnect
- **Pick not showing**: Wait 2 seconds for sync, then refresh if needed