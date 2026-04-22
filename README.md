# SAM

SAM (Semester Activity Manager) is a collaborative planner for semester schedules, shared participation tracking, and unscheduled inbox ideas.

## Features

- Calendar view for semester planning
- Crosstables view for "who is in" tracking by category
- Mobile timeline view for quick scanning
- Shared inbox for unscheduled events
- Event create, edit, delete flows
- Managed friends list for participant selection and rename/remove sync
- Drag and drop scheduling with local-first persistence

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

Open http://localhost:3000.

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

- Issues: https://github.com/benni-kr/sam/issues
- Pull requests: https://github.com/benni-kr/sam/pulls

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
