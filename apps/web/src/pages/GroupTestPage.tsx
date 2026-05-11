import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, HelpCircle } from "lucide-react";
import type { ModuleDetail, ModuleGroupTest } from "@app/shared";
import { api } from "../api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ExerciseRunner from "../components/ExerciseRunner";

export default function GroupTestPage() {
  const { slug = "" } = useParams();
  const [test, setTest] = useState<ModuleGroupTest | "missing" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTest(null);
    api
      .getGroupTest(slug)
      .then(setTest)
      .catch((e) => {
        if (String(e).startsWith("404")) setTest("missing");
        else setError(String(e));
      });
  }, [slug]);

  if (error)
    return <p className="text-destructive">Failed to load: {error}</p>;
  if (test === null)
    return <p className="text-muted-foreground">Loading…</p>;

  return (
    <article className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-3">
        <Link to={`/groups/${slug}`}>
          <ChevronLeft className="h-4 w-4" />
          Back to roadmap
        </Link>
      </Button>

      {test === "missing" ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <HelpCircle className="h-10 w-10 text-muted-foreground" />
            <h2 className="font-serif text-2xl font-semibold">
              Test coming soon
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              The group test for this group hasn't been authored yet. Check
              back once all member modules have been published.
            </p>
            <Button asChild variant="outline">
              <Link to={`/groups/${slug}`}>Back to group page</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <header className="space-y-2">
            <h1 className="font-serif text-3xl font-semibold tracking-tight">
              Group Test
            </h1>
            <p className="text-sm text-muted-foreground">
              Mixed-tense contrast questions for this group. Answer all{" "}
              {test.exercises.length} to finish — pass mark is 70%.
            </p>
          </header>

          {/* Reuse ExerciseRunner by adapting the test into a synthetic module */}
          <ExerciseRunner
            module={
              {
                slug: `group-test:${slug}`,
                title: "Group Test",
                level: "B1",
                order: 999,
                group: slug as ModuleDetail["group"],
                summary: undefined,
                questionsPerAttempt: test.exercises.length,
                body: "",
                exercises: test.exercises,
                exerciseCount: test.exercises.length,
              } satisfies ModuleDetail
            }
          />
        </>
      )}
    </article>
  );
}
