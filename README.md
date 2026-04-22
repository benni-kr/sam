# SAM

Semester Aktivity Manager is a collaborative semester planning app for friends. The current baseline focuses on the Calendar view shell and a separate inbox area for unscheduled events.

## What is in this repo

- A fixed six-month calendar layout for April through September 2026
- Monday-first week layout with visual weekend emphasis
- Distinct striped placeholders for days outside each month
- A shared inbox for unscheduled events across semesters
- Event creation, editing, and deletion flows in centered modals
- A custom popover date picker for event dates
- A grouped App Router structure for the calendar, crosstables, and mobile views
- Shared, typed event data and semester metadata in `lib/planner.ts`
- Shared client-side planner state so all views stay synchronized
- Drag-and-drop foundations for moving events between inbox and calendar dates
- Row-based multi-day event segmentation with deterministic lane assignment
- Local browser persistence for event scheduling placement changes
- Persistence resolver with Supabase sync and local fallback
- Semantic app metadata and a configured global font stack
- Continuous integration that runs linting and production build checks

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- `@dnd-kit/core` for drag and drop
- `react-day-picker` and `date-fns` for the custom date picker

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Supabase Setup

1. Create a Supabase project.
2. Run the SQL migration in [supabase/migrations/20260421_create_planner_event_placements.sql](supabase/migrations/20260421_create_planner_event_placements.sql) using the Supabase SQL editor.
3. Copy [.env.example](.env.example) to `.env.local` and fill in Supabase values.
4. Set `NEXT_PUBLIC_SAM_PLANNER_STORE=supabase` in `.env.local`.

If Supabase is unavailable, the app still writes placements to local storage as a fallback.

## Available Scripts

- `npm run dev` - start the local development server
- `npm run lint` - run ESLint
- `npm run build` - create a production build
- `npm test` - run unit tests with Vitest
- `npm start` - start the production server after a build

## Project Structure

- [app/(planner)/layout.tsx](app/%28planner%29/layout.tsx) - shared planner shell and view tabs
- [app/(planner)/page.tsx](app/%28planner%29/page.tsx) - calendar view entry route
- [app/(planner)/crosstables/page.tsx](app/%28planner%29/crosstables/page.tsx) - who-is-in cross-table route
- [app/(planner)/mobile/page.tsx](app/%28planner%29/mobile/page.tsx) - chronological timeline route
- [app/layout.tsx](app/layout.tsx) - root layout and metadata
- [app/globals.css](app/globals.css) - global styling and theme tokens
- [components/planner/\*](components/planner) - view shells, tabs, and reusable planner UI
- [components/planner/planner-state.tsx](components/planner/planner-state.tsx) - shared planner state provider and actions
- [components/planner/event-overlay.tsx](components/planner/event-overlay.tsx) - week-row multi-day event segmentation and overlay rendering
- [lib/planner.ts](lib/planner.ts) - semester, view, and event data helpers
- [lib/planner-persistence.ts](lib/planner-persistence.ts) - storage adapter and placement serialization
- [docs/architecture.md](docs/architecture.md) - architecture overview and planner data/rendering flow
- [docs/contributing.md](docs/contributing.md) - contribution workflow and quality expectations
- [supabase/migrations/20260421_create_planner_event_placements.sql](supabase/migrations/20260421_create_planner_event_placements.sql) - baseline planner placements table and policies

Persistence defaults to local storage. Supabase mode is available through `NEXT_PUBLIC_SAM_PLANNER_STORE=supabase` when both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured.

Optional rollout logging is available with `NEXT_PUBLIC_SAM_LOG_PERSISTENCE=true` (production) or automatically in development mode.

The Supabase adapter expects a table named `planner_event_placements` with this shape:

- `semester_id` text not null
- `event_id` text not null
- `start_date` text null
- `end_date` text null
- primary key on (`semester_id`, `event_id`)

In Supabase mode, writes are persisted locally first and then synced remotely, so drag-and-drop remains durable even if the network is unavailable.

## Routing

The planner lives in a route group so the visible URLs stay clean while the UI stays organized:

- `/` - calendar view
- `/crosstables` - who-is-in cross-table view
- `/mobile` - chronological list view

The shared header and view tabs live in the grouped layout, so all three routes stay under the same planner chrome.

Semester switching is query-parameter based (`?semester=...`) for now. This keeps URLs simple, preserves shareable deep links between views, and avoids route duplication while the data layer is still in-memory. A route-segment model can be introduced later if we need stricter path semantics or server-driven semester data loading.

## Working Rules

- Keep layout changes incremental and test after each step.
- Prefer typed data structures over ad hoc objects.
- Document non-obvious logic where it helps future maintenance.
- Preserve the fixed semester scope until the next view is introduced.

For detailed engineering guidance, see [docs/architecture.md](docs/architecture.md) and [docs/contributing.md](docs/contributing.md).

## Validation

Before merging changes, run:

```bash
npm test
npm run lint
npm run build
```

Both commands should pass locally and in CI.

## Current Behavior

- The inbox is shared across semesters and only shows unscheduled events.
- Events can be created, edited, and deleted from modal dialogs.
- Dates are selected through a custom calendar popover rather than the native browser input.
- Events remain color-coded by category across the calendar, inbox, crosstables, and mobile views.
