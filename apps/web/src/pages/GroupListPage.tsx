import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import type { MasterGroupSlug, ModuleGroupSummary, ModuleSummary } from "@app/shared";
import { api } from "../api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  GroupRoadmap,
  isGroupComplete,
} from "@/components/group-roadmap";

type Progress = Record<
  string,
  { completedAt: string | null; lastScore: number | null }
>;

const MASTER_TITLES: Record<MasterGroupSlug, string> = {
  "tenses":              "12 Tenses",
  "sentence-structure":  "Sentence Structure & Clauses",
  "nouns-articles":      "Nouns, Articles & Determiners",
  "passive-voice":       "Passive Voice",
  "modals-hedging":      "Modals & Hedging",
  "conditionals":        "Conditionals",
  "verb-patterns":       "Verb Patterns",
  "comparisons":         "Comparisons",
  "connectors-cohesion": "Connectors & Cohesion",
};

const MASTER_DESCRIPTIONS: Record<MasterGroupSlug, string> = {
  "tenses":              "All 12 English tenses across 3 subgroups — Present, Past, Future. Complete each subgroup and its test to unlock the next.",
  "sentence-structure":  "Sentence types, relative clauses, noun clauses, and adverb clauses — 4 subgroups for building complex academic sentences.",
  "nouns-articles":      "Articles (a/an/the/zero), quantifiers & determiners, and subject-verb agreement — 3 subgroups targeting the most common Indonesian learner errors.",
  "passive-voice":       "Passive in all tenses, passive with modals, and academic passive reporting structures — 2 subgroups.",
  "modals-hedging":      "Core modals, modal perfects & deduction, and academic hedging language — 3 subgroups from A2 to C1.",
  "conditionals":        "Zero/first, second/third, mixed conditionals, and conditional alternatives — 3 subgroups.",
  "verb-patterns":       "Gerunds & infinitives, reported speech, and causative verbs — 3 subgroups covering verb complementation.",
  "comparisons":         "Comparatives, superlatives, as…as structures, and double comparatives — 2 subgroups essential for IELTS Task 1.",
  "connectors-cohesion": "Basic connectors and advanced cohesive devices — 2 subgroups for IELTS Writing Coherence & Cohesion band 7+.",
};

export default function GroupListPage() {
  const [modules, setModules] = useState<ModuleSummary[] | null>(null);
  const [groups, setGroups] = useState<ModuleGroupSummary[] | null>(null);
  const [progress, setProgress] = useState<Progress>({});
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const masterSlug = (searchParams.get("master") ?? "tenses") as MasterGroupSlug;

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

  // Filter subgroups to the current master group
  const subgroups = groups.filter((g) => g.masterGroup === masterSlug);

  // Cascade unlocking within this master group
  let allPriorComplete = true;
  const groupContexts = subgroups.map((g) => {
    const groupModules = modules.filter((m) => m.group === g.slug);
    const ctx = { groupUnlocked: allPriorComplete, hasTest: g.hasTest };
    if (!isGroupComplete({ slug: g.slug, modules: groupModules }, progress)) {
      allPriorComplete = false;
    }
    return { group: g, modules: groupModules, ctx };
  });

  const masterTitle = MASTER_TITLES[masterSlug] ?? masterSlug;
  const masterDesc = MASTER_DESCRIPTIONS[masterSlug] ?? "";

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-3">
          <Link to="/">
            <ChevronLeft className="h-4 w-4" />
            All modules
          </Link>
        </Button>
        <div className="space-y-1.5">
          <h1 className="font-serif text-3xl font-semibold tracking-tight">{masterTitle}</h1>
          <p className="max-w-2xl text-muted-foreground text-sm">{masterDesc}</p>
        </div>
      </div>

      {groupContexts.length === 0 && (
        <p className="text-muted-foreground">No subgroups found for this module.</p>
      )}

      {groupContexts.map(({ group, modules: groupModules, ctx }, idx) => (
        <section key={group.slug} className="space-y-4">
          <Separator />
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Subgroup {idx + 1} of {groupContexts.length}
              </p>
              <h2 className="font-serif text-2xl font-semibold">{group.title}</h2>
              {group.summary && (
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{group.summary}</p>
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
        </section>
      ))}
    </div>
  );
}
