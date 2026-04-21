# SAM

Semester Aktivity Manager is a collaborative semester planning app for friends. The current baseline focuses on the Calendar view shell and a separate inbox area for unscheduled events.

## What is in this repo

- A fixed six-month calendar layout for April through September 2026
- An unscheduled inbox area for floating events
- Shared, typed event data in the main page component
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

- [app/page.tsx](app/page.tsx) - planner shell UI and sample event data
- [app/layout.tsx](app/layout.tsx) - root layout and metadata
- [app/globals.css](app/globals.css) - global styling and theme tokens

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
