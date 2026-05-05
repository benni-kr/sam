# Architecture

## Purpose

SAM (Semester Activity Manager) is a collaborative planner designed to handle two distinct types of scheduling:

1. **Chronological Events:** Date-specific occurrences (Exams, Trips) represented across the Calendar (`/`), Crosstables (`/crosstables`), and List (`/list`) views.
2. **Repeating Routines:** Day-of-the-week recurring blocks (Lectures, Sports) represented in the Weekly Schedule (`/week`).

Both scheduling domains share a centralized "Friends" master list to ensure consistent participant data across all views.

## Core Design Principles

The repository strictly adheres to **Domain-Driven Design (DDD)** and the **Single Responsibility Principle (SRP)**. Code is organized by feature domain rather than technological concern to prevent "god files" and heavily entangled logic.

### Directory Structure

- **`app/`**: Next.js App Router setup. Responsible _only_ for routing, metadata, and high-level layout composition.
- **`components/`**: Global, domain-agnostic UI.
  - `ui/`: "Dumb", highly reusable components (TimePicker, EventPreviewModal, Checkbox). Cannot import from `features/`.
  - `layout/`: Global layout shells that span multiple domains (AppShell, SidebarContent, SidebarInbox).
- **`features/`**: The core business logic, isolated by domain.
  - `planner/`: Calendar view, Crosstables, Date-based event models, and Calendar state.
  - `weekly-schedule/`: Timetable rendering, Time-based event models, and Weekly state.
  - `friends/`: Participant management, persistence, and Friends state.
  - `auth/`: Authentication bounds and user session management.

## Data Model & UI Configuration

SAM's models are split to respect their domains:

- `PlannerEvent`: Requires specific `startDate` / `endDate` strings (`YYYY-MM-DD`).
- `PlannerWeekEvent`: Requires a specific `day` ("Mon", "Tue") and `startTime` / `endTime` strings ("08:15").

### The Theme Object Pattern

To keep the UI DRY (Don't Repeat Yourself), styling is driven by **Theme Objects**. Instead of scattering Tailwind classes across multiple UI components, all category styles are centralized into single sources of truth:

- `features/planner/lib/category-config.ts` exports `getCalendarTheme(category)` returning `{ badge, section, heading, accent, checkbox }`.
- `features/weekly-schedule/lib/week-category-config.ts` exports `getWeekTheme(category)` returning `{ card, accent }`.

UI components simply query the theme object once and apply the resulting string classes.

## Friends and Participants

SAM enforces a managed friends workflow:

1. A canonical `friends` list is persisted in Supabase in the `planner_friends` table.
2. Event participants are only selected from this friends list during create/edit.
3. Renaming a friend updates that name across all events and the friends table.
4. Removing a friend removes that participant from all events and deletes the friends row.

This keeps participant data consistent and prevents orphaned or stale names.

## State and Data Flow

State is managed via modular contexts/reducers for each feature (e.g., `usePlannerState`, `useFriendsState`).

1. The app initializes with a clean slate.
2. Persisted semester events, weekly appointments, and the canonical friends list are hydrated from Supabase together.
3. Hydrated events are sanitized against the loaded friends list so storage never keeps participants outside the master list.
4. Actions (create/update/delete) update local state and are persisted to Supabase.
5. Derived selectors feed the UI without duplicating logic (e.g., covering events per date, chronological sorting, category groupings).

## Rendering Strategies

### Calendar Rendering

The Calendar utilizes a Monday-first month grid.

1. `buildMonthDays` generates week cells with `null` placeholders for out-of-month bounds.
2. `buildMonthWeekEventLayouts` computes row-local event segments (splits multi-week events, assigns deterministic lanes for overlap handling).
3. `MonthWeekEventOverlay` paints segments as bars over each row.

### Weekly Schedule Rendering

The Week view renders absolute-positioned blocks on a daily time grid.

1. `buildDayLayouts` groups overlapping events and dynamically calculates `laneCount` to split column width equitably.
2. Start times are clamped to a maximum of `23:45` to prevent layout overflow before the `24:00` day boundary.
3. Height is dynamically measured via `ResizeObserver` to calculate the visual scale (`minuteScale`) for the UI overlay.

## Drag and Drop (DnD)

DnD is provided by `@dnd-kit/core` on the Calendar view.

- **Draggables:** Event chips/cards with IDs prefixed by `event:`.
- **Drop zones:**
  - `date:<YYYY-MM-DD>` for scheduling.
  - `inbox` for unscheduling.
- Maps drag-end targets directly to state actions (`moveEventToDate`, `moveEventToInbox`).

## Persistence

Persistence is Supabase-backed.

- Supabase sync persists full event objects, weekly events, and the canonical friends table.
- Supabase records are partitioned by `planner_scope` to isolate environments/deployments.
- Store resolution: `NEXT_PUBLIC_SAM_PLANNER_SCOPE` selects the logical data partition (default: `default`).

## Testing and Quality Gates

Unit tests use Vitest and currently cover:

- Monday-first month-day grid behavior
- Week-segment event layout and lane behavior
- Reducer state transitions

Validation gates before PRs:

- `npm test`
- `npm run lint`
- `npm run build`

## Extension Guidance

Recommended next architectural steps:

1. Add dedicated reducer tests for the newly isolated `features/weekly-schedule` and `features/friends` state transitions.
2. Introduce richer event metadata (e.g., location strings or URLs) within the specialized forms.
3. Split Supabase persistence adapters into dedicated feature modules if database complexity grows.
4. Current Supabase policies allow anon access to planner rows; production rollout should tighten RLS with auth-bound ownership.
