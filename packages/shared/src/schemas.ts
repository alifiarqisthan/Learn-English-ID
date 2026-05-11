import { z } from "zod";

/** Score (0-100) needed to pass a module and unlock the next one */
export const PASS_THRESHOLD = 70;

export const cefrLevel = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);
export type CefrLevel = z.infer<typeof cefrLevel>;

export const exerciseKind = z.enum([
  "multiple_choice",
  "fill_blank",
  "translation_id_to_en",
]);
export type ExerciseKind = z.infer<typeof exerciseKind>;

export const sentenceForm = z.enum(["positive", "negative", "question"]);
export type SentenceForm = z.infer<typeof sentenceForm>;

const baseExercise = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  instruction: z.string().optional(),
  hint: z.string().optional(),
  explanation: z.string().optional(),
  form: sentenceForm.optional(),
});

export const multipleChoiceExercise = baseExercise.extend({
  kind: z.literal("multiple_choice"),
  options: z.array(z.string()).min(2),
  answer: z.string(),
});

export const fillBlankExercise = baseExercise.extend({
  kind: z.literal("fill_blank"),
  acceptedAnswers: z.array(z.string()).min(1),
});

export const translationExercise = baseExercise.extend({
  kind: z.literal("translation_id_to_en"),
  modelAnswer: z.string(),
  alternativeAnswers: z.array(z.string()).default([]),
  keyTokens: z.array(z.string()).default([]),
});

export const exercise = z.discriminatedUnion("kind", [
  multipleChoiceExercise,
  fillBlankExercise,
  translationExercise,
]);
export type Exercise = z.infer<typeof exercise>;

/** All subgroup slugs — each module belongs to exactly one subgroup */
export const moduleGroupSlug = z.enum([
  // 1. 12 Tenses
  "present", "past", "future",
  // 2. Sentence Structure & Clauses
  "sentence-types", "relative-clauses", "noun-clauses", "adverb-clauses",
  // 3. Nouns, Articles & Determiners
  "articles", "quantifiers-determiners", "subject-verb-agreement",
  // 4. Passive Voice
  "passive-tenses", "passive-modal-reporting",
  // 5. Modals & Hedging
  "modals-core", "modals-advanced", "hedging",
  // 6. Conditionals
  "conditionals-real", "conditionals-hypothetical", "mixed-conditionals",
  // 7. Verb Patterns
  "gerunds-infinitives", "reported-speech", "causative",
  // 8. Comparisons
  "comparative-superlative", "comparison-structures",
  // 9. Connectors & Cohesion
  "connectors-basic", "connectors-advanced",
]);
export type ModuleGroupSlug = z.infer<typeof moduleGroupSlug>;

/** Top-level master group */
export const masterGroupSlug = z.enum([
  "tenses",
  "sentence-structure",
  "nouns-articles",
  "passive-voice",
  "modals-hedging",
  "conditionals",
  "verb-patterns",
  "comparisons",
  "connectors-cohesion",
]);
export type MasterGroupSlug = z.infer<typeof masterGroupSlug>;

export const moduleFrontmatter = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  level: cefrLevel,
  order: z.number().int().nonnegative(),
  summary: z.string().optional(),
  questionsPerAttempt: z.number().int().positive().optional(),
  group: moduleGroupSlug,
  placeholder: z.boolean().optional(),
});
export type ModuleFrontmatter = z.infer<typeof moduleFrontmatter>;

export const REQUIRED_SECTIONS = [
  "Explanation",
  "Bahasa Indonesia",
  "Common Mistakes",
  "TOEFL Practice",
  "Translation Drill",
] as const;
export type RequiredSection = (typeof REQUIRED_SECTIONS)[number];

export const moduleSummary = moduleFrontmatter.extend({
  exerciseCount: z.number().int().nonnegative(),
});
export type ModuleSummary = z.infer<typeof moduleSummary>;

export const moduleDetail = moduleSummary.extend({
  body: z.string(),
  exercises: z.array(exercise),
});
export type ModuleDetail = z.infer<typeof moduleDetail>;

/* ------------------- Module groups (subgroups) ------------------- */

export const moduleGroupFrontmatter = z.object({
  slug: moduleGroupSlug,
  title: z.string().min(1),
  order: z.number().int().nonnegative(),
  summary: z.string().optional(),
  masterGroup: masterGroupSlug,
});
export type ModuleGroupFrontmatter = z.infer<typeof moduleGroupFrontmatter>;

export const moduleGroupSummary = moduleGroupFrontmatter.extend({
  moduleCount: z.number().int().nonnegative(),
  hasTest: z.boolean(),
});
export type ModuleGroupSummary = z.infer<typeof moduleGroupSummary>;

export const moduleGroupDetail = moduleGroupSummary.extend({
  body: z.string(),
  autoSummary: z.array(
    z.object({
      slug: z.string(),
      title: z.string(),
      summary: z.string().nullable(),
    }),
  ),
  modules: z.array(moduleSummary),
  testExerciseCount: z.number().int().nonnegative(),
});
export type ModuleGroupDetail = z.infer<typeof moduleGroupDetail>;

export const moduleGroupTest = z.object({
  slug: z.string(),
  title: z.string(),
  exercises: z.array(exercise),
});
export type ModuleGroupTest = z.infer<typeof moduleGroupTest>;

export const attemptInput = z.object({
  moduleSlug: z.string(),
  exerciseId: z.string(),
  userAnswer: z.string(),
  isCorrect: z.boolean(),
});
export type AttemptInput = z.infer<typeof attemptInput>;

/* ---------- References ---------- */

export const referenceCategory = z.enum([
  "foundation", "vocabulary", "structure", "exam",
]);
export type ReferenceCategory = z.infer<typeof referenceCategory>;

export const referenceFrontmatter = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  category: referenceCategory,
  order: z.number().int().nonnegative(),
  summary: z.string().optional(),
  readingMinutes: z.number().int().positive().optional(),
});
export type ReferenceFrontmatter = z.infer<typeof referenceFrontmatter>;

export const referenceSummary = referenceFrontmatter;
export type ReferenceSummary = z.infer<typeof referenceSummary>;

export const referenceDetail = referenceFrontmatter.extend({
  body: z.string(),
});
export type ReferenceDetail = z.infer<typeof referenceDetail>;
