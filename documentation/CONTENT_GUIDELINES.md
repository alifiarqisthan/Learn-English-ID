# Content Guidelines

Read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) first — it explains *why* the
content is shaped this way. This doc explains *how* to write it.

## Three kinds of content

| Kind | Folder | What it is |
|---|---|---|
| Module | `content/modules/<slug>/` | A grammar lesson with quiz. The thing on the roadmap. |
| Reference | `content/references/<slug>.mdx` | A cheat sheet — tables, formulas, no quiz. Linked from modules. |
| Group | `content/groups/<slug>.mdx` (+ optional `<slug>.test.json`) | The intro page for a tense group + its group test pool. |

---

## Modules

### File layout

Each module is a folder with two files:

```
content/modules/<slug>/
├── index.mdx           # Lesson body + frontmatter
└── exercises.json      # Question pool
```

The slug is the folder name. Use kebab-case, lowercase, no underscores.

### Frontmatter

```yaml
---
slug: simple-past                # must match folder name
title: Simple Past Tense          # what shows up everywhere
level: A2                         # CEFR: A1 | A2 | B1 | B2 | C1 | C2
order: 1                          # position WITHIN the group (1-4)
group: past                       # one of: present | past | future
questionsPerAttempt: 9            # how many to draw from the pool per quiz
summary: Talk about completed actions in the past — the foundation tense for TOEFL/IELTS narratives.
placeholder: false                # omit unless this is a stub
---
```

**Important:** `order` is the order **within the group**, not globally. So
each group has modules with order 1–4.

### The 5 required sections (enforced)

The MDX body must contain these `##` headings in this order:

```markdown
## Explanation
## Bahasa Indonesia
## Common Mistakes
## TOEFL Practice
## Translation Drill
```

The build will fail if any are missing. The `##` heading must match exactly
(case and spaces).

You may also include `### Quick Summary` (recommended, used by group pages
to auto-generate summary cards) — but since `Quick Summary` uses `##` in
real modules to be the section heading, here's the convention:

> Add a `## Quick Summary` section near the **end** of the module (after
> Translation Drill). The group page automatically pulls this section into
> its summary cards. If absent, the group summary card just shows
> "No summary yet."

So a complete module structure is:

```markdown
## Explanation             (longest section — concepts, formulas, tables)
## Bahasa Indonesia        (the contrast — what's different + traps)
## Common Mistakes         (wrong → right pairs with WHY)
## TOEFL Practice          (intro paragraph; questions are in exercises.json)
## Translation Drill       (intro paragraph; translation questions in JSON)
## Quick Summary           (5–10 bullets, used by group page)
```

### Section content guidelines

**`## Explanation`** — be comprehensive. This is a textbook chapter, not a
blog post. Cover:
- The form (positive / negative / question) with formulas
- Spelling rules where relevant (-ed, -ing, -s)
- Time markers
- Edge cases and exceptions

Use tables wherever you'd otherwise use a long bullet list. Use `###`
sub-headings to break it up. Inline-link to relevant references with
`[Verb Forms Guide →](/references/verb-forms)`.

**`## Bahasa Indonesia`** — this is the differentiator. Don't just translate
examples; explain *why* the structures differ and what cognitive habit needs
to be unlearned. Useful patterns:

- "In Bahasa Indonesia, X never changes. In English, X changes for Y."
- A side-by-side comparison table
- A named "trap" with examples (e.g. "The sudah/telah trap")
- A translation strategy (1-2-3 steps a learner can apply)

**`## Common Mistakes`** — at least 5 items. Each item is:

```markdown
**N. Brief description of the mistake**
- ❌ Wrong example
- ✅ Correct example

  *Why it happens:* the Indonesian habit that causes it.
```

Keep examples concrete, named (subjects with names like "She" / "Adit"), and
short. The "Why it happens" line is the key insight — without it, the
mistake list is generic.

**`## TOEFL Practice`** — a 1-2 paragraph intro. Mention the random pool, the
form types tested, and the mention of [Question Types reference](/references/exam-question-types).

**`## Translation Drill`** — a 1-2 paragraph intro. Remind the learner of
forgiving grading and what to focus on (forms, structures).

**`## Quick Summary`** — 5–10 short bullets. Each bullet is a single
takeaway. This is what shows up on the group summary page.

### Inline reference links

Use markdown links with absolute paths starting with `/`:

```markdown
For the full picture across all tenses, see [Verb "to be" Master Guide →](/references/verb-to-be).
```

The `Markdown` component converts these to React Router `<Link>` so they
SPA-navigate. External links (starting with `http`) get `target="_blank"`
automatically.

### Exercises (`exercises.json`)

Schema is in
[`packages/shared/src/schemas.ts`](../packages/shared/src/schemas.ts).

```json
{
  "exercises": [
    {
      "id": "sp-mc-pos-1",
      "kind": "multiple_choice",
      "form": "positive",
      "instruction": "Choose the verb form that fits the past time marker.",
      "prompt": "Yesterday I ___ to the library.",
      "options": ["go", "goes", "went", "gone"],
      "answer": "went",
      "hint": "Optional, shown only when the user clicks 'Show hint'.",
      "explanation": "'Yesterday' signals simple past."
    }
  ]
}
```

#### Required fields per kind

| Kind | Required fields | Notes |
|---|---|---|
| `multiple_choice` | `id, kind, prompt, options[], answer` | `options` ≥ 2; `answer` must be one of `options` |
| `fill_blank` | `id, kind, prompt, acceptedAnswers[]` | All accepted spellings |
| `translation_id_to_en` | `id, kind, prompt, modelAnswer, alternativeAnswers[], keyTokens[]` | `keyTokens` enables soft-match scoring |

