# Architecture

## Purpose

SAM (Semester Aktivity Manager) is a collaborative semester planning UI with three synchronized representations of the same event data:

- Calendar view (`/`)
- Category-focused mind map summary (`/mindmap`)
- Chronological mobile-style timeline (`/mobile`)

All views are driven by shared planner state and the same event model.

## High-Level Structure

- `app/(planner)/layout.tsx`: Shared planner chrome and route grouping
- `app/(planner)/page.tsx`: Calendar route entry
- `app/(planner)/mindmap/page.tsx`: Mind map route entry
- `app/(planner)/mobile/page.tsx`: Mobile route entry
- `components/planner/planner-shell.tsx`: Sidebar, semester switcher, DnD context, drag overlay
- `components/planner/planner-state.tsx`: State container and state transitions
- `components/planner/event-form.tsx`: Shared create/edit form fields and delete confirmation
- `components/planner/date-picker.tsx`: Custom popover date picker used by event forms
- `components/planner/month-card.tsx`: Per-month calendar rendering
- `components/planner/event-overlay.tsx`: Multi-day segment + lane calculation and row overlays
- `lib/planner.ts`: Core domain types and static semester/event data
- `lib/planner-persistence.ts`: Persistence adapter and store resolver

## Data Model

Core types live in `lib/planner.ts`:

- `PlannerEvent`: Event identity, title, category, date range, participants
- `PlannerMonth`: Year/month metadata for rendering
- `PlannerSemester`: Semester identity, months, and events

Dates are represented as `YYYY-MM-DD` strings to simplify persistence and sorting.

## State and Data Flow

`PlannerStateProvider` is the single source of truth for planner interactions.

1. Initial state is built from static semester fixtures.
2. Persisted placements are hydrated and merged by event ID.
3. Actions update only date placement fields (`startDate`, `endDate`).
4. CRUD actions update event metadata in the semester that owns the event.
5. Derived selectors feed all views:
   - covering events per date

- inbox events across all semesters
- chronological events
- category summaries

This keeps all routes synchronized without duplicating logic.

## Calendar Rendering Strategy

Calendar rendering uses a Monday-first week grid.

1. `buildMonthDays` generates week cells with `null` placeholders for out-of-month cells.
2. `buildMonthWeekEventLayouts` computes row-local event segments:
   - intersects events with each visible week
   - splits multi-week events into row segments
   - assigns deterministic lanes for overlap handling
3. `MonthWeekEventOverlay` paints segments as bars over each row.

Design intent:

- Deterministic layout independent of render order
- Row-local computation to reduce cross-row coupling
- Minimum row height with controlled growth for overlap lanes

## Drag and Drop

DnD is provided by `@dnd-kit/core`.

- Draggables: event chips/cards with IDs prefixed by `event:`
- Drop zones:
  - `date:<YYYY-MM-DD>` for scheduling
  - `inbox` for unscheduling
- `PlannerShell` maps drag end targets to state actions:
  - `moveEventToDate`
  - `moveEventToInbox`

## Event Forms

Create and edit flows share one reusable form component so the field layout and confirmation handling stay consistent.

- Create is opened from the sidebar `+ Add Event` button in a centered modal.
- Edit is opened from the event details modal and uses the same shared form.
- Delete uses an inline confirmation block rather than a browser alert.

The form uses a popover calendar picker instead of the native browser date input so the interaction stays visually consistent across browsers.

## Persistence

Persistence is adapter-based.

- Local mode: localStorage (`sam.planner.placements.v1`)
- Supabase mode: REST sync with local-first fallback behavior

Store resolution:

- `NEXT_PUBLIC_SAM_PLANNER_STORE=supabase` + valid Supabase env vars enables remote sync
- Otherwise local mode is used

## Testing and Quality Gates

Unit tests use Vitest and currently cover:

- Monday-first month-day grid behavior
- Week-segment event layout and lane behavior
- Overlay row height growth rules

Validation gates:

- `npm test`
- `npm run lint`
- `npm run build`

## Known Constraints

- Semester/event fixtures are currently static in `lib/planner.ts`
- Mind map route is a structured summary, not a graph canvas yet
- Mobile route is timeline-style but not a separate responsive app shell

## Extension Guidance

Recommended next architectural steps:

1. Move static fixtures behind a typed data service boundary
2. Add dedicated reducer tests for planner state transitions
3. Introduce richer event metadata and editing forms
4. Split persistence adapters into dedicated modules if complexity grows
