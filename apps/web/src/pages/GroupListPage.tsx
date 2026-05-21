import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, Lock, Search, Trophy, X } from "lucide-react";
import type { CefrLevel, MasterGroupSlug, ModuleGroupSummary, ModuleSummary } from "@app/shared";
import { PASS_THRESHOLD } from "@app/shared";
import { api } from "../api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { GroupRoadmap, isGroupComplete } from "@/components/group-roadmap";
import { Progress } from "@/components/ui/progress";

type ProgressMap = Record<string, { completedAt: string | null; lastScore: number | null }>;

function isPassed(p?: { completedAt: string | null; lastScore: number | null }) {
  return !!p && p.completedAt != null && (p.lastScore ?? 0) >= PASS_THRESHOLD;
}

const MASTER_GROUPS: { slug: MasterGroupSlug; title: string; icon: string }[] = [
  { slug: "tenses",              title: "12 Tenses",                    icon: "⏱" },
  { slug: "sentence-structure",  title: "Sentence Structure",            icon: "🔗" },
  { slug: "nouns-articles",      title: "Nouns & Articles",              icon: "🔤" },
  { slug: "passive-voice",       title: "Passive Voice",                 icon: "🔄" },
  { slug: "modals-hedging",      title: "Modals & Hedging",              icon: "💬" },
  { slug: "conditionals",        title: "Conditionals",                  icon: "↔️" },
  { slug: "verb-patterns",       title: "Verb Patterns",                 icon: "⚡" },
  { slug: "comparisons",         title: "Comparisons",                   icon: "📊" },
  { slug: "connectors-cohesion", title: "Connectors & Cohesion",         icon: "📝" },
];

const MASTER_DESCRIPTIONS: Record<MasterGroupSlug, string> = {
  "tenses":              "All 12 English tenses across 3 subgroups — Present, Past, Future.",
  "sentence-structure":  "Sentence types, relative clauses, noun clauses, and adverb clauses.",
  "nouns-articles":      "Articles (a/an/the/zero), quantifiers, and subject-verb agreement.",
  "passive-voice":       "Passive in all tenses, with modals, and academic reporting structures.",
  "modals-hedging":      "Core modals, modal perfects, and academic hedging language.",
  "conditionals":        "Zero/first, second/third, mixed conditionals, and conditional alternatives.",
  "verb-patterns":       "Gerunds & infinitives, reported speech, and causative verbs.",
  "comparisons":         "Comparatives, superlatives, as…as, and double comparatives.",
  "connectors-cohesion": "Basic connectors and advanced cohesive devices.",
};

const LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function GroupListPage() {
  const [modules, setModules] = useState<ModuleSummary[] | null>(null);
  const [groups, setGroups] = useState<ModuleGroupSummary[] | null>(null);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const masterSlug = searchParams.get("master") as MasterGroupSlug | null;
  const levelFilter = searchParams.get("level") as CefrLevel | null;
  const [query, setQuery] = useState("");

  const fetchProgress = useCallback(() => {
    api.getProgress().then((rows) => {
      const map: ProgressMap = {};
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

  function setMaster(slug: MasterGroupSlug | null) {
    const p = new URLSearchParams(searchParams);
    if (slug) p.set("master", slug); else p.delete("master");
    p.delete("level");
    setSearchParams(p, { replace: true });
  }

  function toggleLevel(lvl: CefrLevel) {
    const p = new URLSearchParams(searchParams);
    if (levelFilter === lvl) p.delete("level");
    else p.set("level", lvl);
    setSearchParams(p, { replace: true });
  }

  function masterStats(slug: MasterGroupSlug) {
    const subs = groups!.filter((g) => g.masterGroup === slug);
    const mods = modules!.filter((m) => subs.some((g) => g.slug === m.group) && !m.placeholder);
    const passed = mods.filter((m) => isPassed(progress[m.slug])).length;
    const complete = mods.length > 0 && subs.every((g) => {
      const gMods = mods.filter((m) => m.group === g.slug);
      return isGroupComplete({ slug: g.slug, modules: gMods }, progress);
    });
    return { total: mods.length, passed, complete };
  }

  // ── Content for a selected master group ──────────────────────────────────
  function renderMasterGroup(slug: MasterGroupSlug) {
    const subgroups = groups!.filter((g) => g.masterGroup === slug);
    let allPriorComplete = true;

    const groupContexts = subgroups.map((g) => {
      let groupModules = modules!.filter((m) => m.group === g.slug);
      if (levelFilter) groupModules = groupModules.filter((m) => m.level === levelFilter);
      const ctx = { groupUnlocked: allPriorComplete, hasTest: g.hasTest };
      const allMods = modules!.filter((m) => m.group === g.slug);
      if (!isGroupComplete({ slug: g.slug, modules: allMods }, progress)) allPriorComplete = false;
      return { group: g, modules: groupModules, ctx };
    });

    const stats = masterStats(slug);
    const pct = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;

    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {stats.complete && <CheckCircle2 className="h-5 w-5 text-accent" />}
            <h1 className="font-serif text-3xl font-semibold tracking-tight">
              {MASTER_GROUPS.find((g) => g.slug === slug)?.title}
            </h1>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {MASTER_DESCRIPTIONS[slug]}
          </p>
          {stats.total > 0 && (
            <div className="max-w-xs space-y-1 pt-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{stats.passed}/{stats.total} lessons passed</span>
                <span>{pct}%</span>
              </div>
              <Progress value={pct} className="h-1.5" />
            </div>
          )}
        </div>

        {/* Level filter chips */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center">Filter by level:</span>
          {LEVELS.map((lvl) => (
            <button
              key={lvl}
              onClick={() => toggleLevel(lvl)}
              className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors",
                levelFilter === lvl
                  ? "bg-accent text-accent-foreground border-accent"
                  : "border-border text-muted-foreground hover:border-accent hover:text-foreground"
              )}
            >
              {lvl}
            </button>
          ))}
          {levelFilter && (
            <button
              onClick={() => toggleLevel(levelFilter)}
              className="px-2.5 py-0.5 rounded-full text-xs font-medium text-muted-foreground underline underline-offset-2"
            >
              Clear
            </button>
          )}
        </div>

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
            {groupModules.length === 0 && levelFilter ? (
              <p className="text-sm text-muted-foreground">No {levelFilter} modules in this subgroup.</p>
            ) : (
              <GroupRoadmap group={group} modules={groupModules} progress={progress} context={ctx} />
            )}
          </section>
        ))}

        {/* Group Challenge */}
        <section className="space-y-4">
          <Separator />
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-accent" />
            <h2 className="font-serif text-2xl font-semibold">Group Challenge</h2>
          </div>
          <Card className={cn(!allPriorComplete && "opacity-60")}>
            <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-serif text-lg font-semibold">
                    Master Test — {MASTER_GROUPS.find((g) => g.slug === slug)?.title}
                  </p>
                  {!allPriorComplete && <Lock className="h-4 w-4 text-muted-foreground" />}
                </div>
                <p className="text-sm text-muted-foreground">
                  20 cross-subgroup questions spanning everything in this group. Pass mark 70%.
                </p>
                {!allPriorComplete && (
                  <p className="text-xs text-muted-foreground">Pass all subgroup tests to unlock.</p>
                )}
              </div>
              {allPriorComplete ? (
                <Button asChild className="shrink-0">
                  <Link to={`/groups/${slug}/master-test`}>
                    Start Challenge <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button disabled variant="outline" className="shrink-0">
                  <Lock className="h-4 w-4 mr-2" /> Locked
                </Button>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    );
  }

  // ── Overview: all 9 master groups ────────────────────────────────────────
  function renderOverview() {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="font-serif text-3xl font-semibold tracking-tight">All Modules</h1>
          <p className="text-sm text-muted-foreground">
            9 master groups · select one to study its subgroups and modules.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MASTER_GROUPS.map((mg) => {
            const stats = masterStats(mg.slug);
            const pct = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;
            return (
              <button
                key={mg.slug}
                onClick={() => setMaster(mg.slug)}
                className={cn(
                  "text-left rounded-lg border bg-card p-4 transition-shadow hover:shadow-md",
                  stats.complete && "border-accent/50"
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xl">{mg.icon}</span>
                  {stats.complete && <CheckCircle2 className="h-4 w-4 text-accent" />}
                </div>
                <p className="font-serif font-semibold text-sm">{mg.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {MASTER_DESCRIPTIONS[mg.slug]}
                </p>
                {stats.total > 0 && (
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>{stats.passed}/{stats.total} passed</span>
                      <span>{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Search results view ─────────────────────────────────────────────────
  const trimmedQuery = query.trim().toLowerCase();
  const searchResults = trimmedQuery.length >= 2
    ? modules.filter((m) =>
        m.title.toLowerCase().includes(trimmedQuery) ||
        m.slug.replace(/-/g, " ").includes(trimmedQuery) ||
        (m.summary ?? "").toLowerCase().includes(trimmedQuery)
      )
    : [];

  function renderSearchResults() {
    if (searchResults.length === 0) {
      return (
        <div className="py-12 text-center text-muted-foreground text-sm">
          No modules found for "<strong>{query}</strong>"
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {searchResults.length} module{searchResults.length !== 1 ? "s" : ""} found
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {searchResults.map((mod) => {
            const passed = isPassed(progress[mod.slug]);
            const masterGroup = MASTER_GROUPS.find((mg) =>
              groups!.some((g) => g.masterGroup === mg.slug && g.slug === mod.group)
            );
            return (
              <Link
                key={mod.slug}
                to={`/modules/${mod.slug}`}
                className="rounded-lg border bg-card p-4 hover:shadow-md transition-shadow space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-[10px]">{mod.level}</Badge>
                  {passed && <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />}
                </div>
                <p className="font-serif font-semibold text-sm leading-snug">{mod.title}</p>
                {mod.summary && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{mod.summary}</p>
                )}
                {masterGroup && (
                  <p className="text-[11px] text-muted-foreground pt-1">
                    {masterGroup.icon} {masterGroup.title}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search bar — always visible at top */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search modules… (e.g. past perfect, hedging, causative)"
          className="w-full rounded-md border border-input bg-background pl-9 pr-9 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search results OR normal layout */}
      {trimmedQuery.length >= 2 ? (
        <div>{renderSearchResults()}</div>
      ) : (
        <div className="space-y-4">
          {/* Mobile: horizontal scroll tabs */}
          <div className="md:hidden flex gap-1 overflow-x-auto pb-1 border-b w-full">
            <button
              onClick={() => setMaster(null)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm whitespace-nowrap shrink-0",
                !masterSlug ? "bg-secondary font-medium" : "text-muted-foreground"
              )}
            >
              All
            </button>
            {MASTER_GROUPS.map((mg) => (
              <button
                key={mg.slug}
                onClick={() => setMaster(mg.slug)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm whitespace-nowrap shrink-0",
                  masterSlug === mg.slug ? "bg-secondary font-medium" : "text-muted-foreground"
                )}
              >
                {mg.icon} {mg.title}
              </button>
            ))}
          </div>

          <div className="flex gap-6 min-h-[calc(100vh-4rem)]">
            {/* Sidebar — desktop only */}
            <aside className="hidden md:flex flex-col w-56 shrink-0 gap-1 pt-1">
              <button
                onClick={() => setMaster(null)}
                className={cn(
                  "text-left px-3 py-2 rounded-md text-sm transition-colors",
                  !masterSlug
                    ? "bg-secondary font-medium text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60"
                )}
              >
                All Groups
              </button>
              <Separator className="my-1" />
              {MASTER_GROUPS.map((mg) => {
                const stats = masterStats(mg.slug);
                return (
                  <button
                    key={mg.slug}
                    onClick={() => setMaster(mg.slug)}
                    className={cn(
                      "text-left px-3 py-2 rounded-md text-sm transition-colors flex items-start justify-between gap-2",
                      masterSlug === mg.slug
                        ? "bg-secondary font-medium text-foreground"
                        : "text-muted-foreground hover:bg-secondary/60"
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">{mg.icon}</span>
                      <span className="leading-tight">{mg.title}</span>
                    </span>
                    {stats.complete && <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" />}
                  </button>
                );
              })}
            </aside>

            {/* Main content */}
            <main className="flex-1 min-w-0 py-1">
              {masterSlug ? renderMasterGroup(masterSlug) : renderOverview()}
            </main>
          </div>
        </div>
      )}
    </div>
  );
}
