# Database Schema

The database stores **only what the user did**. The curriculum (modules,
references, groups, exercises) lives in `content/` as MDX/JSON files. Don't
move curriculum into the DB without strong justification.

Source of truth: [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma).

## Connection

- **Engine:** PostgreSQL 16 (Alpine image, via Docker Compose)
- **Container name:** `learn-english-id-db`
- **Default URL:** `postgresql://app:app@localhost:5432/learn_english_id?schema=public`
- **Configured in:** [`apps/api/.env`](../apps/api/.env) (and `.env.example`)

The Prisma client is constructed once in [`apps/api/src/db.ts`](../apps/api/src/db.ts).

## Models

### `Attempt`

A single exercise answer. One row per question answered.

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `moduleSlug` | `String` | Module slug, e.g. `"simple-past"`. For group tests this is `"group-test:<slug>"`. Indexed. |
| `exerciseId` | `String` | Exercise ID from the JSON pool, e.g. `"sp-mc-pos-1"` |
| `userAnswer` | `String` | What the user typed (raw, not normalized) |
| `isCorrect` | `Boolean` | The grading result. Soft-credit counts as `true`. |
| `createdAt` | `DateTime` | Defaults to `now()` |

Indexed by `moduleSlug` for the "show recent attempts in this module" query.

### `ModuleProgress`

One row per module slug. Tracks the latest score and completion state.

| Field | Type | Notes |
|---|---|---|
| `slug` | `String` (PK) | Module slug. Unique. |
| `completedAt` | `DateTime?` | Set ONLY when a quiz attempt scores ≥ 70. Once set, never cleared by a later failed attempt. |
| `lastScore` | `Int?` | Most recent quiz score (0–100). Updated on every completion attempt. |
| `attempts` | `Int` | Counter incremented on every `POST /attempts`. Default 0. |
| `updatedAt` | `DateTime` | Auto-updated by Prisma `@updatedAt`. |

This row also exists for **group tests** under slug `"group-test:<group-slug>"`
(e.g. `"group-test:past"`).

## Migration policy

- Migrations live in [`apps/api/prisma/migrations/`](../apps/api/prisma/migrations/).
- Always create new migrations with `npm run db:migrate`. Do not edit existing
  migrations.
- Production deploy uses `prisma migrate deploy` (in `scripts/start.sh`). Dev
  uses `prisma migrate dev` (interactive, prompts for migration name).
- If a migration fails on Windows because Prisma can't replace the engine DLL,
  it's because the API dev server is holding it open. Stop the dev server
  before running migrations.

## Pass threshold

`PASS_THRESHOLD = 70` is defined in
[`packages/shared/src/schemas.ts`](../packages/shared/src/schemas.ts). Both the
API (when deciding to set `completedAt`) and the web app (when rendering the
roadmap) import this same constant.

If you change it, run a one-shot SQL update if you want to retroactively pass
or unpass existing attempts. Example:

```sql
-- Mark all rows with lastScore >= 70 as passed
UPDATE "ModuleProgress" SET "completedAt" = "updatedAt"
WHERE "lastScore" >= 70 AND "completedAt" IS NULL;

-- Or clear stale "passes" below the new threshold
UPDATE "ModuleProgress" SET "completedAt" = NULL
WHERE "lastScore" < 70 AND "completedAt" IS NOT NULL;
```

## Querying directly (debugging)

```bash
# Connect to a psql shell
docker compose exec postgres psql -U app -d learn_english_id

# Quick checks
\dt                                          -- list tables
SELECT slug, "lastScore", "completedAt" FROM "ModuleProgress" ORDER BY "updatedAt" DESC;
SELECT COUNT(*) FROM "Attempt";
SELECT "moduleSlug", COUNT(*) FROM "Attempt" GROUP BY "moduleSlug";
```

## Reset utilities

```bash
# Wipe all progress and attempts (careful — irreversible)
docker compose exec postgres psql -U app -d learn_english_id \
  -c 'TRUNCATE TABLE "Attempt", "ModuleProgress" RESTART IDENTITY;'

# Clear only failed attempts' completedAt (in case a pre-70%-rule attempt
# left a falsely "passed" row)
docker compose exec postgres psql -U app -d learn_english_id \
  -c 'UPDATE "ModuleProgress" SET "completedAt" = NULL WHERE "lastScore" < 70;'

# Cheat: mark all Present-group modules as passed (useful for testing
# downstream modules without authoring quizzes)
docker compose exec postgres psql -U app -d learn_english_id -c "
INSERT INTO \"ModuleProgress\" (slug, \"completedAt\", \"lastScore\", attempts, \"updatedAt\")
VALUES
  ('present-simple', NOW(), 100, 1, NOW()),
  ('present-continuous', NOW(), 100, 1, NOW()),
  ('present-perfect', NOW(), 100, 1, NOW()),
  ('present-perfect-continuous', NOW(), 100, 1, NOW())
ON CONFLICT (slug) DO UPDATE
SET \"completedAt\" = EXCLUDED.\"completedAt\",
    \"lastScore\" = EXCLUDED.\"lastScore\",
    \"updatedAt\" = NOW();"
```

## When to add a new model

You probably don't need to. Things that **don't** belong in the DB:

- Module/group/reference content → `content/` files
- Question pools → `content/modules/<slug>/exercises.json`
- Pass threshold, validation rules → `packages/shared`
- Static reference data (irregular verbs list, time markers) → MDX

Things that **would** justify a new model:

- Per-exercise statistics across attempts (e.g. "which questions does the user
  miss most often") — could be a view or computed from `Attempt`
- Spaced-repetition scheduling — would warrant `Review { exerciseId, due, ease }`
- Notes / bookmarks the user takes inside a module — `Note { moduleSlug, body, createdAt }`
- LLM grading audit trail — `LlmGrading { attemptId, model, prompt, response, latency }`

Discuss before adding any of these.
