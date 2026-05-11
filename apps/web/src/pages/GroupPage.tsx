import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, ChevronLeft, Sparkles, Trophy } from "lucide-react";
import type { ModuleGroupDetail } from "@app/shared";
import { api } from "../api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Markdown } from "@/components/markdown";

export default function GroupPage() {
  const { slug = "" } = useParams();
  const [group, setGroup] = useState<ModuleGroupDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setGroup(null);
    api.getGroup(slug).then(setGroup).catch((e) => setError(String(e)));
  }, [slug]);

  if (error)
    return <p className="text-destructive">Failed to load: {error}</p>;
  if (!group) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <article className="space-y-8">
      <Button variant="ghost" size="sm" asChild className="-ml-3">
        <Link to="/">
          <ChevronLeft className="h-4 w-4" />
          All groups
        </Link>
      </Button>

      <header className="space-y-3">
        <Badge variant="accent" className="rounded">
          Group {group.order}
        </Badge>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">
          {group.title}
        </h1>
        {group.summary && (
          <p className="max-w-2xl text-muted-foreground">{group.summary}</p>
        )}
      </header>

      <Card>
        <CardContent className="prose-module pt-6">
          <Markdown>{group.body}</Markdown>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          <h2 className="font-serif text-2xl font-semibold">Quick Summaries</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Pulled directly from each module's "Quick Summary" section.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {group.autoSummary.map((s) => (
            <Card key={s.slug}>
              <CardHeader>
                <CardTitle className="text-lg">{s.title}</CardTitle>
                {!s.summary && (
                  <CardDescription>
                    No summary yet — the module is still being written.
                  </CardDescription>
                )}
              </CardHeader>
              {s.summary && (
                <CardContent className="prose-module pt-0">
                  <Markdown>{s.summary}</Markdown>
                </CardContent>
              )}
              <CardContent className="pt-0">
                <Button variant="link" asChild className="px-0">
                  <Link to={`/modules/${s.slug}`}>
                    Open module <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-accent" />
          <h2 className="font-serif text-2xl font-semibold">Group Test</h2>
        </div>
        {group.hasTest ? (
          <Card>
            <CardContent className="flex flex-col items-start gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">
                  {group.testExerciseCount} contrast questions
                </p>
                <p className="text-sm text-muted-foreground">
                  Mixed-tense questions to lock in the differences between the
                  modules in this group.
                </p>
              </div>
              <Button asChild>
                <Link to={`/groups/${group.slug}/test`}>
                  Start group test <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              The group test for <strong>{group.title}</strong> hasn't been
              authored yet. Check back after the member modules are complete.
            </CardContent>
          </Card>
        )}
      </section>
    </article>
  );
}
