# Contributing

## Scope

This guide defines how to make safe, reviewable changes in SAM.

## Prerequisites

- Node.js and npm installed
- Dependencies installed via `npm install`

## Local Development

- Start dev server: `npm run dev`
- Lint: `npm run lint`
- Unit tests: `npm test`
- Production build check: `npm run build`

Before opening or updating a PR, run all three quality gates:

1. `npm test`
2. `npm run lint`
3. `npm run build`

## Branch Workflow

- Work on a feature branch (do not commit directly to main)
- Keep commits focused and descriptive
- After finishing an update task, commit and push

Recommended commit message style:

- `Add ...`
- `Refactor ...`
- `Fix ...`
- `Document ...`

## Coding Standards

- TypeScript strict mode is enabled; keep types explicit where helpful
- Favor small, composable functions and deterministic logic
- Avoid hidden coupling between views; use shared state selectors
- Preserve existing public behavior unless the task requires change
- Prefer incremental changes over broad rewrites

## Planner-Specific Notes

- Calendar is Monday-first and depends on `buildMonthDays`
- Multi-day event layout is computed in row-local segments
- Drag-and-drop IDs use prefixes (`event:`, `date:`)
- State transitions belong in `planner-state.tsx`
- Persistence strategy is local-first with optional Supabase sync

## Documentation Standards

- Add concise TSDoc comments for non-trivial exported logic
- Keep README in sync with behavior and scripts
- Update `docs/architecture.md` when changing data flow or rendering strategy

## Testing Guidance

Add or update unit tests when modifying:

- Date grid generation (`lib/planner.ts`)
- Event segmentation/lane assignment (`components/planner/event-overlay.tsx`)
- Planner state transitions (`components/planner/planner-state.tsx`)

Test files live under `tests/` and run with Vitest.

## Pull Request Checklist

- [ ] Changes are scoped and intentional
- [ ] Tests added/updated for behavior changes
- [ ] `npm test` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] README/docs updated when behavior changed
