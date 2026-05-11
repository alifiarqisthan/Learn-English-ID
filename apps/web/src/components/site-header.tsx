import { BookOpen } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

const tabs = [
  { to: "/", label: "Modules", end: true },
  { to: "/references", label: "References" },
  { to: "/practice", label: "Practice" },
  { to: "/progress", label: "Progress" },
  { to: "/mock-test", label: "Mock Test" },
];

export function SiteHeader() {
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-16 items-center gap-4">
        <Link to="/" className="flex items-center gap-2 font-serif">
          <BookOpen className="h-5 w-5 text-accent" />
          <span className="text-lg font-semibold">LearnEnglishID</span>
        </Link>

        <nav
          className="ml-auto flex items-center gap-1 overflow-x-auto"
          aria-label="Primary"
        >
          {tabs.map((t) => {
            const active = t.end
              ? pathname === t.to
              : pathname.startsWith(t.to);
            return (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
                  "hover:bg-secondary",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {t.label}
              </NavLink>
            );
          })}
        </nav>

        <ThemeToggle />
      </div>
    </header>
  );
}
