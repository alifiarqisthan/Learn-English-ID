# Project Context

Read this first. It captures what the project is, who it's for, and the
decisions that shape every other choice. Do not change architecture or scope
without first checking that you understand what's here.

## Vision

A personal TOEFL/IELTS grammar learning web app for **one user** — an
Indonesian learner preparing for the exam — that teaches English grammar
**through the lens of Bahasa Indonesia**.

Most English-learning resources assume a Western-language background.
Indonesian learners face a specific set of cognitive obstacles that those
resources don't address. This app exists to fix that.

## Audience

**Primary user:** Indonesian student or professional preparing for TOEFL/IELTS
who has working English (~B1) but needs to systematically fix the grammar
mistakes that come from translating from Bahasa Indonesia.

**This is a single-user app.** No authentication, no multi-tenancy, no user
accounts. All progress is "yours."

## Why Indonesian-specific?

Bahasa Indonesia and English differ in ways that cause predictable mistakes:

| Feature | Bahasa Indonesia | English |
|---|---|---|
| Verb tense | Verbs never change form | Verbs change form for tense (V1/V2/V3) |
| Subject-verb agreement | Verbs never change for subject | Third-person -s rule |
| Articles | None | a/an/the (required) |
| "to be" copula | Usually dropped | Always required (am/is/are/was/were) |
| Plural marking | Reduplication or quantifier | -s on countable nouns |
| Auxiliary verbs | None | do/does/did for negative & question |
| Adjective position | After noun (mobil merah) | Before noun (red car) |
| Pronoun forms | One form (saya, dia) | Subject/object/possessive (I/me/my/mine) |

A native English teacher will explain "the simple past" in English. The same
explanation will not stick for an Indonesian learner because they need to
**unlearn** the Indonesian default first.

## Learning philosophy

Every grammar module follows the same 5-section structure (enforced by the
content loader):

1. **Explanation** — the English rule, with examples
2. **Bahasa Indonesia** — the contrast: what's different about Indonesian, why
   that causes mistakes, side-by-side examples
3. **Common Mistakes** — concrete wrong → right pairs, each tagged with the
   underlying Indonesian habit that causes it
4. **TOEFL Practice** — exam-style exercises (multiple choice, fill-in-the-blank)
5. **Translation Drill** — Indonesian → English sentences, the highest-fidelity
   way to test whether the rule has actually been internalized

A module is not finished until all 5 sections are written.

## Architecture decisions and the reasoning behind them

These are decisions made deliberately. Don't reverse them without thinking
through the consequences.

### Monorepo with `apps/` + `packages/`

- `apps/web` (React) and `apps/api` (Express) are separate processes
- `packages/shared` holds Zod schemas, grading rules, and the question selector
- **Why:** the FE and BE share schemas (typed end-to-end), the grading logic
  runs on FE for instant feedback and on BE if/when LLM grading is added.
  Single source of truth for types.

### Content as MDX files, not in the database

- All grammar lessons, references, and group definitions live in `content/`
  as MDX files with YAML frontmatter
- DB only stores `Attempt` and `ModuleProgress` (what the user did, not the
  curriculum)
- **Why:** authoring grammar content is editorial work. Plain files = git diff,
  PR review, version history, fast iteration. A DB-backed CMS would add
  complexity without benefit for a single-user app where the curriculum is
  authored by the same person who runs the app.

### 5-section validation in the loader

- The MDX loader fails to start if a module is missing any of the 5 required
  sections (`Explanation`, `Bahasa Indonesia`, `Common Mistakes`,
  `TOEFL Practice`, `Translation Drill`)
- **Why:** the philosophy is the product. A "module" missing the BI comparison
  isn't a module — it's a generic English lesson. Failing the build prevents
  this drift.

### Rule-based grading first, LLM grading later

- Grading lives in `packages/shared/src/grading.ts` as a pure function:
  `gradeAnswer(exercise, userAnswer)`
- Multiple choice → exact match. Fill-blank → normalized match + Levenshtein
  ≤ 2. Translation → exact + fuzzy + key-token soft match
- **Why:** instant feedback, no API costs, runs offline. The pure-function
  shape means an LLM-graded version can be added behind the same interface
  later without touching callers.

### Forgiving grading

