# Contributing to SAM

Thanks for helping improve SAM.

Found a bug? Nice catch. If you can also catch it in a PR, even better.

## Ways to contribute

- Open an issue for bugs or feature ideas.
- Submit a pull request with a focused change.
- Improve docs or tests.

## Before opening a PR

1. Fork and create a branch from `main`.
2. Make focused commits with clear messages.
3. Run quality checks locally:

```bash
npx tsc --noEmit
npm test
npm run lint
npm run build
```

4. Update docs when behavior changes.

## Pull request checklist

- [ ] The change is scoped and intentional.
- [ ] Tests were added or updated when needed.
- [ ] `npm test` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.

## GitHub links

- Issues: https://github.com/benni-kr/sam/issues
- Pull requests: https://github.com/benni-kr/sam/pulls

## Code style

- Use TypeScript-friendly, explicit code.
- Keep components small and composable.
- Prefer incremental changes over broad rewrites.
- Preserve existing behavior unless the task requires a change.
