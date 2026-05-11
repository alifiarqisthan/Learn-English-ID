import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import type { ModuleDetail, ModuleSummary } from "@app/shared";
import { api } from "../api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Markdown } from "@/components/markdown";
import ExerciseRunner from "../components/ExerciseRunner";

export default function ModulePage() {
  const { slug = "" } = useParams();
  const [mod, setMod] = useState<ModuleDetail | null>(null);
  const [groupModules, setGroupModules] = useState<ModuleSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMod(null);
    setGroupModules([]);
    api.getModule(slug).then((m) => {
      setMod(m);
      if (m.group) {
        api.getGroup(m.group).then((g) => setGroupModules(g.modules)).catch(() => {});
      }
    }).catch((e) => setError(String(e)));
  }, [slug]);

  const nextModule = (() => {
    if (!mod || groupModules.length === 0) return null;
    const i = groupModules.findIndex((m) => m.slug === mod.slug);
    if (i < 0 || i >= groupModules.length - 1) return null;
    return groupModules[i + 1] ?? null;
  })();

  if (error)
    return <p className="text-destructive">Failed to load: {error}</p>;
  if (!mod) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <article className="space-y-8">
      <Button variant="ghost" size="sm" asChild className="-ml-3">
        <Link to={mod.group ? `/groups/${mod.group}` : "/groups"}>
          <ChevronLeft className="h-4 w-4" />
          {mod.group ? `${mod.group.charAt(0).toUpperCase() + mod.group.slice(1)} Tenses` : "All groups"}
        </Link>
      </Button>

      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <Badge variant="outline">{mod.level}</Badge>
          <span className="text-sm text-muted-foreground">
            {mod.exerciseCount} exercises
          </span>
        </div>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">
          {mod.title}
        </h1>
        {mod.summary && (
          <p className="max-w-2xl text-muted-foreground">{mod.summary}</p>
        )}
      </header>

      <Card>
        <CardContent className="prose-module pt-6">
          <Markdown>{mod.body}</Markdown>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="font-serif text-2xl font-semibold">Exercises</h2>
        <ExerciseRunner module={mod} nextModule={nextModule} />
      </section>
    </article>
  );
}
