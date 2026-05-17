import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, HelpCircle, Trophy } from "lucide-react";
import type { ModuleDetail, ModuleGroupSummary, ModuleGroupTest } from "@app/shared";
import { api } from "../api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ExerciseRunner from "../components/ExerciseRunner";

export default function MasterGroupTestPage() {
  const { masterSlug = "" } = useParams();
  const [test, setTest] = useState<ModuleGroupTest | "missing" | null>(null);
  const [group, setGroup] = useState<ModuleGroupSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTest(null);
    api.listGroups().then((groups) => {
      const found = groups.find((g) => g.masterGroup === masterSlug || g.slug === masterSlug);
      if (found) setGroup(found);
    }).catch(() => {});
    api
      .getMasterGroupTest(masterSlug)
      .then(setTest)
      .catch((e) => {
        if (String(e).startsWith("404")) setTest("missing");
        else setError(String(e));
      });
  }, [masterSlug]);

  if (error) return <p className="text-destructive">Failed to load: {error}</p>;
  if (test === null) return <p className="text-muted-foreground">Loading…</p>;

  const groupTitle = group?.title ?? masterSlug;

  return (
    <article className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-3">
        <Link to="/">
          <ChevronLeft className="h-4 w-4" />
          Back to roadmap
        </Link>
      </Button>

      {test === "missing" ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <HelpCircle className="h-10 w-10 text-muted-foreground" />
            <h2 className="font-serif text-2xl font-semibold">Test coming soon</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              The master test for <strong>{groupTitle}</strong> hasn't been authored yet.
            </p>
            <Button asChild variant="outline">
              <Link to="/">Back to roadmap</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <header className="space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-accent" />
              <Badge variant="accent" className="rounded">Group Challenge</Badge>
            </div>
            <h1 className="font-serif text-4xl font-semibold tracking-tight">
              {groupTitle} — Master Test
            </h1>
            <p className="max-w-2xl text-muted-foreground">
              {test.exercises.length} cross-subgroup questions spanning everything in this group.
              Each question requires choosing the right form from context alone. Pass mark is 70%.
            </p>
          </header>

          <ExerciseRunner
            module={
              {
                slug: `master-group-test:${masterSlug}`,
                title: `${groupTitle} Master Test`,
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
        </>
      )}
    </article>
  );
}
