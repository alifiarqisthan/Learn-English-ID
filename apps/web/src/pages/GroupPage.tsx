import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowRight, BookOpen, ChevronLeft } from "lucide-react";
import type { ModuleGroupSummary, ModuleSummary } from "@app/shared";
import { api } from "../api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  GroupRoadmap,
  isGroupComplete,
} from "@/components/group-roadmap";

type Progress = Record<
  string,
  { completedAt: string | null; lastScore: number | null }
>;

export default function GroupPage() {
  const { slug = "" } = useParams();
  const [modules, setModules] = useState<ModuleSummary[] | null>(null);
  const [groups, setGroups] = useState<ModuleGroupSummary[] | null>(null);
  const [progress, setProgress] = useState<Progress>({});
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  const fetchProgress = useCallback(() => {
    api.getProgress().then((rows) => {
      const map: Progress = {};
      for (const r of rows) map[r.slug] = { completedAt: r.completedAt, lastScore: r.lastScore };
      setProgress(map);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    api.listModules().then(setModules).catch((e) => setError(String(e)));
    api.listGroups().then(setGroups).catch((e) => setError(String(e)));
  }, []);

  useEffect(() => { fetchProgress(); }, [fetchProgress, location.key]);

  useEffect(() => {
    const onFocus = () => fetchProgress();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchProgress]);

  if (error) return <p className="text-destructive">Failed to load: {error}</p>;
  if (!modules || !groups) return <p className="text-muted-foreground">Loading…</p>;

  const group = groups.find((g) => g.slug === slug);
  if (!group) return <p className="text-destructive">Group not found.</p>;

  const groupModules = modules.filter((m) => m.group === slug);

  // Cascade: determine if this group is unlocked
  let groupUnlocked = true;
  for (const g of groups) {
    if (g.slug === slug) break;
    const gMods = modules.filter((m) => m.group === g.slug);
    if (!isGroupComplete({ slug: g.slug, modules: gMods }, progress)) {
      groupUnlocked = false;
      break;
    }
  }

  const ctx = { groupUnlocked, hasTest: group.hasTest };
  const groupIdx = groups.findIndex((g) => g.slug === slug);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <Button variant="ghost" size="sm" asChild className="-ml-3">
          <Link to="/groups">
            <ChevronLeft className="h-4 w-4" />
            All groups
          </Link>
        </Button>
      </div>

      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Group {groupIdx + 1} of {groups.length}
        </p>
        <div className="flex items-baseline gap-3">
          <h1 className="font-serif text-3xl font-semibold tracking-tight">{group.title}</h1>
          {!groupUnlocked && <Badge variant="secondary">Locked</Badge>}
        </div>
        {group.summary && (
          <p className="max-w-2xl text-muted-foreground">{group.summary}</p>
        )}
      </header>

      {/* Roadmap */}
      <GroupRoadmap
        group={group}
        modules={groupModules}
        progress={progress}
        context={ctx}
      />

      {/* Link to full group explanation / summaries */}
      <Card className="border-dashed border-accent/40">
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-accent shrink-0" />
            <div>
              <p className="font-medium text-sm">{group.title} — Explanation & Summaries</p>
              <p className="text-xs text-muted-foreground">
                Group intro, quick summaries from all 4 modules, and the group test.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link to={`/groups/${slug}/overview`}>
              Open <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
