import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Star } from "lucide-react";
import type { ModuleDetail, ModuleGroupTest } from "@app/shared";
import { api } from "../api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ExerciseRunner from "../components/ExerciseRunner";

export default function MasterTestPage() {
  const [test, setTest] = useState<ModuleGroupTest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getMasterTest().then(setTest).catch((e) => setError(String(e)));
  }, []);

  if (error)
    return <p className="text-destructive">Failed to load: {error}</p>;
  if (!test)
    return <p className="text-muted-foreground">Loading…</p>;

  return (
    <article className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-3">
        <Link to="/">
          <ChevronLeft className="h-4 w-4" />
          Back to roadmap
        </Link>
      </Button>

      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <Star className="h-6 w-6 text-accent" />
          <Badge variant="accent" className="rounded">Final Challenge</Badge>
        </div>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">
          Master Test — All 12 Tenses
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Cross-group contrast questions spanning all 12 English tenses.
          Each question requires you to identify the right tense from context — no hints
          about which group it belongs to. Pass mark is 70%.
        </p>
        <p className="text-sm text-muted-foreground">
          Need a refresher first?{" "}
          <Link to="/references/all-tenses-summary" className="text-accent underline underline-offset-4">
            Open the 12-tense master summary →
          </Link>
        </p>
      </header>

      <ExerciseRunner
        module={
          {
            slug: "group-test:master",
            title: "Master Test",
            level: "B2",
            order: 9999,
            group: "present" as ModuleDetail["group"],
            summary: undefined,
            questionsPerAttempt: test.exercises.length,
            body: "",
            exercises: test.exercises,
            exerciseCount: test.exercises.length,
          } satisfies ModuleDetail
        }
      />
    </article>
  );
}
