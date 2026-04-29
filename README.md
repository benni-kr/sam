# SAM

SAM (Semester Activity Manager) is a collaborative planner for semester schedules, shared participation tracking, and unscheduled inbox ideas.

## Features

- Calendar view for semester planning with day-cell quick add
- Crosstables view for "who is in" tracking by category
- Mobile timeline view for quick scanning
- Shared inbox for unscheduled events
- Event create, edit, delete flows
- Managed friends list for participant selection and rename/remove sync
- Drag and drop scheduling with Supabase-backed persistence

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS v4
- dnd-kit
- Vitest

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase Setup

SAM persists full planner events in Supabase (title, category, participants, dates, semester).

1. Apply SQL migrations in `supabase/migrations` to your Supabase project.
2. Configure environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SAM_PLANNER_SCOPE=prod
```

3. Restart the app and verify planner writes/reads.

Notes:

- `NEXT_PUBLIC_SAM_PLANNER_SCOPE` partitions records by environment/project and avoids cross-project collisions in the same Supabase table.
- Supabase credentials are required at runtime.
- Static semester seed events are now bootstrap defaults only. Once persisted events exist, they become the source of truth.

## Scripts

- `npm run dev` - start development server
- `npm run lint` - run ESLint
- `npm run build` - create production build
- `npm test` - run tests
- `npm start` - run production server

## Quality Gate

Before opening a PR:

```bash
npm test
npm run lint
npm run build
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md).

Found a bug? You can report it, and if you feel heroic, fix it too:

- Issues: [https://github.com/benni-kr/sam/issues](https://github.com/benni-kr/sam/issues)
- Pull requests: [https://github.com/benni-kr/sam/pulls](https://github.com/benni-kr/sam/pulls)

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
