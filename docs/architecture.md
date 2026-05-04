# Architecture

## Purpose

SAM (Semester Activity Manager) is a collaborative semester planning UI with three synchronized representations of the same event data:

- Calendar view (`/`)
- Category-focused crosstables matrix with participation toggles (`/crosstables`)
- Schedule Feed (`/list`)

All views are driven by shared planner state and the same event model, with a dedicated friends master list ensuring consistent participant data across events.

## High-Level Structure

- `app/(planner)/layout.tsx`: Shared planner chrome and route grouping
- `app/(planner)/page.tsx`: Calendar route entry
- `app/(planner)/crosstables/page.tsx`: Crosstables route entry
- `app/(planner)/list/page.tsx`: Schedule feed route entry
- `features/planner/components/layout/app-shell.tsx`: Sidebar, semester switcher, DnD context, drag overlay (now generalized AppShell)
- `features/planner/components/crosstables-view.tsx`: Category participation matrix with per-cell toggles
- `features/planner/state/planner-state.tsx`: State container and state transitions
- `features/planner/components/event-form.tsx`: Shared create/edit form fields and delete confirmation
- `features/planner/components/date-picker.tsx`: Custom popover date picker used by event forms
- `features/planner/components/month-card.tsx`: Per-month calendar rendering
- `features/planner/components/event-overlay.tsx`: Multi-day segment + lane calculation and row overlays
- `features/planner/lib/planner.ts`: Core domain types and static semester/event data
- `features/planner/lib/planner-persistence.ts`: Persistence adapter and store resolver

## Data Model

Core types live in `features/planner/lib/planner.ts`:

- `PlannerEvent`: Event identity, title, category, date range, participants
- `PlannerMonth`: Year/month metadata for rendering
- `PlannerSemester`: Semester identity, months, and events
- `SEMESTER_FRIENDS`: Seed participant names

Dates are represented as `YYYY-MM-DD` strings to simplify persistence and sorting.

## Friends and Participants

SAM enforces a managed friends workflow:

1. A canonical `friends` list is persisted in Supabase in the `planner_friends` table.
2. Event participants are only selected from this friends list during create/edit.
3. Renaming a friend updates that name across all events and the friends table.
4. Removing a friend removes that participant from all events and deletes the friends row.

This keeps participant data consistent and prevents orphaned or stale names.

## State and Data Flow

`PlannerStateProvider` is the single source of truth for planner interactions.

1. Initial state is built from static semester fixtures and friends list as a bootstrap fallback.
2. Persisted semester events and the canonical friends list are hydrated from Supabase together.
3. Hydrated events are sanitized against the loaded friends list so storage never keeps participants outside the master list.
4. Actions update full event records (title, category, participants, `startDate`, `endDate`) and friend list operations (add, rename, remove).
5. Friend mutations trigger participant cleanup across events when removing or renaming and are persisted back to the friends table.
6. Derived selectors feed all views:

- covering events per date
- inbox events across all semesters
- chronological events
- category summaries
- filtered participant visibility

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

## Crosstables Behavior

- Crosstables render one matrix per category (rows: events, columns: participants).
- Each cell shows an × mark if the participant is assigned; click to toggle.
- Date formatting is `DD.MM.YYYY` for readability.
- Participant membership is updated via `toggleParticipant(eventId, participantName)`.
- Date sorting keeps undated events at the bottom of each category table.
- Sidebar filters control visibility:
  - `hideFinished` (default on): hide events past their end date
  - `hideUndated` (default off): hide unscheduled events
  - `hideInactive` (default off): hide friends with no assigned participants
- All filters are URL-backed query params so view state is shareable.

## Event Forms and Friends Management

Create and edit flows share one reusable form component so the field layout and confirmation handling stay consistent.

- Create is opened from the sidebar `+ Add Event` button or any Calendar day-cell quick add button in a centered modal.
- Edit is opened from the crosstables event title link in a centered modal.
- Participants are selected from the managed friends list via toggleable chips.
- Delete uses an inline confirmation block rather than a browser alert.
- Manage Friends opens from the sidebar `Manage friends` button, allowing add/edit/remove of canonical friend names.

The form uses a popover calendar picker instead of the native browser date input so the interaction stays visually consistent across browsers. Week layout is Monday-first.

## Persistence

Persistence is Supabase-backed.

- Supabase sync persists full event objects and the canonical friends table
- Supabase records are partitioned by `planner_scope` to isolate environments/deployments
- Undated events persist with `semester_id = null` and are treated as semester-agnostic in storage.

Store resolution:

- Valid Supabase env vars are required for runtime
- `NEXT_PUBLIC_SAM_PLANNER_SCOPE` selects the logical data partition (default: `default`)

Source-of-truth behavior:

- Seed fixtures are used only as bootstrap defaults.
- Once persisted Supabase data exists, it becomes authoritative.

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

- Semester/event fixtures and seed friends are static in `features/planner/lib/planner.ts`
- Crosstables route is a category-based participation matrix and not a graph canvas
- List route is a compact schedule feed, not a separate responsive app shell
- Friend renames and removals affect all events globally; no event-level friend isolation
- Current Supabase policies allow anon access to planner rows; production rollout should tighten RLS with auth-bound ownership

## Extension Guidance

Recommended next architectural steps:

1. Move static fixtures behind a typed data service boundary
2. Add dedicated reducer tests for planner state transitions
3. Introduce richer event metadata and editing forms
4. Split persistence adapters into dedicated modules if complexity grows
