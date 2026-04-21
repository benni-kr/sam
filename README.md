# SAM

Semester Aktivity Manager is a collaborative semester planning app for friends. The current baseline focuses on the Calendar view shell and a separate inbox area for unscheduled events.

## What is in this repo

- A fixed six-month calendar layout for April through September 2026
- An unscheduled inbox area for floating events
- A grouped App Router structure for the calendar, mind map, and mobile views
- Shared, typed event data and semester metadata in `lib/planner.ts`
- Shared client-side planner state so all views stay synchronized
- Drag-and-drop foundations for moving events between inbox and calendar dates
- Local browser persistence for event scheduling placement changes
- Semantic app metadata and a configured global font stack
- Continuous integration that runs linting and production build checks

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- Future integrations planned for `@dnd-kit/core` and Supabase

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

## Available Scripts

- `npm run dev` - start the local development server
- `npm run lint` - run ESLint
- `npm run build` - create a production build
- `npm start` - start the production server after a build

## Project Structure

- [app/(planner)/layout.tsx](app/%28planner%29/layout.tsx) - shared planner shell and view tabs
- [app/(planner)/page.tsx](app/%28planner%29/page.tsx) - calendar view entry route
- [app/(planner)/mindmap/page.tsx](app/%28planner%29/mindmap/page.tsx) - mind map route
- [app/(planner)/mobile/page.tsx](app/%28planner%29/mobile/page.tsx) - mobile timeline route
- [app/layout.tsx](app/layout.tsx) - root layout and metadata
- [app/globals.css](app/globals.css) - global styling and theme tokens
- [components/planner/\*](components/planner) - view shells, tabs, and reusable planner UI
- [components/planner/planner-state.tsx](components/planner/planner-state.tsx) - shared planner state provider and actions
- [lib/planner.ts](lib/planner.ts) - semester, view, and event data helpers
- [lib/planner-persistence.ts](lib/planner-persistence.ts) - storage adapter and placement serialization

## Routing

The planner lives in a route group so the visible URLs stay clean while the UI stays organized:

- `/` - calendar view
- `/mindmap` - mind map placeholder
- `/mobile` - mobile list placeholder

The shared header and view tabs live in the grouped layout, so all three routes stay under the same planner chrome.

Semester switching is query-parameter based (`?semester=...`) for now. This keeps URLs simple, preserves shareable deep links between views, and avoids route duplication while the data layer is still in-memory. A route-segment model can be introduced later if we need stricter path semantics or server-driven semester data loading.

## Working Rules

- Keep layout changes incremental and test after each step.
- Prefer typed data structures over ad hoc objects.
- Document non-obvious logic where it helps future maintenance.
- Preserve the fixed semester scope until the next view is introduced.

## Validation

Before merging changes, run:

```bash
npm run lint
npm run build
```

Both commands should pass locally and in CI.
