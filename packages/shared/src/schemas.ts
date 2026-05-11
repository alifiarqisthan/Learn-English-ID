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
  /** What the user should do — shown above the prompt as guidance */
  instruction: z.string().optional(),
  /** Optional hint, hidden behind a button */
  hint: z.string().optional(),
  /** Why the correct answer is correct — shown after grading */
  explanation: z.string().optional(),
  /** Tag for balanced selection */
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
  /** Words/phrases that must appear (in any order) for soft-match credit */
  keyTokens: z.array(z.string()).default([]),
});

export const exercise = z.discriminatedUnion("kind", [
  multipleChoiceExercise,
  fillBlankExercise,
  translationExercise,
]);
export type Exercise = z.infer<typeof exercise>;

export const moduleGroupSlug = z.enum(["present", "past", "future"]);
export type ModuleGroupSlug = z.infer<typeof moduleGroupSlug>;

export const moduleFrontmatter = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  level: cefrLevel,
  order: z.number().int().nonnegative(),
  summary: z.string().optional(),
  /** How many questions to draw per attempt (defaults to all) */
  questionsPerAttempt: z.number().int().positive().optional(),
  /** Which tense group this module belongs to */
  group: moduleGroupSlug,
  /**
   * If true, the module is a planned placeholder (no real lesson body yet).
   * Roadmap shows it as "coming soon" and it can't be opened.
   */
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

/* ---------------- Module groups (Present / Past / Future) ---------------- */

export const moduleGroupFrontmatter = z.object({
  slug: moduleGroupSlug,
  title: z.string().min(1),
  order: z.number().int().nonnegative(),
  summary: z.string().optional(),
});
export type ModuleGroupFrontmatter = z.infer<typeof moduleGroupFrontmatter>;

export const moduleGroupSummary = moduleGroupFrontmatter.extend({
  /** How many member modules in this group (placeholders count) */
  moduleCount: z.number().int().nonnegative(),
  /** Whether the group test has authored questions yet */
  hasTest: z.boolean(),
});
export type ModuleGroupSummary = z.infer<typeof moduleGroupSummary>;

export const moduleGroupDetail = moduleGroupSummary.extend({
  /** The group's intro/explanation MDX body */
  body: z.string(),
  /**
   * Auto-generated summary content stitched from each member module's
   * "Quick Summary" section (or null if a member doesn't have one).
   */
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
  slug: moduleGroupSlug,
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

/* ---------- Reference (cheat-sheet) modules ---------- */

export const referenceCategory = z.enum([
  "foundation",
  "vocabulary",
  "structure",
  "exam",
]);
export type ReferenceCategory = z.infer<typeof referenceCategory>;

export const referenceFrontmatter = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  category: referenceCategory,
  order: z.number().int().nonnegative(),
  summary: z.string().optional(),
  /** Estimated reading time in minutes */
  readingMinutes: z.number().int().positive().optional(),
});
export type ReferenceFrontmatter = z.infer<typeof referenceFrontmatter>;

export const referenceSummary = referenceFrontmatter;
export type ReferenceSummary = z.infer<typeof referenceSummary>;

export const referenceDetail = referenceFrontmatter.extend({
  body: z.string(),
});
export type ReferenceDetail = z.infer<typeof referenceDetail>;
