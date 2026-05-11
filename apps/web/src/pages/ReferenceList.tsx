import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookMarked } from "lucide-react";
import type { ReferenceSummary, ReferenceCategory } from "@app/shared";
import { api } from "../api";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const CATEGORY_LABEL: Record<ReferenceCategory, string> = {
  foundation: "Foundation",
  vocabulary: "Vocabulary",
  structure: "Sentence Structure",
  exam: "Exam Strategy",
};

const CATEGORY_ORDER: ReferenceCategory[] = [
  "foundation",
  "vocabulary",
  "structure",
  "exam",
];

export default function ReferenceList() {
  const [refs, setRefs] = useState<ReferenceSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listReferences().then(setRefs).catch((e) => setError(String(e)));
  }, []);

  const grouped = useMemo(() => {
    if (!refs) return null;
    const map: Record<string, ReferenceSummary[]> = {};
    for (const r of refs) (map[r.category] ??= []).push(r);
    return map;
  }, [refs]);

  if (error)
    return <p className="text-destructive">Failed to load: {error}</p>;
  if (!refs || !grouped)
    return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <Badge variant="accent" className="rounded">
          Cheat sheets · No exercises
        </Badge>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">
          Quick References
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Foundation grammar resources to keep open while you study. Each is a
          structured cheat sheet — tables, formulas, and a "common mistakes by
          Indonesian learners" section. Linked from inside lesson modules.
        </p>
      </section>

      {CATEGORY_ORDER.map((cat) => {
        const items = grouped[cat];
        if (!items || items.length === 0) return null;
        return (
          <section key={cat} className="space-y-4">
            <Separator />
            <div className="flex items-center gap-2">
              <BookMarked className="h-5 w-5 text-accent" />
              <h2 className="font-serif text-2xl font-semibold">
                {CATEGORY_LABEL[cat]}
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((r) => (
                <Link
                  key={r.slug}
                  to={`/references/${r.slug}`}
                  className="block"
                >
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardHeader>
                      <CardTitle className="text-xl">{r.title}</CardTitle>
                      {r.summary && (
                        <CardDescription className="mt-2">
                          {r.summary}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {r.readingMinutes
                            ? `${r.readingMinutes} min read`
                            : "Cheat sheet"}
                        </span>
                        <span className="flex items-center gap-1 font-medium text-accent">
                          Open <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
