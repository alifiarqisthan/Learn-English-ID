# API Specification

The API is an Express server on port `4000`. The web app talks to it through
the Vite dev proxy at `/api/*` → `http://localhost:4000/*`.

Schemas are the source of truth: see
[`packages/shared/src/schemas.ts`](../packages/shared/src/schemas.ts). Every
type referenced below is exported from `@app/shared`.

## Conventions

- All bodies are JSON. `Content-Type: application/json`.
- Errors return `{ "error": "<code>", ...details }` with appropriate HTTP code.
- Validation errors return `400 { error: "ValidationError", issues: [...] }`
  (Zod issues array).
- Unknown server errors return `500 { error: "InternalServerError", message }`.
- 404 returns `{ error: "<Resource> not found" }`.

## Endpoints

### `GET /health`

Liveness check. Always returns 200.

```json
{ "ok": true }
```

---

### `GET /modules`

List all modules across all groups, sorted by frontmatter `order`. Includes
placeholders.

**Response 200** — `ModuleSummary[]`

```json
[
  {
    "slug": "present-simple",
    "title": "Present Simple Tense",
    "level": "A1",
    "order": 1,
    "group": "present",
    "summary": "Talk about habits, facts, routines...",
    "questionsPerAttempt": 9,
    "exerciseCount": 27
  }
]
```

`placeholder: true` is included on placeholder modules.

---

### `GET /modules/:slug`

Full module: frontmatter + the MDX body + the question pool. The web app
calls `selectQuestions()` client-side to draw a balanced subset per attempt.

**Response 200** — `ModuleDetail`

```json
{
  "slug": "simple-past",
  "title": "Simple Past Tense",
  "level": "A2",
  "order": 1,
  "group": "past",
  "summary": "...",
  "questionsPerAttempt": 9,
  "body": "## Explanation\n...",
  "exerciseCount": 27,
  "exercises": [
    { "id": "sp-mc-pos-1", "kind": "multiple_choice", "form": "positive", ... }
  ]
}
```

**Response 404** when the slug doesn't exist on disk.

**Errors:** the loader throws if the MDX is missing one of the 5 required
sections (Explanation, Bahasa Indonesia, Common Mistakes, TOEFL Practice,
Translation Drill). This surfaces as a 500. Fix the content; do not edit the
loader to skip validation.

---

### `POST /attempts`

Record one exercise attempt. Called from the FE on every "Check answer"
click.

**Body** — `AttemptInput`

```json
{
  "moduleSlug": "simple-past",
  "exerciseId": "sp-mc-pos-1",
  "userAnswer": "went",
  "isCorrect": true
}
```

**Side effects:**
1. Inserts a row into `Attempt`.
2. Upserts `ModuleProgress.attempts` (increment by 1). Does not change
   `lastScore` or `completedAt`.

**Response 201** — the created `Attempt` row.

```json
{
  "id": "ckv5...",
  "moduleSlug": "simple-past",
  "exerciseId": "sp-mc-pos-1",
  "userAnswer": "went",
  "isCorrect": true,
  "createdAt": "2026-05-11T08:30:00.000Z"
}
```

---

### `GET /attempts/:slug`

Last 100 attempts for a module slug, newest first. Used for the (future)
"weak spots" practice mode.

**Response 200** — `Attempt[]`

---

### `GET /progress`

All progress rows (one per module slug seen so far).

**Response 200**

```json
[
  {
    "slug": "simple-past",
    "completedAt": "2026-05-10T16:00:00.000Z",
    "lastScore": 78,
    "attempts": 12,
    "updatedAt": "2026-05-10T16:00:00.000Z"
  }
]
```

The web app builds a `Record<slug, { completedAt, lastScore }>` map from this
to drive roadmap state.

---

### `POST /progress/:slug/complete`

Called when a quiz attempt finishes. Sets `lastScore` and conditionally
`completedAt`.

**Body**

```json
{ "score": 85 }
```

