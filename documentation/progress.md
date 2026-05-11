# Progress Log

A running, dated log of what's been built and decided. Newest entries on top.
Use this when returning to the project after time away — read the top few
entries to recover context.

When you finish something, **add a new entry**. Don't edit older entries
unless fixing a typo.

---

## 2026-05-11 — Project documentation pass

Created the doc set for future development:

- `README.md` rewritten as a concise entry point with a doc index
- `PROJECT_CONTEXT.md` — vision, audience, philosophy, every architectural
  decision and its reasoning, glossary
- `DATABASE_SCHEMA.md` — Prisma models, query examples, reset utilities
- `API_SPEC.md` — every endpoint with payloads
- `CONTENT_GUIDELINES.md` — how to author modules / references / groups
- `TASKS.md` — current backlog (Phase 1: finish Tenses, Phase 2: Articles)
- `progress.md` — this file

Decision: **Phase 1 = finish all 12 tense modules + 3 group tests before
opening Articles or any other group.** Reasoning: the roadmap UI is built
for the 3-group Tenses structure, momentum is on Tenses, and articles will
reference tense forms anyway.

---

## 2026-05-11 — Tense groups (3-tier structure)

Reorganized modules into 3 groups: Present, Past, Future (4 modules each =
12 tenses). Each group has its own intro page, auto-generated summary from
member modules, and a group test. Cascade unlocking: a group unlocks when
the previous group's test is passed.

### Schema changes

- Added `group: "present" | "past" | "future"` (required) and
  `placeholder: boolean` (optional) to module frontmatter
- Added `ModuleGroupFrontmatter`, `ModuleGroupSummary`, `ModuleGroupDetail`,
  `ModuleGroupTest` schemas in `packages/shared/src/schemas.ts`

### Content created

- 3 group MDX files: `content/groups/present.mdx`, `past.mdx`, `future.mdx`
- 9 placeholder modules with stub content (the 5 required sections + empty
  exercises arrays):
  - present-perfect, present-perfect-continuous
  - past-continuous, past-perfect, past-perfect-continuous
  - future-simple, future-continuous, future-perfect, future-perfect-continuous
- Existing modules tagged with `group`:
  - present-simple → present (order 1)
  - present-continuous → present (order 2)
  - simple-past → past (order 1)

### API

- New `GET /groups`, `GET /groups/:slug`, `GET /groups/:slug/test`
- Group loader extracts each member module's `## Quick Summary` section
  via regex to build the auto-summary

### UI

- New `GroupRoadmap` component renders one group as a horizontal stepped path
  ending with Group Summary + Group Test cards
- `ModuleList` now renders 3 group sections with cascade unlocking
- New `/groups/:slug` page (intro + summary cards + test card)
- New `/groups/:slug/test` page (uses existing `ExerciseRunner`, renders
  "coming soon" if no test JSON exists)
- Old `LearningRoadmap` component deleted

---

## 2026-05-11 — Pass threshold (70%) and roadmap unlocking

Three bugs / improvements rolled in:

1. **70% pass threshold** — `PASS_THRESHOLD = 70` constant in shared package.
   The API only sets `completedAt` when score ≥ 70. Once passed, a later
   failed attempt does NOT unset the pass.
2. **Roadmap states** — added "attempted" state (amber) for modules where
   the user has tried but not passed. States: passed (green), current
   (ringed circle), attempted (amber alert), locked (gray lock).
3. **Race condition fix** — `ExerciseRunner` now `await`s the `completeModule`
   POST before transitioning to the done screen. Previously fire-and-forget,
   which meant nav-back could beat the request and the roadmap stayed stale.
4. **Stale-state fix on ModuleList** — refetches progress on `useLocation`
   change and on tab focus, so returning from a finished quiz always shows
   fresh roadmap state.
5. **Done screen redesign** — pass shows trophy + green box + "Continue to
   next module" button; fail shows amber alert + "you need 70%" message,
   "Try a new set" only.

---

## 2026-05-11 — Reference cheat sheets (8 modules)

New top-level "References" tab. Cheat sheets are flat MDX files (no
exercises, no progress tracking, no 5-section validation) categorized
into foundation / vocabulary / structure / exam.

Created 8 references:

