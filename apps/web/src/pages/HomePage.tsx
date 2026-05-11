import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, BookOpen, CheckCircle2, Lock, Star } from "lucide-react";
import type { MasterGroupSlug, ModuleGroupSummary, ModuleSummary } from "@app/shared";
import { PASS_THRESHOLD } from "@app/shared";
import { api } from "../api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { isGroupComplete } from "@/components/group-roadmap";

type ProgressMap = Record<string, { completedAt: string | null; lastScore: number | null }>;

function isPassed(p?: { completedAt: string | null; lastScore: number | null }) {
  return !!p && p.completedAt != null && (p.lastScore ?? 0) >= PASS_THRESHOLD;
}

const MASTER_GROUPS: {
  slug: MasterGroupSlug;
  title: string;
  icon: string;
  description: string;
  level: string;
}[] = [
  { slug: "tenses",           title: "12 Tenses",                    icon: "⏱", description: "All 12 English tenses from Present Simple to Future Perfect Continuous. The absolute foundation of English grammar.", level: "A1 → C1" },
  { slug: "sentence-structure", title: "Sentence Structure & Clauses", icon: "🔗", description: "Relative, noun, and adverb clauses — how to build complex, academic-quality sentences.", level: "A2 → C1" },
  { slug: "nouns-articles",   title: "Nouns, Articles & Determiners", icon: "🔤", description: "A/an/the/zero article, quantifiers, and subject-verb agreement — the most common Indonesian learner traps.", level: "A1 → B2" },
  { slug: "passive-voice",    title: "Passive Voice",                 icon: "🔄", description: "Form the passive in every tense, with modals, and in academic reporting structures.", level: "B1 → C1" },
  { slug: "modals-hedging",   title: "Modals & Hedging",              icon: "💬", description: "Can, must, should, modal perfects, and the hedging language essential for IELTS Academic band 7+.", level: "A2 → C1" },
  { slug: "conditionals",     title: "Conditionals",                  icon: "↔️", description: "All four conditional types plus mixed conditionals and conditional alternatives (unless, provided that).", level: "B1 → C1" },
  { slug: "verb-patterns",    title: "Verb Patterns",                 icon: "⚡", description: "Gerunds vs infinitives, reported speech, and causative verbs — the verb complementation patterns tested on TOEFL.", level: "B1 → C1" },
  { slug: "comparisons",      title: "Comparisons",                   icon: "📊", description: "Comparatives, superlatives, as…as structures, and double comparatives — essential for IELTS Task 1.", level: "A2 → B2" },
  { slug: "connectors-cohesion", title: "Connectors & Cohesion",      icon: "📝", description: "Linking words, discourse markers, and advanced cohesive devices for IELTS Writing Coherence & Cohesion.", level: "B1 → C1" },
];

