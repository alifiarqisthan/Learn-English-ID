# Learn English ID — Claude Code Guide

## Project overview

An Indonesian-English grammar learning app (TOEFL/IELTS prep). Target audience: Indonesian university students. All explanations contrast English grammar with Bahasa Indonesia. Built as a monorepo with content stored as MDX + JSON files.

## Tech stack

- Monorepo: `apps/api`, `apps/web`, `packages/shared`
- Content: MDX files (lessons) + JSON files (exercises) under `content/`
- Schema validation: Zod (`packages/shared/src/schemas.ts`)
- Platform: Windows 11, PowerShell, Node.js v24

---

## Curriculum structure

```
content/
  groups/          ← subgroup MDX files + *.test.json
  modules/         ← one folder per module, each with index.mdx + exercises.json
  references/      ← cheat-sheet MDX files
```

### Master groups → Subgroups → Modules

| # | Master group slug | Subgroup slugs | Status |
|---|---|---|---|
| 1 | `tenses` | `present`, `past`, `future` | ✅ Complete |
| 2 | `sentence-structure` | `sentence-types`, `relative-clauses`, `noun-clauses`, `adverb-clauses` | ✅ Complete |
| 3 | `nouns-articles` | `articles`, `quantifiers-determiners`, `subject-verb-agreement` | ✅ Complete |
| 4 | `passive-voice` | `passive-tenses`, `passive-modal-reporting` | ✅ Complete |
| 5 | `modals-hedging` | `modals-core`, `modals-advanced`, `hedging` | ✅ Complete |
| 6 | `conditionals` | `conditionals-real`, `conditionals-hypothetical`, `mixed-conditionals` | ✅ Complete |
| 7 | `verb-patterns` | `gerunds-infinitives`, `reported-speech`, `causative` | ✅ Complete |
| 8 | `comparisons` | `comparative-superlative`, `comparison-structures` | ✅ Complete |
| 9 | `connectors-cohesion` | `connectors-basic`, `connectors-advanced` | ✅ Complete |

---

## File formats

### Module: `content/modules/<slug>/index.mdx`

```mdx
---
slug: present-simple
title: Present Simple Tense
level: A1          # A1 A2 B1 B2 C1 C2
order: 1           # position within the subgroup
group: present     # must match moduleGroupSlug enum
questionsPerAttempt: 9
summary: One-line summary shown on cards.
---

## Explanation
## Bahasa Indonesia
## Common Mistakes
## TOEFL Practice
## Translation Drill
## Quick Summary
```

**Rules:**
- `slug` must match the folder name exactly
- `group` must be one of the valid `moduleGroupSlug` enum values (see schemas.ts)
- Remove `placeholder: true` when writing real content
- `REQUIRED_SECTIONS` enforced by loader: Explanation, Bahasa Indonesia, Common Mistakes, TOEFL Practice, Translation Drill
- `## Quick Summary` is optional but recommended (used on group page)

### Exercises: `content/modules/<slug>/exercises.json`

**All exercises are `multiple_choice` only** (fill_blank and translation_id_to_en have been converted).

```json
{
  "exercises": [
    {
      "id": "ps-mc-pos-1",
      "kind": "multiple_choice",
      "form": "positive",
      "instruction": "Choose the correct present simple form.",
      "prompt": "She ___ to work by bus every morning.",
      "options": ["go", "goes", "is going", "has gone"],
      "answer": "goes",
      "explanation": "Habitual routine → Present Simple. Third person singular → goes."
    }
  ]
}
```

**Exercise rules:**
- `kind` must be `"multiple_choice"` — no fill_blank or translation types
- `id` format: `<module-prefix>-<mc|fb|tr>-<form>-<n>` (e.g. `ps-mc-pos-1`)
- `form`: `"positive"` | `"negative"` | `"question"`
- `options`: always exactly 4 strings
- `answer` must exactly match one of the `options` strings
- `explanation`: required, concise — explains the rule, not just the answer
- `hint`: optional
- **Never** put two options that are meaning-equivalent (e.g. "don't speak" and "do not speak" — use only one)
- **Never** use placeholder distractors like "(none of the above)"
- Target: **20 exercises per module** — balanced across positive/negative/question forms

### Subgroup page: `content/groups/<slug>.mdx`

```mdx
---
slug: articles
title: Articles — A/An, The, Zero
order: 1
masterGroup: nouns-articles
summary: One-line summary.
---

## Welcome to [Title]

Brief intro paragraph + summary table.

### How this subgroup works

Study the modules in order, pass each quiz (≥ 70%) to unlock the next, then take the subgroup test.
```

