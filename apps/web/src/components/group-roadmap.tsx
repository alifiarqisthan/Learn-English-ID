import { Link } from "react-router-dom";
import {
  Check,
  Circle,
  Lock,
  AlertCircle,
  Trophy,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import {
  PASS_THRESHOLD,
  type ModuleGroupSummary,
  type ModuleSummary,
} from "@app/shared";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type ProgressMap = Record<
  string,
  { completedAt: string | null; lastScore: number | null }
>;

type Status = "passed" | "current" | "attempted" | "locked";

function isPassed(p?: { completedAt: string | null; lastScore: number | null }) {
  if (!p) return false;
  return p.completedAt != null && (p.lastScore ?? 0) >= PASS_THRESHOLD;
}

function groupTestSlug(groupSlug: string) {
  return `group-test:${groupSlug}`;
}

export function isGroupComplete(
  group: { slug: string; modules: ModuleSummary[] },
  progress: ProgressMap,
) {
  const allMembersPassed = group.modules.every((m) => isPassed(progress[m.slug]));
  const testPassed = isPassed(progress[groupTestSlug(group.slug)]);
  return allMembersPassed && testPassed;
}

type GroupContext = {
  /** True when every previous group is fully complete (modules + test passed) */
  groupUnlocked: boolean;
  hasTest: boolean;
};

export function GroupRoadmap({
  group,
  modules,
  progress,
  context,
}: {
  group: ModuleGroupSummary;
  modules: ModuleSummary[];
  progress: ProgressMap;
  context: GroupContext;
}) {
  // Status for each member module
  const moduleStatuses: Status[] = modules.map((m, i) => {
    if (!context.groupUnlocked) return "locked";
    const p = progress[m.slug];
    if (isPassed(p)) return "passed";

    const allPriorPassed = modules
      .slice(0, i)
      .every((prev) => isPassed(progress[prev.slug]));
    if (!allPriorPassed) return "locked";

    if (p && p.lastScore != null) return "attempted";
    return "current";
  });

  const allMembersPassed = modules.every(
    (m) => isPassed(progress[m.slug]),
  );
  const testProgress = progress[groupTestSlug(group.slug)];
  const testStatus: Status = !context.groupUnlocked
    ? "locked"
    : !context.hasTest || !allMembersPassed
      ? "locked"
      : isPassed(testProgress)
        ? "passed"
        : testProgress?.lastScore != null
          ? "attempted"
          : "current";

  return (
    <div className="relative">
      <ol className="flex flex-col gap-4 md:flex-row md:flex-wrap md:gap-x-2 md:gap-y-8">
        {modules.map((mod, i) => (
          <li
            key={mod.slug}
            className="relative flex md:flex-1 md:min-w-[200px] md:flex-col md:items-center"
          >
            <Connector
              passed={moduleStatuses[i] === "passed"}
            />
            <ModuleNode
              mod={mod}
              status={moduleStatuses[i] ?? "locked"}
              index={i}
              lastScore={progress[mod.slug]?.lastScore ?? null}
            />
          </li>
        ))}

        {/* Group Summary card */}
        <li className="relative flex md:flex-1 md:min-w-[200px] md:flex-col md:items-center">
          <Connector passed={allMembersPassed && context.groupUnlocked} />
          <SummaryNode
            group={group}
            unlocked={context.groupUnlocked}
            allMembersPassed={allMembersPassed}
          />
        </li>

        {/* Group Test card */}
        <li className="relative flex md:flex-1 md:min-w-[200px] md:flex-col md:items-center">
          <TestNode
            group={group}
            status={testStatus}
            lastScore={testProgress?.lastScore ?? null}
            hasTest={context.hasTest}
            isLast
          />
        </li>
      </ol>
    </div>
  );
}

function Connector({ passed }: { passed: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute bg-border",
        "left-[19px] top-10 h-[calc(100%+1rem)] w-0.5",
        "md:left-1/2 md:top-5 md:h-0.5 md:w-full md:translate-x-[20px]",
        passed && "bg-accent",
      )}
    />
  );
}

function NodeIcon({
  status,
  Icon,
}: {
  status: Status;
  Icon: typeof Check;
}) {
  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        status === "passed" &&
          "border-accent bg-accent text-accent-foreground",
        status === "current" &&
          "border-accent bg-background text-accent ring-4 ring-accent/30",
        status === "attempted" &&
          "border-amber-500 bg-background text-amber-500 ring-4 ring-amber-500/20",
        status === "locked" && "border-border bg-secondary text-foreground",
      )}
    >
      <Icon className="h-5 w-5" />
    </div>
  );
}

