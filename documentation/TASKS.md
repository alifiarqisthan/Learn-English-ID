# Tasks

The current backlog. Update this file as work is finished or new tasks come
up. Move completed tasks to [progress.md](progress.md).

## Now — Phase 1: Finish Tenses

We have 3 of 12 tense modules authored. Finish the remaining 9 + 3 group
tests in roadmap order. Each module follows the structure in
[CONTENT_GUIDELINES.md](CONTENT_GUIDELINES.md) — same depth as Simple Past.

### Present group (2 of 4 done)

- [ ] **Present Perfect** (`present-perfect`, level B1) — replace placeholder
  - have/has + V3
  - "for" vs "since" vs "ago"
  - The big ID-learner trap: *sudah/telah* in Indonesian usually maps here, not to simple past
  - Comparison with Simple Past (specific time vs no time)
  - Time markers: ever, never, already, yet, just, recently, lately, so far
  - Question pool ~25 balanced across pos/neg/question
- [ ] **Present Perfect Continuous** (`present-perfect-continuous`, level B2)
  - have/has been + Ving
  - Duration emphasis
  - Compare with Present Perfect (state vs ongoing action)
  - Stative verbs that can't be used here

### Past group (1 of 4 done)

- [ ] **Past Continuous** (`past-continuous`, level A2)
  - was/were + Ving
  - The interruption pattern (was/were + Ving + when + simple past)
  - Parallel ongoing past actions (while)
  - Time markers: while, when, as, all day yesterday
- [ ] **Past Perfect** (`past-perfect`, level B1)
  - had + V3 across all subjects
  - The "earlier past" concept — needs careful Indonesian framing
  - Sequence of events (by the time, before, after)
  - Compare with Simple Past
- [ ] **Past Perfect Continuous** (`past-perfect-continuous`, level B2)
  - had been + Ving
  - Duration leading up to a past point
  - Compare with Past Perfect

### Future group (0 of 4 done)

- [ ] **Future Simple** (`future-simple`, level A1)
  - will + V1 vs am/is/are going to + V1
  - When to use each (decisions, predictions, plans)
  - Present continuous as future (arranged plans) — brief mention
  - Indonesian *akan* vs *mau* mapping
- [ ] **Future Continuous** (`future-continuous`, level B1)
  - will be + Ving
  - Specific future moment in progress
- [ ] **Future Perfect** (`future-perfect`, level B2)
  - will have + V3
  - "By + future time" deadlines
- [ ] **Future Perfect Continuous** (`future-perfect-continuous`, level C1)
  - will have been + Ving
  - Duration up to a future point

### Group tests (0 of 3 done)

- [ ] **Present group test** (`content/groups/present.test.json`)
  - 12–15 questions
  - Focus on **choosing between** Present Simple, Continuous, Perfect, and Perfect Continuous
  - Sample contrast: "She ___ in Jakarta for 5 years" — perfect (duration to now)
- [ ] **Past group test** (`content/groups/past.test.json`)
  - Contrast questions: simple past vs past continuous (interruption), past perfect vs simple past (sequence)
- [ ] **Future group test** (`content/groups/future.test.json`)
  - Will vs going to vs future continuous vs future perfect

---

## Next — Phase 2: Articles, Determiners & Quantifiers

Group 3 in the long-term plan. The biggest non-tense pain point for
Indonesian learners (Bahasa Indonesia has no articles). Standalone group of
3 modules.

- [ ] Add 4th group `articles` to schema's `moduleGroupSlug` enum
  (`packages/shared/src/schemas.ts`)
- [ ] Author `content/groups/articles.mdx` with intro
- [ ] **Articles** module (`articles`) — a/an/the/zero, generic vs specific, idioms (in bed, at school)
- [ ] **Quantifiers** module (`quantifiers`) — much/many, a few/few, a little/little, some/any, plenty
- [ ] **Demonstratives & Possessives** module (`demonstratives`) — this/that/these/those reinforcement
- [ ] Group test for Articles group
- [ ] Reorder Past/Future groups' `order` to 3/4, Articles becomes 2 (or place at the end depending on UX preference)

Decision needed before starting: does Articles come **after** Tenses (so
learners earn it) or **alongside** Present (so they're available early)?

---

## Later — Phases 3+

See [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for the long-term plan. Brief
list:

- Group 4 — Modals (3 modules)
- Group 5 — Voice & Verb Patterns (passive, gerunds vs infinitives, causatives)
- Group 6 — Adjective/Adverb order, Comparatives & Superlatives
- Group 7 — Word Forms & Confusing Word Pairs
- Group 8 — Punctuation & Mechanics

---

## Engineering tasks (non-content)

These are improvements/cleanups to the platform that aren't blocking content.

### Soon

- [ ] **Practice tab — make it real.** Currently a placeholder. Build at
  least the "Quick Drill" mode: pull random questions from completed modules.
- [ ] **Progress tab polish.** Currently lists rows with last score. Add:
  streak counter, accuracy chart (% correct over time), per-question
  difficulty heatmap.
- [ ] **Authoring DX.** A `npm run validate-content` script that runs the
  loaders against every MDX and JSON file and reports specific errors
  (missing sections, malformed exercises, broken inline links).

### Later

- [ ] **LLM grading for translation.** Add an opt-in flag that sends
  translation answers to Claude/GPT for richer feedback. The grading function
  signature is already a pure function, so this is a swap-in. Cost-aware:
  add token counting, cache by exact normalized prompt.
- [ ] **Spaced repetition.** Schema-level: `Review { exerciseId, due, ease,
  lapses }`. UI: "Practice" tab queries due reviews, prioritizes weak spots.
- [ ] **Mock test mode.** A timed 25-min grammar block. Mostly a UI
  variation on the existing question runner — add a timer, no hints, no
  "show model answer", end-of-test report card.
- [ ] **Dark-mode review pass.** A few styles still rely on opacity rather
  than CSS variables; some accent colors could be tighter on dark.
- [ ] **Mobile review pass.** Roadmap reflows but cards can be tight. Test
  at 375px and tighten if needed.
- [ ] **References → modules cross-linking.** References don't link out to
  modules currently. Add a "modules using this reference" footer to each
  reference page.
- [ ] **Per-question explanations on the done screen.** Currently you see
  feedback live during the quiz. After finishing, you only see the score.
  Could show a per-question summary with right/wrong + explanation.

### Tooling

- [ ] **Pre-commit hook.** Run typecheck + content validation. Right now
  things drift unnoticed.
- [ ] **CI.** None yet. A GitHub Actions workflow with typecheck + content
  validation would catch regressions.

---

## Decisions pending

- **Articles group placement on the roadmap** — after Future (gated path) or
  parallel to Present (always available)?
- **Group test gating semantics** — currently the group test unlocks when
  all 4 modules are passed. Some users might want to take it as a diagnostic
  *before* the modules. Worth supporting? Probably not for now.
- **"Take a diagnostic" entry point** — should the home page have a "Find
  your level" button that runs ~20 questions across tenses to recommend a
  starting point? Nice-to-have.
- **Reference-to-reference links.** Some references would benefit from
  cross-references (e.g. Verb Forms → Top 100 Irregular Verbs). Currently
  there's no cross-link from reference to reference. Should be trivial to
  add — same `<Markdown>` component handles it.
