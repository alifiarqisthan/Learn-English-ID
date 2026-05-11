import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import type { ReferenceDetail } from "@app/shared";
import { api } from "../api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Markdown } from "@/components/markdown";

export default function ReferencePage() {
  const { slug = "" } = useParams();
  const [ref, setRef] = useState<ReferenceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRef(null);
    api.getReference(slug).then(setRef).catch((e) => setError(String(e)));
  }, [slug]);

  if (error)
    return <p className="text-destructive">Failed to load: {error}</p>;
  if (!ref) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <article className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-3">
        <Link to="/references">
          <ChevronLeft className="h-4 w-4" />
          All references
        </Link>
      </Button>

      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="capitalize">
            {ref.category}
          </Badge>
          {ref.readingMinutes && (
            <span className="text-sm text-muted-foreground">
              {ref.readingMinutes} min read
            </span>
          )}
        </div>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">
          {ref.title}
        </h1>
        {ref.summary && (
          <p className="max-w-2xl text-muted-foreground">{ref.summary}</p>
        )}
      </header>

      <Card>
        <CardContent className="prose-module pt-6">
          <Markdown>{ref.body}</Markdown>
        </CardContent>
      </Card>
    </article>
  );
}
