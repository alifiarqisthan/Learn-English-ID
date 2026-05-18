import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight, BookOpen, CheckCircle2, ClipboardList,
  FileText, Flame, GraduationCap, LayoutGrid, TrendingUp,
} from "lucide-react";
import type { MasterGroupSlug, ModuleGroupSummary, ModuleSummary } from "@app/shared";
import { PASS_THRESHOLD } from "@app/shared";
import { api } from "../api";
import { useAuth } from "../contexts/AuthContext";
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
  { slug: "tenses",              title: "12 Tenses",                     icon: "⏱",  description: "All 12 English tenses from Present Simple to Future Perfect Continuous.", level: "A1 → C1" },
  { slug: "sentence-structure",  title: "Sentence Structure & Clauses",  icon: "🔗",  description: "Relative, noun, and adverb clauses — build complex, academic-quality sentences.", level: "A2 → C1" },
  { slug: "nouns-articles",      title: "Nouns, Articles & Determiners", icon: "🔤",  description: "A/an/the/zero article, quantifiers, and subject-verb agreement.", level: "A1 → B2" },
  { slug: "passive-voice",       title: "Passive Voice",                 icon: "🔄",  description: "Form the passive in every tense, with modals, and in academic reporting.", level: "B1 → C1" },
  { slug: "modals-hedging",      title: "Modals & Hedging",              icon: "💬",  description: "Can, must, should, modal perfects, and hedging language for IELTS band 7+.", level: "A2 → C1" },
  { slug: "conditionals",        title: "Conditionals",                  icon: "↔️", description: "All four conditional types plus mixed conditionals and alternatives.", level: "B1 → C1" },
  { slug: "verb-patterns",       title: "Verb Patterns",                 icon: "⚡",  description: "Gerunds vs infinitives, reported speech, and causative verbs.", level: "B1 → C1" },
  { slug: "comparisons",         title: "Comparisons",                   icon: "📊",  description: "Comparatives, superlatives, as…as structures, and double comparatives.", level: "A2 → B2" },
  { slug: "connectors-cohesion", title: "Connectors & Cohesion",         icon: "📝",  description: "Linking words and cohesive devices for IELTS Writing Coherence & Cohesion.", level: "B1 → C1" },
];

const QUICK_NAV = [
  {
    to: "/groups",
    icon: LayoutGrid,
    label: "Modules",
    description: "Browse all 9 grammar groups",
    accent: false,
  },
  {
    to: "/references",
    icon: FileText,
    label: "References",
    description: "Quick grammar cheat sheets",
    accent: false,
  },
  {
    to: "/mock-test",
    icon: ClipboardList,
    label: "Mock Test",
    description: "TOEFL iBT & ITP full practice",
    accent: true,
  },
  {
    to: "/progress",
    icon: TrendingUp,
    label: "My Progress",
    description: "Track scores & completed lessons",
    accent: false,
  },
];

export default function HomePage() {
  const { user } = useAuth();
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

  const activeModules = modules?.filter((m) => !m.placeholder) ?? [];
  const totalModules = activeModules.length;
  const passedModules = activeModules.filter((m) => isPassed(progress[m.slug])).length;
  const overallPct = totalModules > 0 ? Math.round((passedModules / totalModules) * 100) : 0;
  const inProgressModules = activeModules.filter(
    (m) => progress[m.slug] && !isPassed(progress[m.slug])
  );
  const nextModule = inProgressModules[0] ?? activeModules.find((m) => !progress[m.slug]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-10">

      {/* ── Hero ── */}
      <section className="space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">
              {greeting}{user ? `, ${user.name}` : ""}
            </p>
            <h1 className="font-serif text-3xl font-semibold tracking-tight">
              Master English Grammar,<br className="hidden sm:block" /> the academic way.
            </h1>
          </div>
          <Badge variant="accent" className="rounded shrink-0 mt-1">TOEFL · IELTS prep</Badge>
        </div>

        {/* Overall progress bar */}
        {totalModules > 0 && (
          <div className="max-w-md space-y-1.5 pt-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-accent" />
                Overall progress
              </span>
              <span>{passedModules} / {totalModules} lessons passed · {overallPct}%</span>
            </div>
            <Progress value={overallPct} className="h-2" />
          </div>
        )}
      </section>

      {/* ── Quick nav ── */}
      <section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUICK_NAV.map(({ to, icon: Icon, label, description, accent }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "group flex flex-col gap-2 rounded-xl border p-4 transition-all hover:shadow-md",
                accent
                  ? "border-accent/40 bg-accent/5 hover:bg-accent/10"
                  : "border-border bg-card hover:border-accent/30",
              )}
            >
              <div className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                accent ? "bg-accent/15 text-accent" : "bg-secondary text-muted-foreground group-hover:text-accent",
              )}>
                <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
              </div>
              <div>
                <p className={cn("text-sm font-semibold", accent && "text-accent")}>{label}</p>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Continue / Start learning ── */}
      {nextModule && (
        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold">
            {inProgressModules.length > 0 ? "Continue Learning" : "Start Here"}
          </h2>
          <Link
            to={`/modules/${nextModule.slug}`}
            className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 hover:border-accent/40 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">
                  {inProgressModules.length > 0 ? "Pick up where you left off" : "Recommended next lesson"}
                </p>
                <p className="font-semibold text-sm truncate">{nextModule.title}</p>
                <p className="text-xs text-muted-foreground truncate">{nextModule.summary}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {progress[nextModule.slug] && !isPassed(progress[nextModule.slug]) && (
                <Badge variant="outline" className="text-[10px] hidden sm:flex">
                  Last: {progress[nextModule.slug].lastScore ?? 0}%
                </Badge>
              )}
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
            </div>
          </Link>
        </section>
      )}

      {/* ── Course modules grid ── */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-2xl font-semibold">Course Modules</h2>
          <p className="text-xs text-muted-foreground hidden sm:block">All modules are open — start anywhere.</p>
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
                  <Button
                    asChild
                    size="sm"
                    variant={started && !stats.complete ? "default" : "outline"}
                    className="w-full mt-1"
                  >
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

      {/* ── Footer tip ── */}
      <section className="rounded-xl border border-dashed border-border bg-secondary/30 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Ready to test yourself?</p>
          <p className="text-xs text-muted-foreground">
            Try a full-length TOEFL iBT or ITP practice test — timed, scored, with answer review.
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link to="/mock-test">
            Go to Mock Test <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </section>

    </div>
  );
}