Score is clamped to `[0, 100]`. Defaults to `0` if missing.

**Behavior:**
- Always updates `lastScore`.
- Sets `completedAt = NOW()` only if `score >= PASS_THRESHOLD` (70).
- **Preserves a previous `completedAt` if a later attempt fails.** Once you
  pass a module, it stays passed.

**Response 200**

```json
{
  "slug": "simple-past",
  "completedAt": "2026-05-10T16:00:00.000Z",
  "lastScore": 85,
  "attempts": 12,
  "updatedAt": "2026-05-10T16:00:00.000Z",
  "passed": true,
  "threshold": 70
}
```

The slug `"group-test:<group-slug>"` is used for group test results
(e.g. `"group-test:past"`).

---

### `GET /references`

List all reference cheat sheets, sorted by `order`. Grouped by `category`
on the FE.

**Response 200** — `ReferenceSummary[]`

```json
[
  {
    "slug": "verb-forms",
    "title": "Verb Forms Guide (V1, V2, V3)",
    "category": "foundation",
    "order": 4,
    "summary": "...",
    "readingMinutes": 5
  }
]
```

Categories: `foundation` | `vocabulary` | `structure` | `exam`.

---

### `GET /references/:slug`

Full reference: frontmatter + MDX body. Renders directly via `<Markdown>`.

**Response 200** — `ReferenceDetail`

```json
{
  "slug": "verb-forms",
  "title": "Verb Forms Guide (V1, V2, V3)",
  "category": "foundation",
  "order": 4,
  "summary": "...",
  "readingMinutes": 5,
  "body": "## ..."
}
```

References have **no** required-section validation. They're cheat sheets,
not lessons.

---

### `GET /groups`

List the 3 tense groups (Present, Past, Future), sorted by `order`.

**Response 200** — `ModuleGroupSummary[]`

```json
[
  {
    "slug": "present",
    "title": "Present Tenses",
    "order": 1,
    "summary": "...",
    "moduleCount": 4,
    "hasTest": false
  }
]
```

`hasTest` is `true` only when `content/groups/<slug>.test.json` exists with
≥ 1 exercise.

---

### `GET /groups/:slug`

Full group detail: intro MDX + auto-generated summary stitched from each
member module's `## Quick Summary` section + the list of member modules.

**Response 200** — `ModuleGroupDetail`

```json
{
  "slug": "past",
  "title": "Past Tenses",
  "order": 2,
  "summary": "...",
  "moduleCount": 4,
  "hasTest": false,
  "body": "## Welcome to the Past Tenses\n...",
  "autoSummary": [
    {
      "slug": "simple-past",
      "title": "Simple Past Tense",
      "summary": "Use V2 for completed past actions...\n..."
    }
  ],
  "modules": [/* ModuleSummary[] */],
  "testExerciseCount": 0
}
```

`autoSummary[i].summary` is `null` if the module's MDX doesn't contain a
`## Quick Summary` section (placeholders).

---

### `GET /groups/:slug/test`

Group test exercises. **404** if `content/groups/<slug>.test.json` is
missing or empty — the FE renders a "coming soon" page in that case.

**Response 200** — `ModuleGroupTest`

```json
{
  "slug": "past",
  "title": "",
  "exercises": [
    { "id": "past-test-1", "kind": "multiple_choice", ... }
  ]
}
```

The `title` is reserved for future use; the FE doesn't render it yet.

## How the FE consumes these

All frontend calls go through the typed wrapper at
[`apps/web/src/api.ts`](../apps/web/src/api.ts) — never call `fetch` directly
from a component. The wrapper guarantees the response type matches the
shared schema.

## Adding a new endpoint

1. Add the Zod schema to `packages/shared/src/schemas.ts` (request body and
   response shape).
2. Add a route file under `apps/api/src/routes/` and export a router.
3. Mount it in `apps/api/src/server.ts`.
4. Add a typed method to `apps/web/src/api.ts`.
5. Update this doc.
