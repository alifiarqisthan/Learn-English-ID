import type { Exercise } from "./schemas.js";

export type GradingResult = {
  isCorrect: boolean;
  /** True when accepted as correct but with a small note (typo, soft match) */
  softCredit?: boolean;
  feedback: string;
  modelAnswer?: string;
};

/* ----------------------- text normalization ----------------------- */

const CONTRACTIONS: Array<[RegExp, string]> = [
  [/\bdon't\b/gi, "do not"],
  [/\bdoesn't\b/gi, "does not"],
  [/\bdidn't\b/gi, "did not"],
  [/\bisn't\b/gi, "is not"],
  [/\baren't\b/gi, "are not"],
  [/\bwasn't\b/gi, "was not"],
  [/\bweren't\b/gi, "were not"],
  [/\bhasn't\b/gi, "has not"],
  [/\bhaven't\b/gi, "have not"],
  [/\bhadn't\b/gi, "had not"],
  [/\bwon't\b/gi, "will not"],
  [/\bwouldn't\b/gi, "would not"],
  [/\bcan't\b/gi, "cannot"],
  [/\bcouldn't\b/gi, "could not"],
  [/\bshouldn't\b/gi, "should not"],
  [/\bmustn't\b/gi, "must not"],
  [/\bi'm\b/gi, "i am"],
  [/\byou're\b/gi, "you are"],
  [/\bwe're\b/gi, "we are"],
  [/\bthey're\b/gi, "they are"],
  [/\bhe's\b/gi, "he is"],
  [/\bshe's\b/gi, "she is"],
  [/\bit's\b/gi, "it is"],
  [/\bi've\b/gi, "i have"],
  [/\byou've\b/gi, "you have"],
  [/\bwe've\b/gi, "we have"],
  [/\bthey've\b/gi, "they have"],
  [/\bi'll\b/gi, "i will"],
  [/\byou'll\b/gi, "you will"],
  [/\bhe'll\b/gi, "he will"],
  [/\bshe'll\b/gi, "she will"],
  [/\bwe'll\b/gi, "we will"],
  [/\bthey'll\b/gi, "they will"],
  [/\bi'd\b/gi, "i would"],
  [/\byou'd\b/gi, "you would"],
  [/\bhe'd\b/gi, "he would"],
  [/\bshe'd\b/gi, "she would"],
  [/\bwe'd\b/gi, "we would"],
  [/\bthey'd\b/gi, "they would"],
];

function expandContractions(s: string): string {
  let out = s;
  for (const [re, rep] of CONTRACTIONS) out = out.replace(re, rep);
  return out;
}

/** Lowercase, trim, expand contractions, strip ending punctuation, collapse whitespace */
export function normalize(s: string): string {
  let out = s.toLowerCase().trim();
  out = expandContractions(out);
  out = out.replace(/[.,!?;:"'`]+$/g, "");      // trailing punctuation
  out = out.replace(/[.,!?;:"'`]/g, "");        // any other punctuation
  out = out.replace(/\s+/g, " ");               // collapse whitespace
  return out.trim();
}

/* --------------------- Levenshtein (fuzzy) ----------------------- */

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1]! + 1,
        prev[j]! + 1,
        prev[j - 1]! + cost,
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n]!;
}

/** Threshold scales with length so short words don't accept random matches */
function fuzzyThreshold(target: string): number {
  if (target.length <= 4) return 1;
  if (target.length <= 8) return 2;
  return 2;
}

function fuzzyMatch(user: string, target: string): boolean {
  const t = fuzzyThreshold(target);
  return levenshtein(user, target) <= t;
}

/* ----------------------- per-kind grading ------------------------ */

export function gradeAnswer(
  exercise: Exercise,
  userAnswer: string,
): GradingResult {
  const ua = normalize(userAnswer);

  switch (exercise.kind) {
    case "multiple_choice": {
      const isCorrect = userAnswer === exercise.answer;
      return {
        isCorrect,
        feedback: isCorrect
          ? "Correct!"
          : `Not quite. The correct answer is: ${exercise.answer}`,
      };
    }

    case "fill_blank": {
      const targets = exercise.acceptedAnswers.map(normalize);

      // exact match
      if (targets.includes(ua)) {
        return { isCorrect: true, feedback: "Correct!" };
      }

      // fuzzy match — accept with soft note
      const fuzzy = targets.find((t) => fuzzyMatch(ua, t));
      if (fuzzy) {
        return {
          isCorrect: true,
          softCredit: true,
          feedback: `Accepted — small spelling slip. The expected answer is "${exercise.acceptedAnswers[0]}".`,
        };
      }

      return {
        isCorrect: false,
        feedback: `Expected answer: ${exercise.acceptedAnswers[0]}`,
      };
    }

    case "translation_id_to_en": {
      const candidates = [
        exercise.modelAnswer,
        ...exercise.alternativeAnswers,
      ].map(normalize);

      // exact (after normalization — handles contractions, punctuation, case)
      if (candidates.includes(ua)) {
        return {
          isCorrect: true,
          feedback: "Great translation!",
          modelAnswer: exercise.modelAnswer,
        };
      }

      // fuzzy whole-sentence match — typos forgiven
      const fuzzy = candidates.find((c) => fuzzyMatch(ua, c));
      if (fuzzy) {
        return {
          isCorrect: true,
          softCredit: true,
          feedback:
            "Accepted with a small spelling slip — compare with the model answer.",
          modelAnswer: exercise.modelAnswer,
        };
      }

      // soft match: all key tokens present
      const tokens = exercise.keyTokens.map((k) => normalize(k));
      if (tokens.length > 0) {
        const present = tokens.every((tok) => {
          const safe = tok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          return new RegExp(`\\b${safe}\\b`).test(ua);
        });
        if (present) {
          return {
            isCorrect: true,
            softCredit: true,
            feedback:
              "Close — your translation has the right ideas. Compare with the model for natural phrasing.",
            modelAnswer: exercise.modelAnswer,
          };
        }
      }

      return {
        isCorrect: false,
        feedback: "Not quite — compare with the model answer below.",
        modelAnswer: exercise.modelAnswer,
      };
    }
  }
}

/* ---------- balanced selection of a question subset --------- */

function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Pick a balanced subset of `count` questions from `pool`.
 * Tries to take roughly equal numbers of each kind, then fills any remainder.
 */
export function selectQuestions(
  pool: Exercise[],
  count: number,
  rand: () => number = Math.random,
): Exercise[] {
  if (pool.length <= count) return shuffle(pool, rand);

  const byKind: Record<string, Exercise[]> = {};
  for (const ex of pool) {
    (byKind[ex.kind] ??= []).push(ex);
  }
  const kinds = Object.keys(byKind);
  const perKind = Math.floor(count / kinds.length);

  const picked: Exercise[] = [];
  const remainder: Exercise[] = [];

  for (const k of kinds) {
    const shuffled = shuffle(byKind[k]!, rand);
    picked.push(...shuffled.slice(0, perKind));
    remainder.push(...shuffled.slice(perKind));
  }

  // top up to `count` from leftovers
  const leftover = shuffle(remainder, rand);
  while (picked.length < count && leftover.length > 0) {
    picked.push(leftover.shift()!);
  }

  return shuffle(picked, rand);
}