- Case, punctuation, and whitespace are normalized
- Contractions are auto-expanded both ways (`didn't` ≡ `did not`, 38 pairs)
- Typos within Levenshtein distance 2 → accepted with a "small spelling slip"
  note (amber, not red)
- Translation answers can also pass via "key tokens present" → soft-match
- **Why:** punishing typos in a learning tool teaches typing, not grammar.
  Soft matches signal "the rule is right, the spelling/phrasing isn't" —
  more useful feedback than a flat wrong.

### Tenses organized into 3 groups (Present, Past, Future) of 4 each

- 12 tenses total. Each group has 4 modules + a Group Summary + a Group Test.
- A module unlocks when all earlier modules in the group are passed (≥ 70%).
- A group test unlocks when all 4 modules in that group are passed.
- A group as a whole unlocks when the previous group's test is passed.
- **Why:** matches the standard 12-tense framework that TOEFL/IELTS prep books
  use. Forces the learner to consolidate (Group Test) before opening new
  material. Group tests can include cross-tense contrast questions, which is
  what the actual exams test.

### 70% pass threshold

- A module is "passed" when `lastScore >= 70`
- Defined as `PASS_THRESHOLD = 70` in `packages/shared/src/schemas.ts`
- The roadmap shows three states: passed (green), attempted (amber, below
  threshold), and locked (gray). A failed attempt does NOT unset a previous
  pass.
- **Why:** strong enough to mean "you understand this," low enough to be
  reachable for genuine learners on a fresh question set.

### References are cheat sheets, not lessons

- `content/references/*.mdx` are flat reference pages: tables, formulas,
  bullet points
- They have no exercises, no progress tracking, no 5-section requirement
- Lessons link to references via inline `→` markdown links
- **Why:** some content is reference material (V1/V2/V3 tables, irregular
  verbs list, sentence formulas) that learners come back to repeatedly.
  Inline links from lessons preserve flow. References are categorized
  (foundation / vocabulary / structure / exam) and live under the
  "References" tab.

### Roadmap-style progression

- The home page is the roadmap, not a flat list
- Each group is a section showing 4 modules → group summary card → group test
  card, with connector lines and clear unlock state
- **Why:** the user's primary need is "what do I do next." A roadmap answers
  that question with the page itself.

### Theme: academic textbook (warm cream + ink) with dark mode

- Lora serif for headings, Inter sans for body
- Warm cream `#FAF7F2` light, deep navy `#131822` dark
- Rust accent (`#B45A1F` light / `#E97C3A` dark)
- **Why:** the product is a study tool. The aesthetic is a textbook, not a
  consumer app. Serif headings + cream background reinforce "sit and read."

## What this app explicitly does NOT have

These are deliberate omissions. Don't add them without revisiting the vision.

| Not built | Reason |
|---|---|
| Authentication | Single-user app |
| Social features (sharing, leaderboards, friends) | Single-user app |
| Mobile native apps | Web-only is enough; the design is responsive |
| Audio/video lessons | Text-first matches TOEFL/IELTS reading-and-writing focus |
| Speaking practice | Out of scope; text grammar only |
| Spaced repetition algorithm | Possibly later under Practice tab; not now |
| Multi-language UI (e.g. UI in Bahasa Indonesia) | Content is bilingual; UI stays English to match the target language exposure |
| Cloud deploy / multi-user backend | Local-first; runs on the user's machine |

## Glossary

- **Module** — one grammar lesson (e.g. "Simple Past Tense"). Has 5 sections,
  a question pool, and progress tracking.
- **Group** — a collection of related modules (Present / Past / Future).
- **Reference** — a flat cheat-sheet page (no exercises). Linked from modules.
- **Placeholder module** — a module with `placeholder: true` in frontmatter
  and stub content. Shows as "Coming soon" in the roadmap. Lets us list a
  module on the roadmap before it's authored.
- **Group test** — a test that mixes questions across the 4 modules of a
  group. Optional file `<slug>.test.json` in `content/groups/`. If absent,
  the group's test card shows "Coming soon."
- **Pass** — score ≥ 70 on a quiz attempt. Sets `completedAt` in the DB.
- **Soft credit / soft match** — answer accepted as correct with a note
  (typo within edit distance 2, or key tokens present in a translation).
  Counts as correct for scoring; UI shows it in amber.