export default function HomePage() {
  const [modules, setModules] = useState<ModuleSummary[] | null>(null);
  const [groups, setGroups] = useState<ModuleGroupSummary[] | null>(null);
  const [progress, setProgress] = useState<ProgressMap>({});
  const location = useLocation();

  const fetchProgress = useCallback(() => {
    api.getProgress().then((rows) => {
      const map: ProgressMap = {};
      for (const r of rows) map[r.slug] = { completedAt: r.completedAt, lastScore: r.lastScore };
      setProgress(map);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    api.listModules().then(setModules).catch(() => {});
    api.listGroups().then(setGroups).catch(() => {});
  }, []);

  useEffect(() => { fetchProgress(); }, [fetchProgress, location.key]);
  useEffect(() => {
    const onFocus = () => fetchProgress();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchProgress]);

  function masterStats(masterSlug: MasterGroupSlug) {
    if (!groups || !modules) return { subgroups: 0, total: 0, passed: 0, complete: false };
    const subgroups = groups.filter((g) => g.masterGroup === masterSlug);
    const masterModules = modules.filter((m) => subgroups.some((g) => g.slug === m.group));
    const active = masterModules.filter((m) => !m.placeholder);
    const passed = active.filter((m) => isPassed(progress[m.slug])).length;
    const complete = active.length > 0 && subgroups.every((g) => {
      const gMods = masterModules.filter((m) => m.group === g.slug);
      return isGroupComplete({ slug: g.slug, modules: gMods }, progress);
    });
    return { subgroups: subgroups.length, total: active.length, passed, complete };
  }

  const totalModules = modules?.filter((m) => !m.placeholder).length ?? 0;
  const passedModules = modules?.filter((m) => !m.placeholder && isPassed(progress[m.slug])).length ?? 0;
  const overallPct = totalModules > 0 ? Math.round((passedModules / totalModules) * 100) : 0;

  // Master test: unlock when tenses master group is complete
  const tensesComplete = masterStats("tenses").complete;
  const masterPassed = isPassed(progress["group-test:master"]);

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="space-y-4">
        <Badge variant="accent" className="rounded">For Indonesian learners</Badge>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">
          Master English Grammar, the academic way.
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          A structured TOEFL/IELTS grammar course for Indonesian learners.
          9 modules · 22 subgroups · 73 lessons — jump to any module, any time.
        </p>
        {totalModules > 0 && (
          <div className="max-w-sm space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Overall progress</span>
              <span>{passedModules} / {totalModules} lessons passed</span>
            </div>
            <Progress value={overallPct} className="h-2" />
          </div>
        )}
      </section>

      {/* Master group grid — all freely accessible, no inter-module locking */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-2xl font-semibold">Course Modules</h2>
          <p className="text-xs text-muted-foreground">All modules are open — start anywhere.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MASTER_GROUPS.map((mg) => {
            const stats = masterStats(mg.slug);
            const pct = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;
            const started = stats.passed > 0;

            return (
              <Card
                key={mg.slug}
                className={cn(
                  "transition-shadow hover:shadow-md",
                  stats.complete && "border-accent/40",
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-2xl leading-none">{mg.icon}</span>
                    <div className="flex items-center gap-1.5">
                      {stats.complete && <CheckCircle2 className="h-4 w-4 text-accent" />}
                      <Badge variant="outline" className="text-[10px]">{mg.level}</Badge>
                    </div>
                  </div>
                  <CardTitle className="font-serif text-lg leading-snug">{mg.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <p className="text-xs text-muted-foreground leading-relaxed">{mg.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5 shrink-0" />
                    <span>{stats.subgroups} subgroups · {stats.total} lessons</span>
                  </div>
                  {stats.total > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>{stats.passed}/{stats.total} passed</span>
                        <span>{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  )}
                  <Button asChild size="sm" variant={started && !stats.complete ? "default" : "outline"} className="w-full mt-1">
                    <Link to={`/groups?master=${mg.slug}`}>
                      {stats.complete ? "Review" : started ? "Continue" : "Start"}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Final master test */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-accent" />
          <h2 className="font-serif text-xl font-semibold">Final Challenge</h2>
        </div>
        <Card className={cn(!tensesComplete && "opacity-60")}>
          <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-serif font-semibold">Master Test — All 12 Tenses</p>
                {!tensesComplete && <Lock className="h-4 w-4 text-muted-foreground" />}
                {masterPassed && <Badge variant="accent" className="rounded text-xs">Passed</Badge>}
              </div>
              <p className="text-sm text-muted-foreground max-w-md">
                20 cross-group contrast questions across all 12 tenses.
                {!tensesComplete && " Complete the 12 Tenses module first."}
              </p>
            </div>
            <div className="flex flex-col gap-2 shrink-0 sm:items-end">
              {tensesComplete ? (
                <Button asChild size="sm">
                  <Link to="/master-test">
                    {masterPassed ? "Retake" : "Start"} <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button disabled variant="outline" size="sm">
                  <Lock className="h-4 w-4 mr-1.5" /> Locked
                </Button>
              )}
              <Button asChild variant="link" className="px-0 text-xs h-auto">
                <Link to="/references/all-tenses-summary">12-tense cheat sheet →</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