### Subgroup test: `content/groups/<slug>.test.json`

Same structure as exercises.json. Already MCQ-only. Currently empty for unwritten groups.

---

## Writing modules — workflow

When asked to write a new group:

1. **Do not explore** — the structure is fully documented here. Go straight to writing.
2. **Do not read placeholder files** — they always contain only `> Coming soon.`
3. **Do not read empty exercises.json** — they always contain `{ "exercises": [] }`
4. **Read only the group MDX file** (`content/groups/<slug>.mdx`) to get the subgroup's exact slug, title, order, and masterGroup values
5. Write `index.mdx` and `exercises.json` for each module in sequence
6. Remove `placeholder: true` from the frontmatter when writing real content
7. Add `questionsPerAttempt: 9` to the frontmatter

### Efficient parallel writing

Write both files for a module in one turn (index.mdx Write + exercises.json Read then Write). Then move to the next module.

---

## Content standards

### MDX lesson quality bar

- **Explanation**: Lead with the core rule in a table or formula block. Cover all sub-rules. Use real examples. End with a summary table where helpful.
- **Bahasa Indonesia**: Always contrast English with Indonesian. Name the specific interference error Indonesian learners make. Show side-by-side tables.
- **Common Mistakes**: 5–8 numbered errors. Each: ❌ wrong → ✅ correct + *Why:* one sentence.
- **TOEFL Practice / Translation Drill**: Standard boilerplate (kept short).
- **Quick Summary**: 6–8 bullet points. Scannable. This populates the subgroup page.

### Exercise quality bar

- 20 exercises per module minimum
- Balance: ~7 positive / ~7 negative / ~6 question form
- Mix question types: direct grammar choice, error identification ("which sentence is wrong?"), context-sensitive choice, translation MCQ
- Distractors must be plausible errors — not random wrong words
- Explanations reference the specific rule, not just "this is correct"
- For error-identification items, put the error in one of the 4 options; the other 3 are correct sentences

---

## Completed module inventory

### Group 1: Tenses (`content/modules/`)
- `present-simple`, `present-continuous`, `present-perfect`, `present-perfect-continuous`
- `simple-past`, `past-continuous`, `past-perfect`, `past-perfect-continuous`
- `future-simple`, `future-continuous`, `future-perfect`, `future-perfect-continuous`

### Group 2: Sentence Structure
- `sentence-simple-compound`, `sentence-complex`, `sentence-variety`
- `relative-defining`, `relative-non-defining`, `relative-reduction`
- `noun-clause-that`, `noun-clause-reported`
- `clause-time`, `clause-contrast`, `clause-purpose`, `clause-cause-result`

### Group 3: Nouns, Articles & Determiners
- `article-a-an`, `article-the`, `article-zero`
- `quantifiers-count`, `quantifiers-all-both`, `determiners-advanced`
- `sva-basics`, `sva-tricky`, `sva-advanced`

### Group 4: Passive Voice
- `passive-simple`, `passive-perfect-continuous`, `passive-future`
- `passive-modal`, `passive-reporting`, `passive-causative`

### Group 5: Modals & Hedging
- `modal-can-could`, `modal-must-have-to`, `modal-should-advice`, `modal-may-might`
- `modal-perfect-deduction`, `modal-perfect-regret`, `modal-would-conditional`
- `hedging-modals-adverbs`, `hedging-verbs-phrases`

### Group 6: Conditionals
- `zero-conditional`, `first-conditional`
- `second-conditional`, `third-conditional`
- `mixed-conditionals`, `conditional-alternatives`

### Group 7: Verb Patterns
- `gerunds-after-verbs`, `infinitives-after-verbs`, `gerund-vs-infinitive`
- `reported-statements`, `reported-questions`
- `causative-make-let`

### Group 8: Comparisons
- `comparative-adjectives`, `superlative-adjectives`, `comparison-adverbs`
- `as-as-structures`, `double-comparatives`

### Group 9: Connectors & Cohesion
- `connectors-addition-contrast`, `connectors-cause-result`, `connectors-concession`
- `cohesive-reference`, `academic-discourse`

---

## Key constraints

- **Exercise kind**: `multiple_choice` only — the app currently only renders MCQ
- **No duplicate-equivalent options**: "don't speak" and "do not speak" in the same item is an error
- **Slug format**: kebab-case, lowercase, matches folder name exactly
- **Pass threshold**: 70% (defined in schemas.ts as `PASS_THRESHOLD`)
- **questionsPerAttempt**: 9 (standard for all modules)
- **Placeholder removal**: always remove `placeholder: true` from frontmatter when writing real content
