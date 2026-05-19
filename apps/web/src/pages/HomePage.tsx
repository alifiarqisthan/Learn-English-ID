import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight, BookOpen, CheckCircle2, ChevronRight, ClipboardList,
  FileText, Flame, GraduationCap, LayoutGrid, TrendingUp, Zap,
} from "lucide-react";
import type { MasterGroupSlug, ModuleGroupSummary, ModuleSummary } from "@app/shared";
import { PASS_THRESHOLD } from "@app/shared";
import { api } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
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
  level: string;
}[] = [
  { slug: "tenses",              title: "12 Tenses",                     icon: "⏱",  level: "A1–C1" },
  { slug: "sentence-structure",  title: "Sentence Structure & Clauses",  icon: "🔗",  level: "A2–C1" },
  { slug: "nouns-articles",      title: "Nouns, Articles & Determiners", icon: "🔤",  level: "A1–B2" },
  { slug: "passive-voice",       title: "Passive Voice",                 icon: "🔄",  level: "B1–C1" },
  { slug: "modals-hedging",      title: "Modals & Hedging",              icon: "💬",  level: "A2–C1" },
  { slug: "conditionals",        title: "Conditionals",                  icon: "↔️", level: "B1–C1" },
  { slug: "verb-patterns",       title: "Verb Patterns",                 icon: "⚡",  level: "B1–C1" },
  { slug: "comparisons",         title: "Comparisons",                   icon: "📊",  level: "A2–B2" },
  { slug: "connectors-cohesion", title: "Connectors & Cohesion",         icon: "📝",  level: "B1–C1" },
];

