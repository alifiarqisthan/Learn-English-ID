import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, BookOpen, Check, ChevronLeft,
  Flame, RotateCcw, Trophy, Volume2, Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────
type Rarity = "common" | "rare" | "very_rare";

type VocabWord = {
  id: string;
  word: string;
  pronunciation: string;
  partOfSpeech: string;
  rarity: Rarity;
  definition: string;
  indonesian: string;
  explanation: string;
  example: string;
  exampleTranslation: string;
  memoryTip: string;
};

type VocabDay = {
  day: number;
  theme: string;
  words: VocabWord[];
};

type VocabData = {
  title: string;
  description: string;
  days: VocabDay[];
};

// ── localStorage helpers ──────────────────────────────────────────────────────
const STORAGE_KEY = "vocab_challenge_progress";

function loadProgress(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveProgress(progress: Record<string, string[]>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

// ── Rarity config ─────────────────────────────────────────────────────────────
const RARITY_CONFIG: Record<Rarity, { labelId: string; range: string; color: string; bg: string; border: string }> = {
  common: {
    labelId: "Umum",
    range: "1–5",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  rare: {
    labelId: "Jarang",
    range: "6–10",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  very_rare: {
    labelId: "Sangat Jarang",
    range: "11–15",
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
  },
};

// ── Word card component ───────────────────────────────────────────────────────
function WordCard({
  word, index, mastered, onToggleMastered,
}: {
  word: VocabWord;
  index: number;
  mastered: boolean;
  onToggleMastered: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const rarity = RARITY_CONFIG[word.rarity];

  function speak() {
    const utt = new SpeechSynthesisUtterance(word.word);
    utt.lang = "en-US";
    utt.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utt);
  }

  return (
    <div className={cn(
      "rounded-xl border transition-all",
      mastered ? "border-accent/40 bg-accent/5" : "border-border bg-card",
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
            {index + 1}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-serif text-xl font-semibold">{word.word}</h3>
              <button onClick={speak} title="Play pronunciation"
                className="text-muted-foreground hover:text-accent transition-colors">
                <Volume2 className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {word.pronunciation} · <span className="italic">{word.partOfSpeech}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn(
            "text-[10px] font-medium px-2 py-0.5 rounded-full border",
            rarity.color, rarity.bg, rarity.border,
          )}>
            {rarity.labelId}
          </span>
          <button
            onClick={onToggleMastered}
            title={mastered ? "Hapus dari hafal" : "Tandai hafal"}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all",
              mastered
                ? "border-accent bg-accent text-white"
                : "border-border text-muted-foreground hover:border-accent/60 hover:text-accent",
            )}
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Definition — always visible */}
      <div className="px-5 pb-3 space-y-2">
        <p className="text-sm font-medium">{word.indonesian}</p>
        <p className="text-sm text-muted-foreground">{word.definition}</p>
      </div>

      {/* Reveal button */}
      {!revealed ? (
        <div className="px-5 pb-5">
          <button
            onClick={() => setRevealed(true)}
            className="w-full rounded-lg border border-dashed border-border py-2.5 text-xs text-muted-foreground hover:border-accent/40 hover:text-accent transition-colors"
          >
            Lihat penjelasan, contoh & tips hafalan →
          </button>
        </div>
      ) : (
        <div className="border-t border-border mx-5 mb-5 pt-4 space-y-4">
          {/* Explanation */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Penjelasan</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{word.explanation}</p>
          </div>

          {/* Example */}
          <div className="rounded-lg bg-secondary/60 px-4 py-3 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contoh Kalimat</p>
            <p className="text-sm italic">"{word.example}"</p>
            <p className="text-xs text-muted-foreground">"{word.exampleTranslation}"</p>
          </div>

          {/* Memory tip */}
          <div className={cn("rounded-lg px-4 py-3", rarity.bg, rarity.border, "border")}>
            <p className={cn("text-xs font-semibold uppercase tracking-wide mb-1", rarity.color)}>
              💡 Tips Hafalan
            </p>
            <p className="text-sm">{word.memoryTip}</p>
          </div>

          <button
            onClick={() => setRevealed(false)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Sembunyikan ↑
          </button>
        </div>
      )}
    </div>
  );
}

// ── Day calendar ──────────────────────────────────────────────────────────────
function DayCalendar({
  totalDays, currentDay, progress, onSelectDay,
}: {
  totalDays: number;
  currentDay: number;
  progress: Record<string, string[]>;
  onSelectDay: (day: number) => void;
}) {
  return (
    <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5">
      {Array.from({ length: totalDays }, (_, i) => {
        const day = i + 1;
        const key = String(day);
        const masteredCount = progress[key]?.length ?? 0;
        const complete = masteredCount >= 15;
        const isToday = day === currentDay;
        const isLocked = day > currentDay;

        return (
          <button
            key={day}
            onClick={() => !isLocked && onSelectDay(day)}
            disabled={isLocked}
            title={isLocked ? `Selesaikan hari ${day - 1} dulu` : `Hari ${day}`}
            className={cn(
              "relative flex flex-col items-center justify-center rounded-lg border py-1.5 text-xs font-medium transition-all",
              complete && "border-accent bg-accent/15 text-accent",
              isToday && !complete && "border-accent border-2 text-accent bg-accent/5",
              !complete && !isToday && !isLocked && "border-border text-muted-foreground hover:border-accent/40",
              isLocked && "border-dashed border-border/50 text-muted-foreground/30 cursor-not-allowed",
            )}
          >
            <span>{day}</span>
            {complete && (
              <span className="text-[8px] text-accent">✓</span>
            )}
            {!complete && masteredCount > 0 && !isLocked && (
              <span className="text-[8px] text-muted-foreground">{masteredCount}/10</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function VocabChallengePage() {
  const { day: dayParam } = useParams<{ day?: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<VocabData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, string[]>>(loadProgress);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Load vocab data from API
  useEffect(() => {
    fetch("/api/vocab-challenge")
      .then((r) => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then((d: VocabData) => { setData(d); setLoading(false); })
      .catch((e) => { setError(String(e)); setLoading(false); });
  }, []);

  // Determine which day to show
  const wordsPerDay = 15;
  const totalWords = 30 * wordsPerDay;
  const completedDays = Object.keys(progress).filter((d) => (progress[d]?.length ?? 0) >= wordsPerDay).length;
  const currentDay = Math.min(30, completedDays + 1);

  useEffect(() => {
    if (dayParam) {
      const n = parseInt(dayParam, 10);
      if (!isNaN(n) && n >= 1 && n <= 30) setSelectedDay(n);
    } else {
      setSelectedDay(currentDay);
    }
  }, [dayParam, currentDay]);

  const activeDay = selectedDay ?? currentDay;
  const dayData = data?.days.find((d) => d.day === activeDay) ?? null;
  const dayKey = String(activeDay);
  const masteredIds = progress[dayKey] ?? [];
  const masteredCount = masteredIds.length;
  const dayComplete = masteredCount >= wordsPerDay;

  const toggleMastered = useCallback((wordId: string) => {
    setProgress((prev) => {
      const current = prev[dayKey] ?? [];
      const next = current.includes(wordId)
        ? current.filter((id) => id !== wordId)
        : [...current, wordId];
      const updated = { ...prev, [dayKey]: next };
      saveProgress(updated);
      return updated;
    });
  }, [dayKey]);

  function resetDay() {
    setProgress((prev) => {
      const updated = { ...prev, [dayKey]: [] };
      saveProgress(updated);
      return updated;
    });
  }

  function goToDay(day: number) {
    if (day < 1 || day > 30) return;
    navigate(`/vocab-challenge/${day}`);
  }

  const totalMastered = Object.values(progress).reduce((s, arr) => s + (arr?.length ?? 0), 0);
  const overallPct = Math.round((totalMastered / totalWords) * 100);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <p className="text-muted-foreground">Memuat data vocab…</p>
    </div>
  );
  if (error) return (
    <div className="space-y-3 py-12">
      <p className="text-destructive font-medium">Gagal memuat data vocab</p>
      <p className="text-sm text-muted-foreground">{error}</p>
      <p className="text-sm text-muted-foreground">Pastikan API server sudah berjalan (<code>/api/vocab-challenge</code>).</p>
    </div>
  );
  if (!data) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="-ml-3">
            <Link to="/references">
              <ChevronLeft className="h-4 w-4" /> Referensi
            </Link>
          </Button>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-accent" />
              <Badge variant="accent" className="rounded">30-Day Vocab Challenge</Badge>
              {completedDays >= 30 && <Trophy className="h-5 w-5 text-amber-500" />}
            </div>
            <h1 className="font-serif text-3xl font-semibold">{data.title}</h1>
            <p className="text-sm text-muted-foreground max-w-xl">{data.description}</p>
          </div>
        </div>

        {/* Overall progress */}
        <div className="max-w-md space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-accent" />
              Progress keseluruhan
            </span>
            <span>{totalMastered}/300 kata · {completedDays}/30 hari</span>
          </div>
          <Progress value={overallPct} className="h-2" />
        </div>
      </section>

      {/* Calendar */}
      <section className="space-y-3">
        <h2 className="font-serif text-lg font-semibold">Pilih Hari</h2>
        <DayCalendar
          totalDays={30}
          currentDay={currentDay}
          progress={progress}
          onSelectDay={goToDay}
        />
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border-2 border-accent bg-accent/15 inline-block" /> Selesai
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border-2 border-accent bg-accent/5 inline-block" /> Hari ini
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border border-border/50 border-dashed inline-block" /> Terkunci
          </span>
        </div>
      </section>

      {/* Day content */}
      {dayData && (
        <section className="space-y-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-0.5">
              <div className="flex items-center gap-3">
                <h2 className="font-serif text-2xl font-semibold">
                  Hari {dayData.day}
                  {dayComplete && <span className="ml-2 text-accent text-xl">✓</span>}
                </h2>
                <span className="text-sm text-muted-foreground">·</span>
                <span className="text-sm text-muted-foreground">{dayData.theme}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {masteredCount}/10 kata ditandai hafal
              </p>
            </div>
            <div className="flex items-center gap-2">
              {masteredCount > 0 && (
                <Button variant="ghost" size="sm" onClick={resetDay} className="gap-1.5 text-muted-foreground">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => goToDay(activeDay - 1)} disabled={activeDay <= 1} className="gap-1">
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => goToDay(activeDay + 1)} disabled={activeDay >= currentDay} className="gap-1">
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Day progress bar */}
          <div className="space-y-1">
            <Progress value={(masteredCount / 10) * 100} className="h-1.5" />
          </div>

          {/* Rarity legend */}
          <div className="flex flex-wrap gap-3 text-xs">
            {(Object.entries(RARITY_CONFIG) as [Rarity, typeof RARITY_CONFIG[Rarity]][]).map(([key, cfg]) => (
              <span key={key} className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full border", cfg.bg, cfg.border, cfg.color)}>
                <span className="font-medium">{cfg.labelId}</span>
                <span className="text-muted-foreground">({cfg.range})</span>
              </span>
            ))}
          </div>

          {/* Word cards */}
          <div className="space-y-4">
            {dayData.words.map((word, i) => (
              <WordCard
                key={word.id}
                word={word}
                index={i}
                mastered={masteredIds.includes(word.id)}
                onToggleMastered={() => toggleMastered(word.id)}
              />
            ))}
          </div>

          {/* Day complete banner */}
          {dayComplete && (
            <Card className="border-accent/40 bg-accent/5">
              <CardContent className="pt-5 pb-5 text-center space-y-3">
                <p className="text-2xl">🎉</p>
                <p className="font-serif text-lg font-semibold">Hari {dayData.day} selesai!</p>
                <p className="text-sm text-muted-foreground">
                  Kamu telah menghafal 10 kata hari ini. Terus konsisten!
                </p>
                {activeDay < 30 && activeDay < currentDay + 1 && (
                  <Button onClick={() => goToDay(activeDay + 1)} className="gap-2">
                    Lanjut Hari {activeDay + 1} <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
                {activeDay >= 30 && completedDays >= 30 && (
                  <div className="space-y-2">
                    <Trophy className="h-8 w-8 text-amber-500 mx-auto" />
                    <p className="font-semibold">Challenge selesai! 300 kata dikuasai.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation bottom */}
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => goToDay(activeDay - 1)} disabled={activeDay <= 1}>
              <ArrowLeft className="h-4 w-4" /> Hari Sebelumnya
            </Button>
            {activeDay < currentDay && (
              <Button onClick={() => goToDay(activeDay + 1)}>
                Hari Berikutnya <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