function ModuleNode({
  mod,
  status,
  index,
  lastScore,
}: {
  mod: ModuleSummary;
  status: Status;
  index: number;
  lastScore: number | null;
}) {
  const Icon =
    status === "passed"
      ? Check
      : status === "locked"
        ? Lock
        : status === "attempted"
          ? AlertCircle
          : Circle;

  const card = (
    <div
      className={cn(
        "ml-4 flex-1 rounded-lg border bg-card p-4 transition-shadow md:ml-0 md:mt-3 md:w-full md:text-center",
        status !== "locked" && "hover:shadow-md",
        status === "locked" && "opacity-80",
      )}
    >
      <div className="flex items-center justify-between gap-2 md:justify-center">
        <span className="text-xs font-medium text-muted-foreground">
          Step {index + 1}
        </span>
        <Badge variant="outline" className="text-[10px]">
          {mod.level}
        </Badge>
      </div>
      <h3 className="mt-1 font-serif text-base font-semibold">{mod.title}</h3>
      {mod.placeholder && (
        <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-500">
          Coming soon
        </p>
      )}
      {!mod.placeholder && mod.summary && (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
          {mod.summary}
        </p>
      )}
      {status === "attempted" && lastScore != null && (
        <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-500">
          Last score {lastScore}% — need {PASS_THRESHOLD}%
        </p>
      )}
      {status === "passed" && lastScore != null && (
        <p className="mt-2 text-xs font-medium text-accent">
          Passed · {lastScore}%
        </p>
      )}
    </div>
  );

  const inner = (
    <div className="relative z-10 flex w-full items-start md:flex-col md:items-center">
      <NodeIcon status={status} Icon={Icon} />
      {card}
    </div>
  );

  if (status === "locked" || mod.placeholder) return inner;
  return (
    <Link
      to={`/modules/${mod.slug}`}
      className="relative z-10 flex w-full items-start md:flex-col md:items-center group"
    >
      <NodeIcon status={status} Icon={Icon} />
      {card}
    </Link>
  );
}

function SummaryNode({
  group,
  unlocked,
  allMembersPassed,
}: {
  group: ModuleGroupSummary;
  unlocked: boolean;
  allMembersPassed: boolean;
}) {
  const accessible = unlocked;
  const card = (
    <div
      className={cn(
        "ml-4 flex-1 rounded-lg border-2 border-dashed bg-card p-4 transition-shadow md:ml-0 md:mt-3 md:w-full md:text-center",
        accessible ? "hover:shadow-md border-accent/40" : "opacity-80",
      )}
    >
      <div className="flex items-center justify-between gap-2 md:justify-center">
        <span className="text-xs font-medium uppercase tracking-wide text-accent">
          Group Summary
        </span>
      </div>
      <h3 className="mt-1 font-serif text-base font-semibold">
        {group.title} Recap
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Quick summaries from all {group.moduleCount} modules in one place.
      </p>
      {!allMembersPassed && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Available anytime — pass all modules for the full effect.
        </p>
      )}
    </div>
  );

  const node = (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        accessible
          ? "border-accent bg-background text-accent"
          : "border-border bg-secondary text-foreground",
      )}
    >
      <Sparkles className="h-5 w-5" />
    </div>
  );

  const inner = (
    <div className="relative z-10 flex w-full items-start md:flex-col md:items-center">
      {node}
      {card}
    </div>
  );

  if (!accessible) return inner;
  return (
    <Link
      to={`/groups/${group.slug}`}
      className="relative z-10 flex w-full items-start md:flex-col md:items-center"
    >
      {node}
      {card}
    </Link>
  );
}

function TestNode({
  group,
  status,
  lastScore,
  hasTest,
  isLast,
}: {
  group: ModuleGroupSummary;
  status: Status;
  lastScore: number | null;
  hasTest: boolean;
  isLast?: boolean;
}) {
  const Icon =
    status === "passed"
      ? Trophy
      : status === "locked"
        ? Lock
        : status === "attempted"
          ? AlertCircle
          : hasTest
            ? Circle
            : HelpCircle;

  const card = (
    <div
      className={cn(
        "ml-4 flex-1 rounded-lg border-2 bg-card p-4 transition-shadow md:ml-0 md:mt-3 md:w-full md:text-center",
        status === "locked" && "opacity-80 border-border",
        status !== "locked" && "border-accent/50 hover:shadow-md",
      )}
    >
      <div className="flex items-center justify-between gap-2 md:justify-center">
        <span className="text-xs font-medium uppercase tracking-wide text-accent">
          Group Test
        </span>
      </div>
      <h3 className="mt-1 font-serif text-base font-semibold">
        {group.title} Test
      </h3>
      {!hasTest ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Test questions coming soon.
        </p>
      ) : status === "locked" ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Pass all {group.moduleCount} modules to unlock.
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          Mixed-tense contrast questions to lock everything in.
        </p>
      )}
      {status === "attempted" && lastScore != null && (
        <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-500">
          Last score {lastScore}% — need {PASS_THRESHOLD}%
        </p>
      )}
      {status === "passed" && lastScore != null && (
        <p className="mt-2 text-xs font-medium text-accent">
          Passed · {lastScore}%
        </p>
      )}
    </div>
  );

  const node = <NodeIcon status={status} Icon={Icon} />;

  const inner = (
    <div className="relative z-10 flex w-full items-start md:flex-col md:items-center">
      {node}
      {card}
    </div>
  );

  if (status === "locked" || !hasTest) return inner;
  return (
    <Link
      to={`/groups/${group.slug}/test`}
      className="relative z-10 flex w-full items-start md:flex-col md:items-center"
    >
      {node}
      {card}
    </Link>
  );
}
