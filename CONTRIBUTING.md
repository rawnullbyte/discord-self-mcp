# Contributing

## Setup

```bash
npm install
npm run build
npm test
npm run smoke
```

`npm run smoke` spawns the built server over stdio with a fake token and asserts the tools list plus the error path. It does not touch Discord.

## Layout

```
src/index.ts       registers every tool group
src/discord.ts     client, lazy login, resolvers, guards
src/config.ts      environment
src/format.ts      serializers for Discord objects
src/util.ts        zod schemas, permission parsing, result helpers
src/tools/*.ts     one module per group, exported as registerXTools(server)
test/              node:test unit tests and the stdio smoke test
docs/              user documentation
```

## Adding a tool

1. Put it in the matching `src/tools/*.ts` module, or add a new module and register it in `src/index.ts`.
2. Wrap the body in `safely(async () => { ... })` so failures become tool errors instead of crashes.
3. Use the shared `snowflake` schema for ids and `color` for colors.
4. Call `requireWrites()` or `requireAdmin()` before mutating state.
5. Require `confirm: true` for irreversible actions.
6. Return plain objects, not raw Discord classes. Add a serializer in `src/format.ts` when the object is reused.
7. Document it in `docs/tools.md` and, when it is a new group, in the README table.

Never write to stdout. It carries the MCP protocol; use stderr for logs.

## Validation

TypeScript is strict and `noUncheckedIndexedAccess` is on. Cast at the library boundary only, with a narrow local type, not `any` across the file.

## Tests

- Unit tests import from `dist/`, so run `npm run build` first.
- Anything that would need a real token stays out of CI. Test parsing, validation and tool registration instead.
- `npm run smoke` must stay offline and deterministic.

## Style

Match the surrounding code: two spaces, single quotes, semicolons, named exports, no default exports. Keep comments for non-obvious "why" only.

## Commits

Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`). One logical change per commit.