const QUICK_NAV = [
  { to: "/groups",           icon: LayoutGrid,   label: "Modules",         description: "9 grammar groups",          accent: false },
  { to: "/references",       icon: FileText,     label: "References",      description: "Grammar cheat sheets",      accent: false },
  { to: "/mock-test",        icon: ClipboardList,label: "Mock Test",       description: "TOEFL & IELTS full test",   accent: true  },
  { to: "/vocab-challenge",  icon: Zap,          label: "Vocab Challenge", description: "30 days · 15 words/day",    accent: false },
  { to: "/progress",         icon: TrendingUp,   label: "My Progress",     description: "Scores & completed lessons",accent: false },
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
    if (!groups || !modules) return { total: 0, passed: 0, complete: false };
    const subgroups = groups.filter((g) => g.masterGroup === masterSlug);
    const masterModules = modules.filter((m) => subgroups.some((g) => g.slug === m.group));
    const active = masterModules.filter((m) => !m.placeholder);
    const passed = active.filter((m) => isPassed(progress[m.slug])).length;
    const complete = active.length > 0 && subgroups.every((g) => {
      const gMods = masterModules.filter((m) => m.group === g.slug);
      return isGroupComplete({ slug: g.slug, modules: gMods }, progress);
    });
    return { total: active.length, passed, complete };
  }

  const activeModules = modules?.filter((m) => !m.placeholder) ?? [];
  const totalModules = activeModules.length;
  const passedModules = activeModules.filter((m) => isPassed(progress[m.slug])).length;
  const overallPct = totalModules > 0 ? Math.round((passedModules / totalModules) * 100) : 0;
  const inProgressModules = activeModules.filter((m) => progress[m.slug] && !isPassed(progress[m.slug]));
  const nextModule = inProgressModules[0] ?? activeModules.find((m) => !progress[m.slug]);

  // Vocab challenge progress from localStorage
  const vocabProgress = (() => {
    try { return JSON.parse(localStorage.getItem("vocab_challenge_progress") ?? "{}") as Record<string, string[]>; }
    catch { return {}; }
  })();
  const vocabDaysCompleted = Object.keys(vocabProgress).filter((d) => (vocabProgress[d]?.length ?? 0) >= 15).length;
  const vocabCurrentDay = Math.min(30, vocabDaysCompleted + 1);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-8">

      {/* ── Hero ── */}
      <section className="space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {greeting}{user ? `, ${user.name}` : ""}
            </p>
            <h1 className="font-serif text-3xl font-semibold tracking-tight">
              Master English Grammar,<br className="hidden sm:block" /> the academic way.
            </h1>
          </div>
          <Badge variant="accent" className="rounded shrink-0 mt-1">TOEFL · IELTS prep</Badge>
        </div>

        {totalModules > 0 && (
          <div className="max-w-md space-y-1.5 pt-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-accent" />
                Overall progress
              </span>
              <span>{passedModules}/{totalModules} lessons · {overallPct}%</span>
            </div>
            <Progress value={overallPct} className="h-2" />
          </div>
        )}
      </section>

      {/* ── Quick nav ── */}
      <section>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          {QUICK_NAV.map(({ to, icon: Icon, label, description, accent }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "group flex flex-col gap-2 rounded-xl border p-3.5 transition-all hover:shadow-md",
                accent
                  ? "border-accent/40 bg-accent/5 hover:bg-accent/10"
                  : "border-border bg-card hover:border-accent/30",
              )}
            >
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg",
                accent ? "bg-accent/15 text-accent" : "bg-secondary text-muted-foreground group-hover:text-accent",
              )}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className={cn("text-sm font-semibold leading-snug", accent && "text-accent")}>{label}</p>
                <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Continue / Start learning ── */}
      {nextModule && (
        <section>
          <Link
            to={`/modules/${nextModule.slug}`}
            className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 hover:border-accent/40 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {inProgressModules.length > 0 ? "Continue learning" : "Start here"}
                </p>
                <p className="font-semibold text-sm truncate">{nextModule.title}</p>
                <p className="text-xs text-muted-foreground truncate">{nextModule.summary}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {progress[nextModule.slug] && !isPassed(progress[nextModule.slug]) && (
                <Badge variant="outline" className="text-[10px] hidden sm:flex">
                  {progress[nextModule.slug].lastScore ?? 0}%
                </Badge>
              )}
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
            </div>
          </Link>
        </section>
      )}

      {/* ── Vocab Challenge strip ── */}
      <section>
        <Link
          to={`/vocab-challenge/${vocabCurrentDay}`}
          className="group flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 p-4 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600">
              <Flame className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-amber-600 uppercase tracking-wide font-medium">30-Day Vocab Challenge</p>
              <p className="font-semibold text-sm">
                {vocabDaysCompleted >= 30 ? "Challenge complete! 🎉" : `Day ${vocabCurrentDay} — 15 new words today`}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <Progress value={(vocabDaysCompleted / 30) * 100} className="h-1 w-24 bg-amber-200" />
                <span className="text-[10px] text-amber-600">{vocabDaysCompleted}/30 days</span>
              </div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-amber-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </section>

      {/* ── Course modules — simple list ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold">Course Modules</h2>
          <Link to="/groups" className="text-xs text-accent hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {MASTER_GROUPS.map((mg) => {
            const stats = masterStats(mg.slug);
            const pct = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;
            const started = stats.passed > 0;

            return (
              <Link
                key={mg.slug}
                to={`/groups?master=${mg.slug}`}
                className="group flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors first:rounded-t-xl last:rounded-b-xl"
              >
                {/* Icon */}
                <span className="text-xl leading-none w-7 shrink-0 text-center">{mg.icon}</span>

                {/* Title + level */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{mg.title}</p>
                    {stats.complete && <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" />}
                  </div>
                  {/* Progress bar — only if started */}
                  {started ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={pct} className="h-1 flex-1 max-w-[120px]" />
                      <span className="text-[10px] text-muted-foreground">{stats.passed}/{stats.total}</span>
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{stats.total} lessons · {mg.level}</p>
                  )}
                </div>

                {/* Status badge */}
                <div className="shrink-0 flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-medium",
                    stats.complete
                      ? "bg-accent/15 text-accent"
                      : started
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                        : "bg-secondary text-muted-foreground",
                  )}>
                    {stats.complete ? "Done" : started ? `${pct}%` : "Start"}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

    </div>
  );
}
