import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Lock, Star } from "lucide-react";
import type { ModuleGroupSummary, ModuleSummary } from "@app/shared";
import { api } from "../api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  GroupRoadmap,
  isGroupComplete,
} from "@/components/group-roadmap";

type Progress = Record<
  string,
  { completedAt: string | null; lastScore: number | null }
>;

export default function ModuleList() {
  const [modules, setModules] = useState<ModuleSummary[] | null>(null);
  const [groups, setGroups] = useState<ModuleGroupSummary[] | null>(null);
  const [progress, setProgress] = useState<Progress>({});
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  const fetchProgress = useCallback(() => {
    api
      .getProgress()
      .then((rows) => {
        const map: Progress = {};
        for (const r of rows) {
          map[r.slug] = {
            completedAt: r.completedAt,
            lastScore: r.lastScore,
          };
        }
        setProgress(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    api.listModules().then(setModules).catch((e) => setError(String(e)));
    api.listGroups().then(setGroups).catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress, location.key]);

  useEffect(() => {
    const onFocus = () => fetchProgress();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchProgress]);

  if (error)
    return (
      <p className="text-destructive">Failed to load: {error}</p>
    );
  if (!modules || !groups)
    return <p className="text-muted-foreground">Loading…</p>;

  // Cascade unlocking: a group is unlocked when ALL prior groups are complete.
  let allPriorGroupsComplete = true;
  const groupContexts = groups.map((g) => {
    const groupModules = modules.filter((m) => m.group === g.slug);
    const ctx = {
      groupUnlocked: allPriorGroupsComplete,
      hasTest: g.hasTest,
    };
    if (!isGroupComplete({ slug: g.slug, modules: groupModules }, progress)) {
      allPriorGroupsComplete = false;
    }
    return { group: g, modules: groupModules, ctx };
  });

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <Badge variant="accent" className="rounded">
          For Indonesian learners
        </Badge>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">
          Master English grammar, the academic way.
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          A structured TOEFL/IELTS grammar course built around how Bahasa
          Indonesia works. The 12 English tenses are organized into three
          groups — Present, Past, and Future — each with its own modules,
          recap, and group test.
        </p>
      </section>

      {groupContexts.map(({ group, modules: groupModules, ctx }, idx) => (
        <section key={group.slug} className="space-y-4">
          <Separator />
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Group {idx + 1} of {groupContexts.length}
              </p>
              <h2 className="font-serif text-2xl font-semibold">
                {group.title}
              </h2>
              {group.summary && (
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  {group.summary}
                </p>
              )}
            </div>
            {!ctx.groupUnlocked && (
              <Badge variant="secondary">Locked</Badge>
            )}
          </div>
          <GroupRoadmap
            group={group}
            modules={groupModules}
            progress={progress}
            context={ctx}
          />
        </section>
      ))}

      {/* Final challenge — unlocks when all 3 groups are complete */}
      <section className="space-y-4">
        <Separator />
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-accent" />
          <h2 className="font-serif text-2xl font-semibold">Final Challenge</h2>
        </div>
        <Card className={cn(!allPriorGroupsComplete && "opacity-60")}>
          <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-serif text-lg font-semibold">Master Test — All 12 Tenses</p>
                {!allPriorGroupsComplete && (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                20 cross-group contrast questions spanning every tense. The ultimate check
                that you can choose the right tense from context alone.
              </p>
              {!allPriorGroupsComplete && (
                <p className="text-xs text-muted-foreground">
                  Pass all 3 group tests to unlock.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              {allPriorGroupsComplete ? (
                <Button asChild>
                  <Link to="/master-test">
                    Start Master Test <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button disabled variant="outline">
                  <Lock className="h-4 w-4 mr-2" /> Locked
                </Button>
              )}
              <Button asChild variant="link" className="px-0 text-xs h-auto">
                <Link to="/references/all-tenses-summary">
                  View 12-tense summary cheat sheet →
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
