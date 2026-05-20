import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";

const NAV_LINKS = [
  { label: "Modules", to: "/groups" },
  { label: "References", to: "/references" },
  { label: "Vocab Challenge", to: "/vocab-challenge" },
  { label: "Practice", to: "/practice" },
  { label: "Mock Test", to: "/mock-test" },
  { label: "Progress", to: "/progress" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background mt-16">
      <div className="container py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        {/* Brand */}
        <div className="space-y-1.5">
          <Link to="/" className="flex items-center gap-2 font-serif">
            <BookOpen className="h-4 w-4 text-accent" />
            <span className="font-semibold text-sm">LearnEnglishID</span>
          </Link>
          <p className="text-xs text-muted-foreground max-w-xs">
            Structured TOEFL & IELTS grammar prep for Indonesian learners.
          </p>
        </div>

        {/* Links */}
        <nav className="flex flex-wrap gap-x-5 gap-y-1.5">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="container py-3 flex items-center justify-between gap-4">
          <p className="text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} LearnEnglishID. For educational use.
          </p>
          <p className="text-[11px] text-muted-foreground">
            TOEFL® & IELTS® are registered trademarks of their respective owners.
          </p>
        </div>
      </div>
    </footer>
  );
}
