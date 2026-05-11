import { useEffect, useState } from "react";
import { api } from "../api";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type Row = {
  slug: string;
  lastScore: number | null;
  completedAt: string | null;
};

export default function ProgressPage() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    api.getProgress().then(setRows).catch(() => setRows([]));
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge variant="secondary">Live</Badge>
        <h1 className="font-serif text-4xl font-semibold">Progress</h1>
        <p className="max-w-2xl text-muted-foreground">
          Your attempt history and module completion. More charts (streaks,
          accuracy by topic) coming soon.
        </p>
      </div>

      {!rows ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No progress yet. Start a module from the Modules tab.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((r) => (
            <Card key={r.slug}>
              <CardHeader>
                <CardTitle className="text-lg">{r.slug}</CardTitle>
                <CardDescription>
                  {r.completedAt
                    ? `Completed ${new Date(r.completedAt).toLocaleDateString()}`
                    : "In progress"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Progress value={r.lastScore ?? 0} />
                <p className="text-sm text-muted-foreground">
                  Last score: <span className="font-semibold text-foreground">{r.lastScore ?? 0}%</span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
