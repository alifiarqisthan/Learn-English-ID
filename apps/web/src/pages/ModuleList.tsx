import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Lock, Trophy } from "lucide-react";
import type { MasterGroupSlug, ModuleGroupSummary, ModuleSummary } from "@app/shared";
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

const MASTER_SLUGS: MasterGroupSlug[] = [
  "tenses", "sentence-structure", "nouns-articles", "passive-voice",
  "modals-hedging", "conditionals", "verb-patterns", "comparisons", "connectors-cohesion",
];

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

  // Group subgroups by masterGroup, preserving order
  type MasterEntry = {
    masterSlug: MasterGroupSlug;
    subgroups: { group: ModuleGroupSummary; modules: ModuleSummary[]; ctx: { groupUnlocked: boolean; hasTest: boolean } }[];
    allSubgroupsComplete: boolean;
    masterUnlocked: boolean;
  };

  let prevMasterComplete = true;
  const masterEntries: MasterEntry[] = MASTER_SLUGS.map((masterSlug) => {
    const subgroupsForMaster = groups.filter((g) => g.masterGroup === masterSlug);
    const masterUnlocked = prevMasterComplete;
    let allSubgroupsComplete = true;
    let allPriorSubgroupsComplete = masterUnlocked;

    const subgroups = subgroupsForMaster.map((g) => {
      const groupModules = modules.filter((m) => m.group === g.slug);
      const ctx = { groupUnlocked: allPriorSubgroupsComplete, hasTest: g.hasTest };
      if (!isGroupComplete({ slug: g.slug, modules: groupModules }, progress)) {
        allPriorSubgroupsComplete = false;
        allSubgroupsComplete = false;
      }
      return { group: g, modules: groupModules, ctx };
    });

    if (!allSubgroupsComplete) prevMasterComplete = false;
    return { masterSlug, subgroups, allSubgroupsComplete, masterUnlocked };
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
          Indonesia works. 9 master groups, each with subgroups, modules, and a
          group challenge.
        </p>
      </section>

      {masterEntries.map(({ masterSlug, subgroups, allSubgroupsComplete, masterUnlocked }, masterIdx) => (
        <section key={masterSlug} className="space-y-6">
          <Separator />
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Master Group {masterIdx + 1} of {masterEntries.length}
              </p>
              <h2 className="font-serif text-2xl font-semibold">
                <Link
                  to={`/groups?master=${masterSlug}`}
                  className="hover:text-accent transition-colors"
                >
                  {masterSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </Link>
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {!masterUnlocked && <Badge variant="secondary">Locked</Badge>}
              <Button asChild variant="outline" size="sm">
                <Link to={`/groups?master=${masterSlug}`}>
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>

          {subgroups.map(({ group, modules: groupModules, ctx }, idx) => (
            <div key={group.slug} className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Subgroup {idx + 1} of {subgroups.length}
                  </p>
                  <h3 className="font-serif text-xl font-semibold">{group.title}</h3>
                  {group.summary && (
                    <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">{group.summary}</p>
                  )}
                </div>
                {!ctx.groupUnlocked && <Badge variant="secondary">Locked</Badge>}
              </div>
              <GroupRoadmap
                group={group}
                modules={groupModules}
                progress={progress}
                context={ctx}
              />
            </div>
          ))}

          {/* Per-master-group challenge card */}
          <Card className={cn(!allSubgroupsComplete && "opacity-60")}>
            <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Trophy className={cn("h-5 w-5 shrink-0", allSubgroupsComplete ? "text-accent" : "text-muted-foreground")} />
                <div className="space-y-0.5">
                  <p className="font-serif font-semibold">Group Challenge</p>
                  <p className="text-xs text-muted-foreground">
                    {allSubgroupsComplete
                      ? "20 cross-subgroup questions — pass mark 70%."
                      : "Pass all subgroup tests to unlock."}
                  </p>
                </div>
              </div>
              {allSubgroupsComplete ? (
                <Button asChild size="sm" className="shrink-0">
                  <Link to={`/groups/${masterSlug}/master-test`}>
                    Start <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button disabled variant="outline" size="sm" className="shrink-0">
                  <Lock className="h-4 w-4 mr-1" /> Locked
                </Button>
              )}
            </CardContent>
          </Card>
        </section>
      ))}
    </div>
  );
}
