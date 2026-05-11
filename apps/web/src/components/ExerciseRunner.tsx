import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  Trophy,
  Lightbulb,
  AlertCircle,
  ArrowRight,
  RotateCw,
} from "lucide-react";
import {
  PASS_THRESHOLD,
  gradeAnswer,
  selectQuestions,
  type Exercise,
  type ModuleDetail,
  type ModuleSummary,
} from "@app/shared";
import { api } from "../api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type State =
  | { phase: "answering"; index: number; answers: Record<string, string> }
  | {
      phase: "done";
      answers: Record<string, string>;
      results: Record<string, { correct: boolean; soft: boolean }>;
    };

type Feedback = {
  correct: boolean;
  soft: boolean;
  text: string;
  modelAnswer?: string;
};

const KIND_LABEL: Record<Exercise["kind"], string> = {
  multiple_choice: "Multiple Choice",
  fill_blank: "Fill in the Blank",
  translation_id_to_en: "Translation ID → EN",
};

const FORM_LABEL: Record<NonNullable<Exercise["form"]>, string> = {
  positive: "Positive",
  negative: "Negative",
  question: "Question",
};

function pickSession(mod: ModuleDetail): Exercise[] {
  const count = mod.questionsPerAttempt ?? mod.exercises.length;
  return selectQuestions(mod.exercises, count);
}