- `parts-of-speech` — 8 word categories with ID translations
- `pronouns` — subject/object/possessive comparison table
- `verb-to-be` — am/is/are/was/were across all tenses
- `verb-forms` — V1/V2/V3 explained with native vs ESL terminology note
- `irregular-verbs` — top 100 irregulars by pattern
- `sentence-structure` — 5 tense formulas (S + V + O notation)
- `prepositions` — in/on/at + adjective/verb combos
- `exam-question-types` — TOEFL/IELTS strategies

API: `GET /references`, `GET /references/:slug`. Loader is the same pattern
as modules.

UI: new `ReferenceList` page (grouped by category) and `ReferencePage`
(focused reading view). New shared `<Markdown>` component routes internal
markdown links through React Router (no full-page reload).

Inline links added inside `simple-past/index.mdx` to: verb-forms,
irregular-verbs, verb-to-be, exam-question-types.

---

## 2026-05-11 — Present Simple, Present Continuous modules

Authored two new modules at the same depth as Simple Past:

- **Present Simple** — third-person -s rule (the #1 ID-learner trap),
  spelling rules, do/does auxiliary, "to be" in present, frequency adverbs
  with position rules. 27 exercises.
- **Present Continuous** — am/is/are + Ving, -ing spelling rules (CVC
  doubling, drop -e, -ie → y), stative verbs, `sedang`/`lagi`/`tengah`
  mapping. 25 exercises.

Reordered Simple Past from order 1 → 3 globally. (Later changed to within-
group ordering.)

---

## 2026-05-11 — Forgiving grading + larger question pools

Major upgrade to grading and question selection:

- **`selectQuestions(pool, count)`** in shared — picks a balanced random
  subset by `kind`, then shuffles. Each retry of a quiz pulls a fresh set
  from the pool.
- **Per-attempt subset** — modules now have `questionsPerAttempt` in
  frontmatter; the runner draws that many from the pool per session.
- **Forgiving grading** — case + punctuation + whitespace normalization,
  contractions auto-expanded both ways (38 pairs), Levenshtein ≤ 2 fuzzy
  match for typos, key-token soft match for translations.
- **Three feedback states** — correct (green), soft credit (amber, "small
  spelling slip" or "key tokens present"), wrong (red).
- **New question fields** — `form` (positive/negative/question) for
  balanced selection, `instruction` (shown above prompt), `hint` (revealed
  on demand), `explanation` (shown after grading as "Why").
- **Simple Past pool grew to 27 questions** with explicit was/were
  questions added.

---

## 2026-05-11 — UI overhaul (shadcn + academic theme + dark mode)

Replaced the bare Tailwind UI with shadcn/ui components and a custom
academic-textbook theme.

- Added shadcn primitives: button, card, badge, progress, separator,
  tabs, dropdown-menu
- Theme: warm cream `#FAF7F2` light, deep navy `#131822` dark; rust accent
- Fonts: Lora serif (headings) + Inter sans (body), loaded via
  `<link>` in `index.html`
- ThemeProvider with light/dark/system options, localStorage persistence
- Top nav with 5 tabs: Modules · References · Practice · Progress · Mock Test
- Roadmap component (later replaced by GroupRoadmap)
- Restyled ModuleList, ModulePage, ExerciseRunner, all placeholder pages

Dark-mode contrast issues resolved across multiple iterations: brighter
border, brighter muted-foreground, removed `bg-slate-50 text-slate-900`
hardcoded body class that was overriding theme variables.

---

## 2026-05-11 — Initial scaffold (project starts)

Created the monorepo structure and shipped the first end-to-end module.

### Architecture

- Monorepo with `apps/web` (React + Vite + TypeScript), `apps/api` (Express
  + Prisma), `packages/shared` (Zod schemas + grading)
- Postgres via Docker Compose
- Content as MDX in `content/modules/<slug>/`
- 5-section validation enforced by the loader

### What was built

- Full stack scaffold with Vite proxy, Prisma schema, migration setup
- Helper scripts: `start.sh` (boots everything), `check.sh` (health check)
- Simple Past module — 5 sections + 9 exercises across MC / fill-blank /
  translation
- Module list, module page, exercise runner UI
- API: `GET /modules`, `GET /modules/:slug`, `POST /attempts`,
  `GET /progress`, `POST /progress/:slug/complete`
- Schema: `Attempt`, `ModuleProgress`

### Decisions

- Backend: Node + Express + Prisma (not Next.js full-stack, not Python)
- Grading: rule-based first, LLM grading later behind same interface
- Content: MDX in repo, not in DB
- MVP: one full module end-to-end (proves the pipeline)
- Single user, no auth