#### Optional fields (any kind)

- `form` — `"positive" | "negative" | "question"` — drives balanced selection
- `instruction` — what the user should do (shown above the prompt)
- `hint` — revealed on demand
- `explanation` — shown after grading (the "Why")

#### ID convention

`<module-prefix>-<kind-tag>-<form-tag>-<n>`

Examples:
- `sp-mc-pos-1` — Simple Past, multiple choice, positive, #1
- `ps-fb-neg-2` — Present Simple, fill-blank, negative, #2
- `pc-tr-q-1` — Present Continuous, translation, question, #1

This isn't enforced; just keep it consistent so attempt logs are readable.

#### Pool sizing and balance

Aim for **24–30 questions** per module:
- ~10 multiple choice
- ~8 fill-blank
- ~6 translation

Across forms (positive / negative / question), aim for roughly equal
distribution. The `selectQuestions()` algorithm balances by `kind` first,
then shuffles, so you don't need exact balance.

### Translation question authoring

Translations are the highest-stakes question type. Get these right:

- **`modelAnswer`** — the natural, exam-quality English version
- **`alternativeAnswers`** — variations a competent learner might write
  that should also be accepted (gender swaps, word order, synonyms)
- **`keyTokens`** — the words/phrases that MUST appear in any acceptable
  answer. Pick 2–4 short tokens. Used for soft-match: if the user's
  answer contains all of them, it gets accepted with an "almost there"
  note even if the rest doesn't match.
- **`hint`** — usually the trickiest grammar concept, e.g. *"'sakit' = 'was sick' (was/were for past 'to be')."*
- **`explanation`** — what rule the question is testing.

### Placeholder modules

When a module is on the roadmap but not yet authored:

```yaml
---
slug: past-perfect
title: Past Perfect Tense
level: B1
order: 3
group: past
placeholder: true
summary: Talk about an action that finished BEFORE another past action.
---
```

The MDX body still needs the 5 required sections (the loader checks). Use
stub content like:

```markdown
## Explanation

> 📝 **Coming soon.** This module is on the roadmap but hasn't been written yet.

Will cover: ...

## Bahasa Indonesia

...

## Common Mistakes

To be filled in once the module is written.

## TOEFL Practice

Exercises will be added when the module is published.

## Translation Drill

Translation drills will be added when the module is published.
```

`exercises.json` should be `{ "exercises": [] }`.

The roadmap displays placeholders as "Coming soon" and they're not clickable.

---

## References

References are cheat sheets. They are linked from modules but live under the
References tab.

### File layout

```
content/references/<slug>.mdx
```

One file per reference, **flat** (no folder). The slug is the filename
without `.mdx`.

### Frontmatter

```yaml
---
slug: verb-forms
title: Verb Forms Guide (V1, V2, V3)
category: foundation        # foundation | vocabulary | structure | exam
order: 4                    # global order within the References list
readingMinutes: 5           # estimated read time, displayed on the card
summary: One-line description shown on the list card.
---
```

### Body

No required sections. Be concise — these are tables and bullet points.
Use the same structure pattern your audience expects:

```markdown
## <Reference title repeats here>

Intro paragraph (one or two lines).

### Main Explanation
Tables, formulas, bullet points.

### English vs Bahasa Indonesia
Optional but recommended.

### Common Mistakes by Indonesian Learners
Bullet list.

### Quick Summary
Short bullets.
```

### Linking from modules

Inside a module's MDX body:

```markdown
> For the full reference list, see [Top 100 Irregular Verbs →](/references/irregular-verbs).
```

---

## Groups

### File layout

```
content/groups/
├── present.mdx          # required — group intro
├── past.mdx
├── future.mdx
├── present.test.json    # optional — group test exercises
├── past.test.json
└── future.test.json
```

### Group MDX frontmatter

```yaml
---
slug: present              # must be one of: present | past | future
title: Present Tenses
order: 1                   # 1 | 2 | 3 — order on the home page
summary: One-line description shown under the group title.
---
```

### Group MDX body

The body is shown on `/groups/<slug>` above the auto-generated summary cards.
Cover:

- A welcoming intro
- A 4-row table of the member tenses with quick examples
- A "Why this matters for Indonesian learners" paragraph
- A "How this group works" section explaining the unlock logic

Don't list the modules' actual content here — that's what the auto-summary
cards do.

### Group tests (`<slug>.test.json`)

Same shape as a module's `exercises.json`:

```json
{
  "exercises": [
    {
      "id": "present-test-1",
      "kind": "multiple_choice",
      "prompt": "...",
      "options": ["..."],
      "answer": "..."
    }
  ]
}
```

The point of a group test is **contrast**. Author questions where the user
must distinguish between the group's tenses, e.g. "Present Simple vs Present
Continuous" or "Simple Past vs Past Perfect." Avoid questions that only
exercise one tense — those belong in module pools.

If `<slug>.test.json` is missing or has zero exercises, the group test card
shows "Coming soon" and the test page renders a placeholder.

ID convention: `<group>-test-<n>`, e.g. `past-test-1`.

---

## Common pitfalls

- **Forgetting one of the 5 sections** → the API throws on startup. The error
  names the missing section.
- **Putting absolute markdown links without leading `/`** → they get treated
  as relative paths and 404 in the SPA.
- **Translation `modelAnswer` with extra punctuation** that doesn't match
  what learners type → use the natural form; normalization handles trailing
  punctuation but not differences like quote marks.
- **Mismatched slug** between folder name and frontmatter `slug` → loader
  validation fails.
- **Forgetting `keyTokens`** on translation questions → soft-match grading
  is disabled, you only get exact + fuzzy match. Always include 2–4 tokens.
