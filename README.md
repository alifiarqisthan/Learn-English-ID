# learn-english-id

Personal TOEFL/IELTS grammar learning app for Indonesian learners.

Every grammar module is structured around an Indonesian-learner perspective:

1. Grammar explanation in English
2. Comparison with Bahasa Indonesia
3. Common mistakes by Indonesian learners
4. TOEFL/IELTS style exercises
5. Indonesian-to-English translation exercises

## Quick start

Requires Node.js ≥ 20 and Docker Desktop.

```bash
npm install
./scripts/start.sh        # docker compose + migrations + dev servers
./scripts/check.sh        # verify everything is up
```

- Web: http://localhost:5173
- API: http://localhost:4000
- DB: Postgres on 5432 (container `learn-english-id-db`)

Stop: `Ctrl+C` the `start.sh` terminal. To stop just the DB: `npm run db:down`.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + TypeScript + TailwindCSS + shadcn/ui |
| Backend | Node.js (≥20) + Express + Prisma 5 |
| Database | Postgres 16 (Docker) |
| Shared | Zod schemas + grading logic in `packages/shared` |
| Content | MDX files in `content/` (no DB content) |

## Repo layout

```
learn-english-id/
├── apps/
│   ├── api/                    Express + Prisma server
│   │   ├── prisma/             Schema + migrations
│   │   └── src/
│   │       ├── content/        MDX/JSON loaders
│   │       ├── routes/         Express routers
│   │       ├── config.ts
│   │       ├── db.ts           Prisma client
│   │       └── server.ts
│   └── web/                    React app
│       └── src/
│           ├── components/     UI components (shadcn + custom)
│           ├── pages/          Route components
│           ├── lib/            cn() and helpers
│           └── api.ts          Typed fetch wrapper
├── packages/
│   └── shared/src/             Zod schemas, grading, selectQuestions
├── content/
│   ├── groups/                 Tense group MDX (present.mdx, past.mdx, future.mdx)
│   ├── modules/<slug>/         One folder per tense module: index.mdx + exercises.json
│   └── references/             Cheat-sheet MDX (no exercises)
├── documentation/              Project docs (see below)
└── scripts/                    start.sh, check.sh
```

## Documentation

All project docs live in [`documentation/`](documentation/). Read these in
order if you're new to the project or returning after time away:

| Doc | When to read |
|---|---|
| [PROJECT_CONTEXT.md](documentation/PROJECT_CONTEXT.md) | Before any change. Vision, audience, philosophy, key decisions, what NOT to build. |
| [DATABASE_SCHEMA.md](documentation/DATABASE_SCHEMA.md) | Before touching Prisma or writing a query. |
| [API_SPEC.md](documentation/API_SPEC.md) | Before adding a route or wiring a frontend fetch. |
| [CONTENT_GUIDELINES.md](documentation/CONTENT_GUIDELINES.md) | Before authoring a module, reference, or group test. |
| [TASKS.md](documentation/TASKS.md) | The current backlog — what's next. |
| [progress.md](documentation/progress.md) | Running log of what's been built and decided. |

## Common commands

```bash
# Day-to-day
./scripts/start.sh                    # full stack up
./scripts/check.sh                    # health check
npm run dev                           # api + web only (assumes db is up)

# Database
npm run db:up                         # start postgres container
npm run db:down                       # stop postgres container
npm run db:migrate                    # create + apply a new migration
npm run db:generate                   # regenerate Prisma client

# Type checking
npm --workspace packages/shared run typecheck
npm --workspace apps/api run typecheck
npm --workspace apps/web run typecheck
```

## Project status

Single-user app, no authentication. Personal TOEFL/IELTS prep tool.

See [progress.md](documentation/progress.md) for what's been built and [TASKS.md](documentation/TASKS.md) for what's next.