export default function ExerciseRunner({
  module: mod,
  nextModule,
}: {
  module: ModuleDetail;
  nextModule?: ModuleSummary | null;
}) {
  const [session, setSession] = useState<Exercise[]>(() => pickSession(mod));
  const [state, setState] = useState<State>({
    phase: "answering",
    index: 0,
    answers: {},
  });
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [draft, setDraft] = useState("");
  const [hintOpen, setHintOpen] = useState(false);

  const total = session.length;
  const current = state.phase === "answering" ? session[state.index] : null;

  const score = useMemo(() => {
    if (state.phase !== "done") return 0;
    const correct = Object.values(state.results).filter((r) => r.correct).length;
    return Math.round((correct / total) * 100);
  }, [state, total]);

  if (!current && state.phase === "answering") return null;

  function submit() {
    if (state.phase !== "answering" || !current) return;
    const ex = current;
    const result = gradeAnswer(ex, draft);
    setFeedback({
      correct: result.isCorrect,
      soft: !!result.softCredit,
      text: result.feedback,
      modelAnswer: result.modelAnswer,
    });

    api
      .recordAttempt({
        moduleSlug: mod.slug,
        exerciseId: ex.id,
        userAnswer: draft,
        isCorrect: result.isCorrect,
      })
      .catch(() => {});

    setState((s) => {
      if (s.phase !== "answering") return s;
      return { ...s, answers: { ...s.answers, [ex.id]: draft } };
    });
  }

  async function next() {
    if (state.phase !== "answering" || !current) return;
    const last = gradeAnswer(current, state.answers[current.id] ?? draft);
    const lastEntry = { correct: last.isCorrect, soft: !!last.softCredit };

    const nextIndex = state.index + 1;
    if (nextIndex >= total) {
      const results: Record<string, { correct: boolean; soft: boolean }> = {};
      session.forEach((e) => {
        const r = gradeAnswer(e, state.answers[e.id] ?? "");
        results[e.id] = { correct: r.isCorrect, soft: !!r.softCredit };
      });
      results[current.id] = lastEntry;
      const finalScore = Math.round(
        (Object.values(results).filter((r) => r.correct).length / total) * 100,
      );
      // Wait for the server to record completion before showing the done
      // screen — otherwise nav-back to /modules can race the POST and the
      // user sees stale "locked" state on the roadmap.
      try {
        await api.completeModule(mod.slug, finalScore);
      } catch {
        /* swallow; the user can still see their results offline */
      }
      setState({ phase: "done", answers: state.answers, results });
    } else {
      setState({ ...state, index: nextIndex });
    }
    setDraft("");
    setFeedback(null);
    setHintOpen(false);
  }

  function tryAgain() {
    setSession(pickSession(mod));
    setState({ phase: "answering", index: 0, answers: {} });
    setDraft("");
    setFeedback(null);
    setHintOpen(false);
  }

  if (state.phase === "done") {
    const correct = Object.values(state.results).filter((r) => r.correct).length;
    const softs = Object.values(state.results).filter(
      (r) => r.correct && r.soft,
    ).length;
    const passed = score >= PASS_THRESHOLD;

    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          {passed ? (
            <Trophy className="h-12 w-12 text-accent" />
          ) : (
            <AlertCircle className="h-12 w-12 text-amber-500" />
          )}

          <h3 className="font-serif text-2xl font-semibold">
            {passed ? "You passed!" : "Almost there"}
          </h3>

          <p className="text-muted-foreground">
            You answered{" "}
            <span className="font-semibold text-foreground">{correct}</span> of{" "}
            <span className="font-semibold text-foreground">{total}</span>{" "}
            correctly
            {softs > 0 ? ` (${softs} with small typo/phrasing notes)` : ""}.
          </p>

          <div className="w-full max-w-md space-y-2">
            <Progress value={score} />
            <div className="flex items-baseline justify-center gap-2">
              <p className="text-3xl font-bold">{score}%</p>
              <p className="text-sm text-muted-foreground">
                / {PASS_THRESHOLD}% to pass
              </p>
            </div>
          </div>

          {passed && nextModule && (
            <div className="mt-2 flex w-full max-w-md flex-col items-center gap-3 rounded-lg border border-accent/40 bg-accent/10 p-4 dark:bg-accent/15">
              <p className="text-sm">
                <span className="font-semibold">Next up:</span>{" "}
                {nextModule.title}
              </p>
              <Button asChild>
                <Link to={`/modules/${nextModule.slug}`}>
                  Continue to next module
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}

          {passed && !nextModule && (
            <p className="rounded-md border border-accent/40 bg-accent/10 px-4 py-2 text-sm dark:bg-accent/15">
              You've finished the last module on the roadmap! 🎉
            </p>
          )}

          {!passed && (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm dark:bg-amber-500/15">
              You need <strong>{PASS_THRESHOLD}%</strong> or higher to unlock the
              next module. Review the lesson and try a fresh set of questions.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant={passed ? "outline" : "default"} onClick={tryAgain}>
              <RotateCw className="h-4 w-4" />
              Try a new set
            </Button>
            {passed && (
              <Button variant="ghost" asChild>
                <Link to="/">Back to roadmap</Link>
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Each retry pulls a fresh set of questions from the pool.
          </p>
        </CardContent>
      </Card>
    );
  }

  const progressPct = (state.index / total) * 100;

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              Exercise {state.index + 1} of {total}
            </span>
            <div className="flex items-center gap-2">
              {current!.form && (
                <Badge variant="outline" className="font-normal">
                  {FORM_LABEL[current!.form]}
                </Badge>
              )}
              <Badge variant="secondary" className="font-normal">
                {KIND_LABEL[current!.kind]}
              </Badge>
            </div>
          </div>
          <Progress value={progressPct} />
        </div>

        {current!.instruction && (
          <p className="rounded-md border-l-4 border-accent bg-accent/5 px-4 py-2 text-sm text-foreground">
            {current!.instruction}
          </p>
        )}

        <p className="font-serif text-lg leading-relaxed">{current!.prompt}</p>

        <ExerciseInput
          exercise={current!}
          value={draft}
          onChange={setDraft}
          disabled={feedback !== null}
        />

        {current!.hint && !feedback && (
          <div className="flex items-start gap-2">
            {hintOpen ? (
              <div className="flex items-start gap-2 rounded-md border border-border bg-muted/50 p-3 text-sm">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>{current!.hint}</span>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHintOpen(true)}
                className="text-muted-foreground"
              >
                <Lightbulb className="h-4 w-4" />
                Show hint
              </Button>
            )}
          </div>
        )}

        {feedback && (
          <div
            className={cn(
              "rounded-md border p-4 text-sm",
              feedback.correct && !feedback.soft &&
                "border-accent/50 bg-accent/10 dark:bg-accent/15",
              feedback.correct && feedback.soft &&
                "border-amber-500/50 bg-amber-500/10 dark:bg-amber-500/15",
              !feedback.correct &&
                "border-destructive/40 bg-destructive/5 dark:bg-destructive/15",
            )}
          >
            <div className="flex items-start gap-2 font-medium">
              {feedback.correct && !feedback.soft && (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-accent" />
              )}
              {feedback.correct && feedback.soft && (
                <AlertCircle className="mt-0.5 h-5 w-5 text-amber-500" />
              )}
              {!feedback.correct && (
                <XCircle className="mt-0.5 h-5 w-5 text-destructive" />
              )}
              <span>{feedback.text}</span>
            </div>

            {feedback.modelAnswer && (
              <p className="mt-2 text-foreground">
                <span className="font-semibold">Model answer:</span>{" "}
                {feedback.modelAnswer}
              </p>
            )}

            {current!.explanation && (
              <p className="mt-2 text-muted-foreground">
                <span className="font-semibold text-foreground">Why:</span>{" "}
                {current!.explanation}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end">
          {feedback === null ? (
            <Button onClick={submit} disabled={!draft.trim()}>
              Check answer
            </Button>
          ) : (
            <Button onClick={next}>
              {state.index + 1 >= total ? "Finish" : "Next exercise"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ExerciseInput({
  exercise,
  value,
  onChange,
  disabled,
}: {
  exercise: Exercise;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  if (exercise.kind === "multiple_choice") {
    return (
      <div className="grid gap-2">
        {exercise.options.map((opt) => {
          const selected = value === opt;
          return (
            <label
              key={opt}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-md border bg-card px-4 py-3 text-sm transition-colors",
                selected
                  ? "border-accent ring-2 ring-accent/30"
                  : "border-border hover:border-accent/60",
                disabled && "pointer-events-none opacity-70",
              )}
            >
              <input
                type="radio"
                name={exercise.id}
                className="sr-only"
                checked={selected}
                onChange={() => onChange(opt)}
                disabled={disabled}
              />
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                  selected
                    ? "border-accent bg-accent"
                    : "border-muted-foreground/60",
                )}
              >
                {selected && (
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-foreground" />
                )}
              </span>
              {opt}
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <textarea
      className={cn(
        "w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:opacity-70",
      )}
      rows={exercise.kind === "translation_id_to_en" ? 3 : 1}
      placeholder={
        exercise.kind === "translation_id_to_en"
          ? "Type your English translation…"
          : "Type your answer…"
      }
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
}
