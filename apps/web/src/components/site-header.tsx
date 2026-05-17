import { BookOpen, LogOut } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";

const tabs = [
  { to: "/", label: "Home", end: true },
  { to: "/groups", label: "Modules", end: true },
  { to: "/references", label: "References" },
  { to: "/practice", label: "Practice" },
  { to: "/progress", label: "Progress" },
  { to: "/mock-test", label: "Mock Test" },
];

export function SiteHeader() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-16 items-center gap-4">
        <Link to="/" className="flex items-center gap-2 font-serif shrink-0">
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

        <div className="flex items-center gap-2 shrink-0">
          {user && (
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1">
              <div className="h-5 w-5 rounded-full bg-accent flex items-center justify-center text-accent-foreground text-[10px] font-bold shrink-0">
                {user.name[0].toUpperCase()}
              </div>
              <span className="text-xs font-medium text-foreground">
                {user.name}
              </span>
              <button
                onClick={logout}
                title="Sign out"
                className="text-muted-foreground hover:text-foreground transition-colors ml-0.5"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
