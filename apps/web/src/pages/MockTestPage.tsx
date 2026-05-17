import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, BookOpen, ChevronLeft,
  Clock, Headphones, Mic, Pause, Flag,
  Play, RotateCcw, Volume2, VolumeX, PenLine,
} from "lucide-react";
import { api, type MockTestPackage, type IbtPackage, type ItpPackage, type MockQuestion, type ItpShortItem, type ItpLongItem, type ItpStructureItem, type ItpErrorItem } from "../api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────
type Section = "reading" | "listening" | "speaking" | "writing";
type Phase = "lobby" | "section" | "review" | "done";

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function getEnglishVoices(): SpeechSynthesisVoice[] {
  const voices = window.speechSynthesis.getVoices();
  const usLocal = voices.filter((v) => v.lang === "en-US" && v.localService);
  const us = voices.filter((v) => v.lang === "en-US" && !v.localService);
  const other = voices.filter((v) => v.lang.startsWith("en") && v.lang !== "en-US");
  return [...usLocal, ...us, ...other];
}

// Ensure voices are loaded before playing (Chrome loads them async)
function withVoices(cb: () => void) {
  if (window.speechSynthesis.getVoices().length > 0) { cb(); return; }
  window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.onvoiceschanged = null; cb(); };
  // Fallback if event never fires (some browsers)
  setTimeout(cb, 500);
}

function getAmericanVoice(): SpeechSynthesisVoice | null {
  return getEnglishVoices()[0] ?? null;
}

// Parse a script into speaker turns: [{ speaker: "Student", text: "..." }, ...]
// Lines without a "Speaker: " prefix are treated as continuing the previous speaker (narrator/professor).
function parseScript(script: string): { speaker: string; text: string }[] {
  const lines = script.split("\n").map((l) => l.trim()).filter(Boolean);
  const turns: { speaker: string; text: string }[] = [];
  let currentSpeaker = "Narrator";
  let currentText: string[] = [];

  for (const line of lines) {
    const match = line.match(/^([A-Za-z][A-Za-z\s]{0,20}):\s*(.+)$/);
    if (match) {
      if (currentText.length > 0) {
        turns.push({ speaker: currentSpeaker, text: currentText.join(" ") });
        currentText = [];
      }
      currentSpeaker = match[1].trim();
      currentText = [match[2].trim()];
    } else {
      currentText.push(line);
    }
  }
  if (currentText.length > 0) {
    turns.push({ speaker: currentSpeaker, text: currentText.join(" ") });
  }
  return turns;
}

// Assign a distinct voice to each unique speaker in the script.
// Speaker 0 gets a female voice, speaker 1 gets a male-ish voice (higher index), etc.
function assignVoices(speakers: string[]): Map<string, SpeechSynthesisVoice | null> {
  const voices = getEnglishVoices();
  const map = new Map<string, SpeechSynthesisVoice | null>();
  speakers.forEach((spk, i) => {
    map.set(spk, voices[i % Math.max(voices.length, 1)] ?? null);
  });
  return map;
}

// Play a parsed script with per-speaker voices.
// Returns a stop() function — call it to abort the chain immediately.
function playParsedScript(
  turns: { speaker: string; text: string }[],
  voiceMap: Map<string, SpeechSynthesisVoice | null>,
  onEnd: () => void,
  onStart?: () => void,
): () => void {
  window.speechSynthesis.cancel();
  let aborted = false;

  const stop = () => {
    aborted = true;
    window.speechSynthesis.cancel();
  };

  if (turns.length === 0) { onEnd(); return stop; }

  let idx = 0;

  function speakNext() {
    if (aborted) return;          // chain aborted — do not continue
    if (idx >= turns.length) { onEnd(); return; }
    const { speaker, text } = turns[idx++];
    const utt = new SpeechSynthesisUtterance(text);
    const voice = voiceMap.get(speaker) ?? null;
    if (voice) utt.voice = voice;
    utt.lang = "en-US";
    const speakerIdx = [...voiceMap.keys()].indexOf(speaker);
    utt.rate = speakerIdx % 2 === 0 ? 0.90 : 0.95;
    utt.pitch = speakerIdx % 2 === 0 ? 1.0 : 0.85;
    utt.onstart = idx === 1 ? onStart ?? null : null;
    utt.onend = () => { if (!aborted) speakNext(); };
    utt.onerror = () => { if (!aborted) speakNext(); };
    window.speechSynthesis.speak(utt);
  }

  speakNext();
  return stop;
}

// ── Timer hook ───────────────────────────────────────────────────────────────
function useTimer(initial: number, onExpire: () => void) {
  const [remaining, setRemaining] = useState(initial);
  const [running, setRunning] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) { clearInterval(ref.current!); onExpire(); return 0; }
          return r - 1;
        });
      }, 1000);
    } else {
      if (ref.current) clearInterval(ref.current);
    }
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running, onExpire]);

  return { remaining, running, start: () => setRunning(true), pause: () => setRunning(false), reset: () => setRemaining(initial) };
}

// ── Package lobby ─────────────────────────────────────────────────────────────
type PackageMeta = { id: string; title: string; format?: string | null };

type ExamSection = {
  key: string;
  label: string;
  badge: string;
  description: string;
  sections: { icon: typeof BookOpen; label: string; detail: string }[];
  scoringNote: string;
  comingSoon?: boolean;
};

const EXAM_SECTIONS: ExamSection[] = [
  {
    key: "ibt",
    label: "TOEFL iBT",
    badge: "TOEFL iBT",
    description: "Full TOEFL iBT practice — Reading, Listening, Speaking, and Writing sections with a timer. Listening passages are read aloud by your browser.",
    sections: [
      { icon: BookOpen, label: "Reading", detail: "2 passages · 20 questions · 35 min · scored 0–30" },
      { icon: Headphones, label: "Listening", detail: "3 lectures + 2 conversations · 28 questions · 36 min · scored 0–30" },
      { icon: Mic, label: "Speaking", detail: "4 tasks (1 independent + 3 integrated) · 16 min · simulated 0–30" },
      { icon: PenLine, label: "Writing", detail: "2 tasks (integrated + discussion) · 29 min · simulated 0–30" },
    ],
    scoringNote: "Reading & Listening are auto-scored (0–30 each). Speaking & Writing are estimated from MCQ performance. Total max: 120.",
  },
  {
    key: "itp",
    label: "TOEFL ITP",
    badge: "TOEFL ITP",
    description: "TOEFL ITP paper-based practice — Listening Comprehension, Structure & Written Expression, and Reading Comprehension. No Speaking or Writing.",
    sections: [
      { icon: Headphones, label: "Listening", detail: "3 parts · 50 questions · 35 min · scaled 31–68" },
      { icon: BookOpen, label: "Structure", detail: "2 parts · 40 questions · 25 min · scaled 31–68" },
      { icon: BookOpen, label: "Reading", detail: "5 passages · 50 questions · 55 min · scaled 31–67" },
    ],
    scoringNote: "All 3 sections are auto-scored. ITP total score = 200–677. Each section is scaled separately.",
  },
  {
    key: "ielts",
    label: "IELTS",
    badge: "IELTS",
    description: "IELTS Academic practice — Listening, Reading, Writing, and Speaking. Coming soon.",
    sections: [
      { icon: Headphones, label: "Listening", detail: "4 sections · 40 questions · 30 min · scored 0–9" },
      { icon: BookOpen, label: "Reading", detail: "3 passages · 40 questions · 60 min · scored 0–9" },
      { icon: PenLine, label: "Writing", detail: "2 tasks · 60 min · scored 0–9" },
      { icon: Mic, label: "Speaking", detail: "3 parts · 11–14 min · scored 0–9" },
    ],
    scoringNote: "Band score 0–9 per section. Overall = average of 4 sections.",
    comingSoon: true,
  },
];

function PackageLobby({ onStart }: { onStart: (pkg: MockTestPackage) => void }) {
  const [packages, setPackages] = useState<PackageMeta[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("ibt");

  useEffect(() => { api.listMockTests().then(setPackages).catch(() => setPackages([])); }, []);

  async function load(id: string) {
    setLoading(true);
    try { onStart(await api.getMockTest(id)); }
    finally { setLoading(false); }
  }

  function getFormatKey(pkg: PackageMeta): string {
    if (pkg.format === "itp") return "itp";
    if (pkg.format === "ielts") return "ielts";
    return "ibt";
  }

  const activeExam = EXAM_SECTIONS.find((e) => e.key === activeTab)!;
  const filteredPackages = packages?.filter((p) => getFormatKey(p) === activeTab) ?? [];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Badge variant="accent" className="rounded">Mock Test</Badge>
        <h1 className="font-serif text-4xl font-semibold">Practice Tests</h1>
        <p className="max-w-2xl text-muted-foreground">
          Full-length practice exams with timed sections. Choose your exam format below.
        </p>
      </div>

      {/* Exam type tabs */}
      <div className="flex gap-2 border-b border-border pb-px">
        {EXAM_SECTIONS.map((exam) => (
          <button
            key={exam.key}
            onClick={() => setActiveTab(exam.key)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === exam.key
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground",
              exam.comingSoon && "opacity-60",
            )}
          >
            {exam.label}
            {exam.comingSoon && (
              <span className="ml-1.5 text-[10px] bg-secondary text-muted-foreground rounded px-1 py-0.5">Soon</span>
            )}
          </button>
        ))}
      </div>

      {/* Active exam info */}
      <div className="space-y-6">
        <div className="space-y-1">
          <Badge variant="outline" className="rounded text-xs">{activeExam.badge}</Badge>
          <p className="max-w-2xl text-muted-foreground text-sm mt-1">{activeExam.description}</p>
        </div>

        {/* Section overview cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {activeExam.sections.map(({ icon: Icon, label, detail }) => (
            <Card key={label}>
              <CardContent className="flex flex-col gap-2 pt-5">
                <Icon className="h-5 w-5 text-accent" />
                <p className="font-semibold">{label}</p>
                <p className="text-xs text-muted-foreground">{detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Package selection */}
        {activeExam.comingSoon ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
            <p className="text-sm font-medium">IELTS practice packages coming soon.</p>
            <p className="text-xs mt-1">Check back after TOEFL packages are complete.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="font-serif text-xl font-semibold">Choose a Practice Package</h2>
            {!packages ? (
              <p className="text-muted-foreground">Loading packages…</p>
            ) : filteredPackages.length === 0 ? (
              <p className="text-muted-foreground">No packages available yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {filteredPackages.map((pkg, i) => (
                  <button
                    key={pkg.id}
                    onClick={() => load(pkg.id)}
                    disabled={loading}
                    className="text-left rounded-lg border bg-card p-5 hover:shadow-md hover:border-accent/50 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-serif font-semibold text-lg">Package {i + 1}</p>
                      <Badge variant="outline" className="text-[10px]">{activeExam.badge}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{pkg.title}</p>
                    <p className="text-xs text-accent mt-3 group-hover:underline">
                      {loading ? "Loading…" : "Start test →"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Scoring info */}
        <Card className="bg-secondary/40 border-dashed">
          <CardContent className="pt-5 space-y-1 text-xs text-muted-foreground">
            <p className="font-medium text-foreground text-sm">Scoring</p>
            <p>{activeExam.scoringNote}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Section nav bar ───────────────────────────────────────────────────────────
const SECTIONS: { key: Section; label: string; icon: typeof BookOpen }[] = [
  { key: "reading", label: "Reading", icon: BookOpen },
  { key: "listening", label: "Listening", icon: Headphones },
  { key: "speaking", label: "Speaking", icon: Mic },
  { key: "writing", label: "Writing", icon: PenLine },
];

// ── MCQ component ─────────────────────────────────────────────────────────────
function McqQuestion({
  q, index, answer, onAnswer, showExplanation,
}: {
  q: MockQuestion; index: number; answer: string | null;
  onAnswer: (a: string) => void; showExplanation: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="font-medium text-sm">
        <span className="text-muted-foreground mr-1">{index + 1}.</span>
        {q.question}
      </p>
      <div className="space-y-2">
        {q.options.map((opt) => {
          const letter = opt[0];
          const isSelected = answer === letter;
          const isCorrect = showExplanation && letter === q.answer;
          const isWrong = showExplanation && isSelected && letter !== q.answer;
          return (
            <button
              key={letter}
              onClick={() => !showExplanation && onAnswer(letter)}
              className={cn(
                "w-full text-left rounded-md border px-4 py-2.5 text-sm transition-colors",
                !showExplanation && "hover:border-accent/60 hover:bg-accent/5",
                isSelected && !showExplanation && "border-accent bg-accent/10",
                isCorrect && "border-accent bg-accent/15 font-medium",
                isWrong && "border-destructive bg-destructive/10",
                !isSelected && !isCorrect && showExplanation && "opacity-60",
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {showExplanation && (
        <div className={cn(
          "rounded-md px-3 py-2 text-xs",
          answer === q.answer ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
        )}>
          {answer === q.answer ? "✓ Correct — " : `✗ Correct answer: ${q.answer} — `}
          {q.explanation}
        </div>
      )}
    </div>
  );
}

// ── Reading section ───────────────────────────────────────────────────────────
function ReadingSection({
  pkg, answers, onAnswer, onComplete, timerRemaining,
}: {
  pkg: IbtPackage; answers: Record<string, string>;
  onAnswer: (id: string, a: string) => void; onComplete: () => void;
  timerRemaining: number;
}) {
  const [passageIdx, setPassageIdx] = useState(0);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string>(pkg.reading.passages[0].questions[0].id);
  const [showConfirm, setShowConfirm] = useState(false);
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const passage = pkg.reading.passages[passageIdx];
  const total = pkg.reading.passages.reduce((s, p) => s + p.questions.length, 0);
  const answered = Object.keys(answers).filter((k) =>
    pkg.reading.passages.some((p) => p.questions.some((q) => q.id === k))
  ).length;
  const unanswered = total - answered;

  useEffect(() => {
    setFocusedId(passage.questions[0]?.id ?? "");
  }, [passageIdx]);

  function toggleFlag(id: string) {
    setFlagged((prev) => { const next = new Set(prev); prev.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  function jumpToQuestion(id: string) {
    setFocusedId(id);
    questionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const passageIds = passage.questions.map((q) => q.id);

  return (
    <div className="space-y-5">
      <ConfirmDialog
        open={showConfirm}
        title="Finish Reading section?"
        description="You are about to move on to Listening. You cannot return to Reading."
        warning={unanswered > 0 ? `${unanswered} question${unanswered > 1 ? "s" : ""} left unanswered.` : undefined}
        confirmLabel="Finish Reading"
        cancelLabel="Go back"
        onConfirm={() => { setShowConfirm(false); onComplete(); }}
        onCancel={() => setShowConfirm(false)}
      />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Badge variant="outline">Reading</Badge>
          <span className="text-sm text-muted-foreground">{answered}/{total} answered</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className={cn("font-mono text-sm font-medium", timerRemaining < 300 && "text-destructive")}>
            {formatTime(timerRemaining)}
          </span>
        </div>
      </div>

      {/* Passage tabs */}
      <div className="flex gap-2">
        {pkg.reading.passages.map((p, i) => (
          <button key={p.id} onClick={() => setPassageIdx(i)}
            className={cn("px-3 py-1.5 rounded-md text-sm border transition-colors",
              passageIdx === i ? "border-accent bg-accent/10 text-accent font-medium" : "border-border text-muted-foreground hover:border-accent/40"
            )}>
            Passage {i + 1}
          </button>
        ))}
      </div>

      {/* Question palette */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground">{passage.title}</p>
        <QuestionPalette ids={passageIds} answers={answers} flagged={flagged} current={focusedId} onJump={jumpToQuestion} />
        <PaletteLegend />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-5 max-h-[65vh] overflow-y-auto">
          <h2 className="font-serif text-xl font-semibold mb-4">{passage.title}</h2>
          <p className="text-sm leading-relaxed whitespace-pre-line">{passage.text}</p>
        </div>

        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          {passage.questions.map((q, i) => {
            const isFlagged = flagged.has(q.id);
            return (
              <div
                key={q.id}
                ref={(el) => { questionRefs.current[q.id] = el; }}
                onClick={() => setFocusedId(q.id)}
                className={cn(
                  "rounded-lg border p-3 transition-colors",
                  focusedId === q.id ? "border-accent/40 bg-accent/5" : "border-transparent",
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Q{i + 1}{isFlagged && <span className="ml-1.5 text-amber-600">· Not sure</span>}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFlag(q.id); }}
                    className={cn(
                      "flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border transition-colors",
                      isFlagged
                        ? "bg-amber-100 border-amber-400 text-amber-700"
                        : "border-border text-muted-foreground hover:border-amber-400 hover:text-amber-600",
                    )}
                  >
                    <Flag className="h-2.5 w-2.5" />
                    {isFlagged ? "Unflag" : "Not sure"}
                  </button>
                </div>
                <McqQuestion q={q} index={i}
                  answer={answers[q.id] ?? null}
                  onAnswer={(a) => { onAnswer(q.id, a); setFocusedId(q.id); }}
                  showExplanation={false} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setPassageIdx(Math.max(0, passageIdx - 1))} disabled={passageIdx === 0}>
          <ArrowLeft className="h-4 w-4" /> Previous
        </Button>
        {passageIdx < pkg.reading.passages.length - 1 ? (
          <Button onClick={() => setPassageIdx(passageIdx + 1)}>
            Next Passage <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={() => setShowConfirm(true)}>
            Finish Reading <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Estimate spoken duration in seconds from a script (~130 wpm at rate 0.92)
function estimateDuration(script: string): number {
  const words = script.trim().split(/\s+/).length;
  return Math.round((words / 130) * 60);
}

// ── Listening section ─────────────────────────────────────────────────────────
function ListeningSection({
  pkg, answers, onAnswer, onComplete, timerRemaining,
}: {
  pkg: IbtPackage; answers: Record<string, string>;
  onAnswer: (id: string, a: string) => void; onComplete: () => void;
  timerRemaining: number;
}) {
  const [trackIdx, setTrackIdx] = useState(0);
  const [playedTracks, setPlayedTracks] = useState<Set<number>>(new Set());
  const [speaking, setSpeaking] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopSpeechRef = useRef<(() => void) | null>(null);

  useEffect(() => () => { stopSpeechRef.current?.(); window.speechSynthesis.cancel(); }, []);

  const track = pkg.listening.tracks[trackIdx];
  const total = pkg.listening.tracks.reduce((s, t) => s + t.questions.length, 0);
  const answered = Object.keys(answers).filter((k) =>
    pkg.listening.tracks.some((t) => t.questions.some((q) => q.id === k))
  ).length;

  function playTrack() {
    if (playedTracks.has(trackIdx)) return; // plays once only
    if (muted) {
      setPlayedTracks((p) => new Set([...p, trackIdx]));
      setShowQuestions(true);
      return;
    }
    withVoices(() => {
      const turns = parseScript(track.script);
      const uniqueSpeakers = [...new Set(turns.map((t) => t.speaker))];
      const voiceMap = assignVoices(uniqueSpeakers);
      stopSpeechRef.current = playParsedScript(turns, voiceMap,
        () => { setSpeaking(false); setPlayedTracks((p) => new Set([...p, trackIdx])); setShowQuestions(true); },
        () => setSpeaking(true),
      );
    });
  }

  useEffect(() => {
    if (speaking) {
      setElapsed(0);
      elapsedRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    }
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, [speaking]);

  // When switching tracks, stop audio and show questions only if this track was already played
  useEffect(() => {
    stopSpeechRef.current?.();
    stopSpeechRef.current = null;
    setSpeaking(false);
    setElapsed(0);
    setShowQuestions(playedTracks.has(trackIdx));
  }, [trackIdx]);

  const isLastTrack = trackIdx === (pkg as IbtPackage).listening.tracks.length - 1;

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={showConfirm}
        title="Finish Listening section?"
        description="You are about to move on to Speaking. You cannot return to Listening."
        warning={answered < total ? `${total - answered} question${total - answered > 1 ? "s" : ""} left unanswered.` : undefined}
        confirmLabel="Finish Listening"
        cancelLabel="Go back"
        onConfirm={() => { setShowConfirm(false); onComplete(); }}
        onCancel={() => setShowConfirm(false)}
      />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Badge variant="outline">Listening</Badge>
          <span className="text-sm text-muted-foreground">{answered}/{total} answered</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className={cn("font-mono text-sm font-medium", timerRemaining < 300 && "text-destructive")}>
            {formatTime(timerRemaining)}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setMuted((m) => !m)} title={muted ? "Unmute" : "Mute"}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Track tabs — can revisit played tracks, cannot skip ahead */}
      <div className="flex gap-1.5 flex-wrap">
        {pkg.listening.tracks.map((t, i) => {
          const isConversation = t.type === "conversation";
          const isDone = playedTracks.has(i);
          const isCurrent = trackIdx === i;
          const isLocked = i > trackIdx && !playedTracks.has(i);
          return (
            <button key={t.id}
              onClick={() => !isLocked ? setTrackIdx(i) : undefined}
              disabled={isLocked}
              className={cn(
                "flex flex-col items-start px-3 py-2 rounded-md text-sm border transition-colors text-left",
                isCurrent && "border-accent bg-accent/10 text-accent",
                isDone && !isCurrent && "border-border bg-secondary text-muted-foreground",
                isLocked && "border-dashed border-border text-muted-foreground/40 cursor-not-allowed",
              )}>
              <span className="font-medium text-xs">
                {isDone && !isCurrent ? "✓ " : ""}Track {i + 1} — {isConversation ? "Conversation" : "Lecture"}
              </span>
              <span className="text-[10px] opacity-70 mt-0.5">
                {isConversation ? "5 questions" : "6 questions"}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground bg-secondary rounded-md px-3 py-2">
        📝 You may take notes while listening. Audio plays once only — questions appear after it finishes.
      </p>

      {!showQuestions ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-6 py-12 text-center">
            <div className={cn("rounded-full p-6 border-2 transition-all",
              speaking ? "border-accent animate-pulse bg-accent/10" : "border-border")}>
              <Headphones className={cn("h-12 w-12", speaking ? "text-accent" : "text-muted-foreground")} />
            </div>
            <div className="space-y-1">
              <p className="font-serif text-xl font-semibold">
                {track.type === "conversation" ? "Campus Conversation" : "Academic Lecture"}
              </p>
              <p className="text-sm text-muted-foreground max-w-sm">
                {track.type === "conversation"
                  ? "Listen to a conversation between two people on a university campus."
                  : "Listen to part of a lecture in a university classroom."}
              </p>
              <p className="text-xs text-muted-foreground">
                {speaking ? "Playing… listen carefully." : "Press play when ready. Audio plays once only."}
              </p>
              {muted && !playedTracks.has(trackIdx) && (
                <p className="text-xs text-amber-600">Audio muted — click play to skip directly to questions.</p>
              )}
            </div>

            {speaking && (() => {
              const tot = estimateDuration(track.script);
              const pct = Math.min(100, Math.round((elapsed / tot) * 100));
              return (
                <div className="w-full max-w-sm space-y-1.5">
                  <Progress value={pct} className="h-1.5" />
                  <div className="flex justify-between text-xs text-muted-foreground font-mono">
                    <span>{formatTime(elapsed)}</span><span>~{formatTime(tot)}</span>
                  </div>
                </div>
              );
            })()}

            <div className="flex gap-3">
              <Button onClick={playTrack} disabled={playedTracks.has(trackIdx) || speaking} className="gap-2">
                <Play className="h-4 w-4" /> Play Audio
              </Button>
              {speaking && (
                <Button variant="outline" className="gap-2" onClick={() => {
                  stopSpeechRef.current?.();
                  stopSpeechRef.current = null;
                  setSpeaking(false);
                  setPlayedTracks((p) => new Set([...p, trackIdx]));
                  setShowQuestions(true);
                }}>
                  <Pause className="h-4 w-4" /> Skip to Questions
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Track {trackIdx + 1} — {track.type === "conversation" ? "Conversation" : "Lecture"} Questions
            </p>
            <span className="text-xs text-muted-foreground">
              {track.questions.filter((q) => answers[q.id]).length}/{track.questions.length} answered
            </span>
          </div>
          <div className="space-y-6">
            {track.questions.map((q, i) => (
              <McqQuestion key={q.id} q={q} index={i}
                answer={answers[q.id] ?? null}
                onAnswer={(a) => onAnswer(q.id, a)}
                showExplanation={false}
              />
            ))}
          </div>
        </div>
      )}

      {showQuestions && (
        <div className="flex justify-end">
          {!isLastTrack ? (
            <Button onClick={() => setTrackIdx(trackIdx + 1)}>
              Next Track <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => setShowConfirm(true)}>
              Finish Listening <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Speaking section ──────────────────────────────────────────────────────────
function SpeakingSection({ pkg, onComplete, timerRemaining }: { pkg: MockTestPackage; onComplete: () => void; timerRemaining: number }) {
  const [taskIdx, setTaskIdx] = useState(0);
  const [phase, setPhase] = useState<"intro" | "reading" | "listening" | "prep" | "speaking" | "done">("intro");
  const [notes, setNotes] = useState<Record<number, string>>({});
  const stopSpeakRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      stopSpeakRef.current?.();
      window.speechSynthesis.cancel();
    };
  }, []);

  const task = pkg.speaking.tasks[taskIdx];

  const handleExpire = useCallback(() => {
    if (phase === "prep") setPhase("speaking");
    else if (phase === "speaking") setPhase("done");
  }, [phase]);

  const timer = useTimer(
    phase === "prep" ? task.prepTime : phase === "speaking" ? task.responseTime : 0,
    handleExpire
  );

  function startTask() {
    if (task.readingText) setPhase("reading");
    else if (task.listeningScript) setPhase("listening");
    else { setPhase("prep"); timer.reset(); timer.start(); }
  }

  function speakScript() {
    stopSpeakRef.current?.();
    withVoices(() => {
      const turns = parseScript(task.listeningScript ?? "");
      const uniqueSpeakers = [...new Set(turns.map((t) => t.speaker))];
      const voiceMap = assignVoices(uniqueSpeakers);
      stopSpeakRef.current = playParsedScript(turns, voiceMap, () => {
        stopSpeakRef.current = null;
        setPhase("prep");
        timer.reset();
        timer.start();
      });
    });
  }

  function nextTask() {
    window.speechSynthesis.cancel();
    if (taskIdx < pkg.speaking.tasks.length - 1) {
      setTaskIdx(taskIdx + 1);
      setPhase("intro");
    } else {
      onComplete();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge variant="outline">Speaking</Badge>
          <span className="text-sm text-muted-foreground">Task {taskIdx + 1} of {pkg.speaking.tasks.length}</span>
        </div>
        <div className="flex items-center gap-3">
          {(phase === "prep" || phase === "speaking") && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Task</span>
              <span className={cn("font-mono text-sm font-medium", timer.remaining < 5 && "text-destructive animate-pulse")}>
                {formatTime(timer.remaining)}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className={cn("font-mono text-sm font-medium", timerRemaining < 300 && "text-destructive")}>
              {formatTime(timerRemaining)}
            </span>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">
            Task {task.number} — <span className="capitalize text-muted-foreground font-normal text-base">{task.type.replace(/-/g, " ")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {phase === "intro" && (
            <div className="space-y-4">
              {task.readingText && (
                <div className="rounded-md bg-secondary p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Reading Passage</p>
                  <p className="text-sm leading-relaxed">{task.readingText}</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                <strong>Task:</strong> {task.prompt}
              </p>
              <p className="text-xs text-muted-foreground">
                Prep time: {task.prepTime}s · Response time: {task.responseTime}s
              </p>
              <Button onClick={startTask}>
                {task.listeningScript ? "Play Audio" : "Start Preparation"}
              </Button>
            </div>
          )}

          {phase === "reading" && (
            <div className="space-y-4">
              <div className="rounded-md bg-secondary p-4">
                <p className="text-sm leading-relaxed">{task.readingText}</p>
              </div>
              <Button onClick={() => task.listeningScript ? speakScript() : (setPhase("prep"), timer.reset(), timer.start())}>
                {task.listeningScript ? "Continue to Audio" : "Begin Prep"}
              </Button>
            </div>
          )}

          {phase === "listening" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="rounded-full p-5 border-2 border-accent animate-pulse bg-accent/10">
                <Headphones className="h-10 w-10 text-accent" />
              </div>
              <p className="text-sm text-muted-foreground">Listen carefully…</p>
              <Button variant="outline" size="sm" onClick={() => { window.speechSynthesis.cancel(); setPhase("prep"); timer.reset(); timer.start(); }}>
                Skip to Prep
              </Button>
            </div>
          )}

          {phase === "prep" && (
            <div className="space-y-4">
              <div className="rounded-md bg-accent/5 border border-accent/20 p-4">
                <p className="text-sm font-medium text-accent mb-1">Preparation time — {formatTime(timer.remaining)}</p>
                <p className="text-sm">{task.prompt}</p>
              </div>
              <textarea
                placeholder="Notes (optional)…"
                value={notes[taskIdx] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [taskIdx]: e.target.value }))}
                className="w-full h-24 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
          )}

          {phase === "speaking" && (
            <div className="space-y-4">
              <div className="rounded-md bg-accent/10 border border-accent/30 p-4 flex items-center gap-3">
                <div className="rounded-full p-2 bg-accent/20 animate-pulse">
                  <Mic className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-accent">Recording time — {formatTime(timer.remaining)}</p>
                  <p className="text-xs text-muted-foreground">Speak your response clearly.</p>
                </div>
              </div>
              <p className="text-sm">{task.prompt}</p>
              {notes[taskIdx] && (
                <div className="rounded-md bg-secondary p-3 text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Your notes:</p>
                  <p className="whitespace-pre-wrap">{notes[taskIdx]}</p>
                </div>
              )}
            </div>
          )}

          {phase === "done" && (
            <div className="space-y-4">
              <div className="rounded-md bg-secondary p-4 text-center">
                <p className="text-sm font-medium">Response recorded ✓</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Speaking responses are self-evaluated. Compare with model answers in TOEFL prep guides.
                </p>
              </div>
              <Button onClick={nextTask} className="w-full">
                {taskIdx < pkg.speaking.tasks.length - 1 ? "Next Task" : "Finish Speaking"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Writing section ───────────────────────────────────────────────────────────
function WritingSection({ pkg, onComplete, timerRemaining }: { pkg: MockTestPackage; onComplete: () => void; timerRemaining: number }) {
  const [taskIdx, setTaskIdx] = useState(0);
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [audioPlayed, setAudioPlayed] = useState(false);
  const stopWriteSpeechRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      stopWriteSpeechRef.current?.();
      window.speechSynthesis.cancel();
    };
  }, []);

  const task = pkg.writing.tasks[taskIdx];
  const text = responses[taskIdx] ?? "";
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const handleExpire = useCallback(() => {
    if (taskIdx < pkg.writing.tasks.length - 1) setTaskIdx(taskIdx + 1);
    else onComplete();
  }, [taskIdx, onComplete]);

  const timer = useTimer(task.timeLimit, handleExpire);
  useEffect(() => { timer.reset(); timer.start(); setAudioPlayed(false); }, [taskIdx]);

  function playListening() {
    stopWriteSpeechRef.current?.();
    withVoices(() => {
      const turns = parseScript(task.listeningScript ?? "");
      const uniqueSpeakers = [...new Set(turns.map((t) => t.speaker))];
      const voiceMap = assignVoices(uniqueSpeakers);
      stopWriteSpeechRef.current = playParsedScript(turns, voiceMap, () => {
        stopWriteSpeechRef.current = null;
        setAudioPlayed(true);
      });
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge variant="outline">Writing</Badge>
          <span className="text-sm text-muted-foreground">Task {taskIdx + 1} of {pkg.writing.tasks.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className={cn("font-mono text-sm font-medium", timerRemaining < 300 && "text-destructive")}>
            {formatTime(timerRemaining)}
          </span>
        </div>
      </div>

      {task.type === "integrated" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            {task.readingText && (
              <div className="rounded-md border bg-card p-4 max-h-64 overflow-y-auto">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Reading Passage</p>
                <p className="text-sm leading-relaxed whitespace-pre-line">{task.readingText}</p>
              </div>
            )}
            {task.listeningScript && (
              <Button variant="outline" size="sm" className="gap-2" onClick={playListening}>
                <Headphones className="h-4 w-4" />
                {audioPlayed ? "Replay Lecture" : "Play Lecture Audio"}
              </Button>
            )}
            <div className="rounded-md bg-accent/5 border border-accent/20 p-3">
              <p className="text-xs font-medium text-accent mb-1">Writing Prompt</p>
              <p className="text-sm">{task.prompt}</p>
              {task.wordCountMin && (
                <p className="text-xs text-muted-foreground mt-1">
                  {task.wordCountMin}–{task.wordCountMax ?? "∞"} words recommended
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Your response</span>
              <span className={cn(task.wordCountMin && wordCount < task.wordCountMin ? "text-amber-600" : "text-accent")}>
                {wordCount} words
              </span>
            </div>
            <textarea
              value={text}
              onChange={(e) => setResponses((r) => ({ ...r, [taskIdx]: e.target.value }))}
              placeholder="Write your response here…"
              className="w-full h-64 lg:h-80 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Discussion Prompt</p>
            <p className="text-sm leading-relaxed">{task.professorPrompt}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-secondary p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Maya says:</p>
              <p className="text-sm">{task.student1Response}</p>
            </div>
            <div className="rounded-md bg-secondary p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Alex says:</p>
              <p className="text-sm">{task.student2Response}</p>
            </div>
          </div>
          <div className="rounded-md bg-accent/5 border border-accent/20 p-3">
            <p className="text-xs font-medium text-accent mb-1">Your Task</p>
            <p className="text-sm">{task.prompt}</p>
            {task.wordCountMin && <p className="text-xs text-muted-foreground mt-1">Minimum {task.wordCountMin} words</p>}
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Your response</span>
              <span className={cn(task.wordCountMin && wordCount < task.wordCountMin ? "text-amber-600" : "text-accent")}>
                {wordCount} words
              </span>
            </div>
            <textarea
              value={text}
              onChange={(e) => setResponses((r) => ({ ...r, [taskIdx]: e.target.value }))}
              placeholder="Write your response here…"
              className="w-full h-52 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
        </div>
      )}

      <div className="flex justify-end">
        {taskIdx < pkg.writing.tasks.length - 1 ? (
          <Button onClick={() => setTaskIdx(taskIdx + 1)}>
            Next Task <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={onComplete}>
            Finish Writing <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ── TOEFL iBT scoring (official scaled conversion) ───────────────────────────
// Reading: 20 questions → 0–30 scale
// Listening: 28 questions → 0–30 scale
// Each section max 30 points · Total TOEFL score: 0–120
function scaleReadingScore(correct: number): number {
  // Approximate official TOEFL reading scaled score table (20 raw points)
  const table: Record<number, number> = {
    20: 30, 19: 29, 18: 28, 17: 26, 16: 24, 15: 23, 14: 22, 13: 20,
    12: 19, 11: 17, 10: 15, 9: 14, 8: 12, 7: 11, 6: 10, 5: 8, 4: 6,
    3: 4, 2: 2, 1: 1, 0: 0,
  };
  return table[correct] ?? 0;
}

function scaleListeningScore(correct: number): number {
  // Approximate TOEFL listening scaled score table (28 raw points)
  if (correct >= 27) return 30;
  if (correct >= 25) return 29;
  if (correct >= 23) return 28;
  if (correct >= 21) return 26;
  if (correct >= 19) return 24;
  if (correct >= 17) return 22;
  if (correct >= 15) return 20;
  if (correct >= 13) return 18;
  if (correct >= 11) return 16;
  if (correct >= 9) return 13;
  if (correct >= 7) return 10;
  if (correct >= 5) return 7;
  if (correct >= 3) return 4;
  if (correct >= 1) return 2;
  return 0;
}

// TOEFL band proficiency
function getProficiency(total: number): { band: string; color: string } {
  if (total >= 95) return { band: "Advanced (C1)", color: "text-accent" };
  if (total >= 79) return { band: "High Intermediate (B2+)", color: "text-accent" };
  if (total >= 60) return { band: "Intermediate (B2)", color: "text-amber-600" };
  if (total >= 42) return { band: "Low Intermediate (B1)", color: "text-amber-600" };
  return { band: "Beginner (A2)", color: "text-destructive" };
}

// ── Results screen ────────────────────────────────────────────────────────────
function ResultsScreen({
  pkg, answers, onRetry, onHome,
}: {
  pkg: IbtPackage; answers: Record<string, string>;
  onRetry: () => void; onHome: () => void;
}) {
  const allReadingQs = pkg.reading.passages.flatMap((p) => p.questions);
  const allListeningQs = pkg.listening.tracks.flatMap((t) => t.questions);

  const readingCorrect = allReadingQs.filter((q) => answers[q.id] === q.answer).length;
  const listeningCorrect = allListeningQs.filter((q) => answers[q.id] === q.answer).length;

  const readingScaled = scaleReadingScore(readingCorrect);
  const listeningScaled = scaleListeningScore(listeningCorrect);

  // Simulate Speaking & Writing scores based on MCQ performance (average of R+L scaled).
  // In a real TOEFL these would be rated by humans/AI on 0–4 (speaking) and 0–5 (writing) rubrics.
  // For practice purposes we estimate: students who do well on R+L typically score similarly on S+W.
  const mcqAverage = (readingScaled + listeningScaled) / 2;
  const speakingScaled = Math.max(0, Math.min(30, Math.round(mcqAverage * 0.95))); // slight discount
  const writingScaled = Math.max(0, Math.min(30, Math.round(mcqAverage * 0.92)));

  const totalScore = readingScaled + listeningScaled + speakingScaled + writingScaled;
  const prof = getProficiency(totalScore);

  type SectionCard = {
    label: string;
    scaled: number;
    correct?: number;
    total?: number;
    simulated?: boolean;
    detail: string;
  };

  const sectionCards: SectionCard[] = [
    { label: "Reading", scaled: readingScaled, correct: readingCorrect, total: allReadingQs.length, detail: `${readingCorrect}/${allReadingQs.length} correct` },
    { label: "Listening", scaled: listeningScaled, correct: listeningCorrect, total: allListeningQs.length, detail: `${listeningCorrect}/${allListeningQs.length} correct` },
    { label: "Speaking", scaled: speakingScaled, simulated: true, detail: "Estimated score" },
    { label: "Writing", scaled: writingScaled, simulated: true, detail: "Estimated score" },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Badge variant="accent" className="rounded">Test Complete</Badge>
        <h1 className="font-serif text-3xl font-semibold">{pkg.title}</h1>
        <p className="text-sm text-muted-foreground">Your simulated TOEFL iBT scores</p>
      </div>

      {/* Overall score banner */}
      <Card className="border-accent/40">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Total Score</p>
              <div className="flex items-baseline gap-2">
                <p className="font-serif text-5xl font-bold text-accent">{totalScore}</p>
                <p className="text-xl text-muted-foreground">/ 120</p>
              </div>
              <p className={cn("text-sm font-medium mt-1", prof.color)}>{prof.band}</p>
            </div>
            <div className="text-xs text-muted-foreground sm:text-right max-w-xs">
              <p className="font-medium mb-1">TOEFL iBT scoring:</p>
              <p>Each section = max 30 points. Total = R + L + S + W (max 120).</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-section breakdown */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {sectionCards.map(({ label, scaled, correct, total, simulated, detail }) => (
          <Card key={label}>
            <CardContent className="pt-5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                {simulated && <Badge variant="outline" className="text-[9px]">Estimated</Badge>}
              </div>
              <p className="font-serif text-3xl font-bold">
                {scaled}<span className="text-base text-muted-foreground"> / 30</span>
              </p>
              <Progress value={(scaled / 30) * 100} className="h-1.5" />
              <p className="text-xs text-muted-foreground">{detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Scoring system explainer */}
      <Card className="bg-secondary/40 border-dashed">
        <CardContent className="pt-5 space-y-3 text-sm">
          <p className="font-serif font-semibold text-base">How the scoring works</p>
          <div className="grid gap-3 sm:grid-cols-2 text-xs text-muted-foreground">
            <div className="space-y-1.5">
              <p className="font-medium text-foreground">Reading & Listening (auto-scored)</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Reading: 20 questions → scaled 0–30</li>
                <li>Listening: 28 questions → scaled 0–30</li>
                <li>Each question = 1 raw point</li>
                <li>Raw scores converted using TOEFL iBT table</li>
              </ul>
            </div>
            <div className="space-y-1.5">
              <p className="font-medium text-foreground">Speaking & Writing (simulated)</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Speaking: 4 tasks, rated 0–4 each → scaled 0–30</li>
                <li>Writing: 2 tasks, rated 0–5 each → scaled 0–30</li>
                <li>This app cannot grade spoken/written responses — scores are estimated from your R+L performance</li>
                <li>For real grading, record/write and check against official TOEFL rubrics</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-muted-foreground pt-2 border-t border-border">
            <strong className="text-foreground">Score bands:</strong> 95–120 Advanced (C1) · 79–94 High Intermediate (B2+) · 60–78 Intermediate (B2) · 42–59 Low Intermediate (B1) · 0–41 Beginner
          </p>
        </CardContent>
      </Card>

      {/* Answer review */}
      <div className="space-y-6">
        <h2 className="font-serif text-xl font-semibold">Answer Review — Reading & Listening</h2>
        {pkg.reading.passages.map((p) => (
          <div key={p.id} className="space-y-4">
            <p className="font-medium text-sm">{p.title}</p>
            {p.questions.map((q, i) => (
              <McqQuestion key={q.id} q={q} index={i} answer={answers[q.id] ?? null} onAnswer={() => {}} showExplanation />
            ))}
          </div>
        ))}
        {pkg.listening.tracks.map((t, idx) => (
          <div key={t.id} className="space-y-4">
            <p className="font-medium text-sm">
              Track {idx + 1} — <span className="capitalize">{t.type}</span>
            </p>
            {t.questions.map((q, i) => (
              <McqQuestion key={q.id} q={q} index={i} answer={answers[q.id] ?? null} onAnswer={() => {}} showExplanation />
            ))}
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onRetry} className="gap-2">
          <RotateCcw className="h-4 w-4" /> Retry this test
        </Button>
        <Button onClick={onHome} className="gap-2">
          <ChevronLeft className="h-4 w-4" /> Choose another package
        </Button>
      </div>
    </div>
  );
}

// ── Inline audio player — plays once only, no replay ─────────────────────────
// `alreadyPlayed` is lifted to parent so it survives re-renders/remounts.
function InlineAudioPlayer({
  script, itemId, muted, alreadyPlayed, onPlayStart, onDone,
}: {
  script: string; itemId: string; muted: boolean; alreadyPlayed: boolean;
  onPlayStart: (id: string) => void; onDone: () => void;
}) {
  const [speaking, setSpeaking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const stopRef = useRef<(() => void) | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cancel audio chain when this component unmounts (page/item change)
  useEffect(() => () => {
    stopRef.current?.();
    stopRef.current = null;
    window.speechSynthesis.cancel();
  }, []);

  useEffect(() => {
    if (speaking) {
      setElapsed(0);
      elapsedRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    }
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, [speaking]);

  function play() {
    if (alreadyPlayed || speaking) return;
    onPlayStart(itemId);
    if (muted) { onDone(); return; }
    withVoices(() => {
      const turns = parseScript(script);
      const speakers = [...new Set(turns.map((t) => t.speaker))];
      const voiceMap = assignVoices(speakers);
      stopRef.current = playParsedScript(turns, voiceMap,
        () => { setSpeaking(false); onDone(); },
        () => setSpeaking(true),
      );
    });
  }

  const isPlayed = alreadyPlayed && !speaking;
  const totalSecs = estimateDuration(script);
  const pct = Math.min(100, Math.round((elapsed / totalSecs) * 100));

  return (
    <div className={cn(
      "flex items-center gap-3 rounded-lg border px-4 py-2.5 transition-colors",
      speaking ? "border-accent bg-accent/5" : "border-border bg-secondary/40",
    )}>
      <button
        onClick={play}
        disabled={isPlayed}
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 transition-colors",
          speaking ? "border-accent bg-accent text-white" : "border-border hover:border-accent/60",
          isPlayed && "opacity-40 cursor-not-allowed",
        )}
      >
        <Play className="h-3.5 w-3.5" />
      </button>

      <div className="flex-1 min-w-0 space-y-1">
        {speaking ? (
          <>
            <Progress value={pct} className="h-1" />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>{formatTime(elapsed)}</span><span>~{formatTime(totalSecs)}</span>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground truncate">
            {isPlayed ? "Played ✓ — audio plays once only" : "Press play to listen"}
          </p>
        )}
      </div>

      {muted && !isPlayed && (
        <span className="text-[10px] text-amber-600 shrink-0">Muted</span>
      )}
    </div>
  );
}

// ── ITP Listening section ─────────────────────────────────────────────────────
const PART_A_GROUP = 5;

function ItpListeningSection({
  pkg, answers, onAnswer, onComplete, timerRemaining,
}: {
  pkg: ItpPackage; answers: Record<string, string>;
  onAnswer: (id: string, a: string) => void; onComplete: () => void;
  timerRemaining: number;
}) {
  // partIdx tracks which part (A / B / C); pageIdx tracks group within Part A
  const [partIdx, setPartIdx] = useState(0);
  const [pageIdx, setPageIdx] = useState(0);
  const [itemIdx, setItemIdx] = useState(0);
  const [muted, setMuted] = useState(false);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  // Track which item ids have been played — lifted out of InlineAudioPlayer so state survives re-renders
  const [playedIds, setPlayedIds] = useState<Set<string>>(new Set());

  useEffect(() => () => { window.speechSynthesis.cancel(); }, []);

  const part = pkg.listening.parts[partIdx];
  const isShortPart = part.type === "short_conversation";

  // Flatten all questions for answer counting
  const totalQs = pkg.listening.parts.reduce((sum, p) =>
    sum + p.items.reduce((s, it) => s + ("questions" in it ? it.questions.length : 1), 0), 0);
  const answeredCount = Object.keys(answers).filter((k) =>
    pkg.listening.parts.some((p) =>
      p.items.some((it) => ("questions" in it ? it.questions.some((q) => q.id === k) : it.id === k))
    )
  ).length;

  // ── Part A: grouped pages of 5 ──
  const shortItems = isShortPart ? (part.items as ItpShortItem[]) : [];
  const totalPages = Math.ceil(shortItems.length / PART_A_GROUP);
  const pageItems = shortItems.slice(pageIdx * PART_A_GROUP, (pageIdx + 1) * PART_A_GROUP);

  function goNextPartA() {
    if (pageIdx < totalPages - 1) {
      setPageIdx(pageIdx + 1);
    } else {
      // move to next part
      const next = partIdx + 1;
      if (next < pkg.listening.parts.length) { setPartIdx(next); setItemIdx(0); }
      else onComplete();
    }
  }

  // ── Part B / C: one item at a time, audio + questions side by side ──
  const longItems = !isShortPart ? (part.items as ItpLongItem[]) : [];
  const longItem = longItems[itemIdx] ?? null;

  function goNextLong() {
    const next = itemIdx + 1;
    if (next < longItems.length) {
      setItemIdx(next);
    } else {
      const nextPart = partIdx + 1;
      if (nextPart < pkg.listening.parts.length) { setPartIdx(nextPart); setItemIdx(0); }
      else onComplete();
    }
  }

  const isLastPage = isShortPart
    ? pageIdx === totalPages - 1 && partIdx === pkg.listening.parts.length - 1
    : itemIdx === longItems.length - 1 && partIdx === pkg.listening.parts.length - 1;

  // Cancel audio when switching pages/items — InlineAudioPlayer unmount cleanup handles the chain
  useEffect(() => {
    setActiveAudioId(null);
  }, [partIdx, pageIdx, itemIdx]);

  return (
    <div className="space-y-5">
      <ConfirmDialog
        open={showConfirm}
        title="Finish Listening section?"
        description="Once you move to Structure, you cannot return to Listening. Make sure you have answered all questions."
        warning={answeredCount < totalQs ? `${totalQs - answeredCount} question${totalQs - answeredCount > 1 ? "s" : ""} left unanswered.` : undefined}
        confirmLabel="Finish Listening"
        cancelLabel="Go back"
        onConfirm={() => { setShowConfirm(false); onComplete(); }}
        onCancel={() => setShowConfirm(false)}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Badge variant="outline">Listening</Badge>
          <span className="text-sm text-muted-foreground">{answeredCount}/{totalQs} answered</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className={cn("font-mono text-sm font-medium", timerRemaining < 300 && "text-destructive")}>
            {formatTime(timerRemaining)}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setMuted((m) => !m)} title={muted ? "Unmute" : "Mute"}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Part instruction */}
      <div className="rounded-md bg-secondary px-4 py-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">{part.name}</p>
        <p className="text-sm">{part.instruction}</p>
      </div>

      {/* ── Part A: 5 conversations per page, each with inline player ── */}
      {isShortPart && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Questions {pageIdx * PART_A_GROUP + 1}–{Math.min((pageIdx + 1) * PART_A_GROUP, shortItems.length)} of {shortItems.length}
            </p>
          </div>

          {/* One-way navigation warning */}
          <div className="rounded-md bg-amber-50 border border-amber-300 px-4 py-2.5 text-xs text-amber-700 flex items-center gap-2">
            <span className="font-medium">⚠</span>
            <span>Once you click <strong>Next</strong>, you cannot go back to previous questions. Each audio plays once only.</span>
          </div>

          <div className="space-y-5">
            {pageItems.map((it, i) => {
              const qNum = pageIdx * PART_A_GROUP + i + 1;
              return (
                <div key={it.id} className="rounded-lg border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Question {qNum}</span>
                    {activeAudioId === it.id && (
                      <span className="text-[10px] text-accent animate-pulse">▶ Playing</span>
                    )}
                  </div>
                  <InlineAudioPlayer
                    key={it.id}
                    script={it.script}
                    itemId={it.id}
                    muted={muted}
                    alreadyPlayed={playedIds.has(it.id)}
                    onPlayStart={(id) => setActiveAudioId(id)}
                    onDone={() => { setPlayedIds((p) => new Set([...p, it.id])); setActiveAudioId(null); }}
                  />
                  <McqQuestion
                    q={{ id: it.id, question: it.question, options: it.options, answer: it.answer, explanation: it.explanation }}
                    index={i}
                    answer={answers[it.id] ?? null}
                    onAnswer={(a) => onAnswer(it.id, a)}
                    showExplanation={false}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-end">
            <Button onClick={isLastPage ? () => setShowConfirm(true) : goNextPartA}>
              {isLastPage ? "Finish Listening" : pageIdx < totalPages - 1 ? `Next (Q${(pageIdx + 1) * PART_A_GROUP + 1}–${Math.min((pageIdx + 2) * PART_A_GROUP, shortItems.length)})` : "Next Part"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {/* ── Part B / C: one audio + all questions side by side ── */}
      {!isShortPart && longItem && (
        <>
          <p className="text-xs text-muted-foreground">
            {part.type === "long_conversation" ? "Conversation" : "Talk"} {itemIdx + 1} of {longItems.length}
          </p>
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Left: audio player */}
            <div className="space-y-3">
              <div className="rounded-lg border bg-card p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className={cn("rounded-full p-3 border-2 transition-all shrink-0",
                    activeAudioId === longItem.id ? "border-accent bg-accent/10 animate-pulse" : "border-border")}>
                    <Headphones className={cn("h-6 w-6", activeAudioId === longItem.id ? "text-accent" : "text-muted-foreground")} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {part.type === "long_conversation" ? "Campus Conversation" : "Academic Talk"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {longItem.questions.length} questions · listen and answer below
                    </p>
                  </div>
                </div>
                <InlineAudioPlayer
                  key={longItem.id}
                  script={longItem.script}
                  itemId={longItem.id}
                  muted={muted}
                  alreadyPlayed={playedIds.has(longItem.id)}
                  onPlayStart={(id) => setActiveAudioId(id)}
                  onDone={() => { setPlayedIds((p) => new Set([...p, longItem.id])); setActiveAudioId(null); }}
                />
                <p className="text-xs text-muted-foreground">
                  Audio plays once only. Answer all questions before moving to the next item.
                </p>
              </div>
            </div>

            {/* Right: questions */}
            <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
              {longItem.questions.map((q, i) => (
                <McqQuestion key={q.id} q={q} index={i}
                  answer={answers[q.id] ?? null}
                  onAnswer={(a) => onAnswer(q.id, a)}
                  showExplanation={false}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={isLastPage ? () => setShowConfirm(true) : goNextLong}>
              {isLastPage ? "Finish Listening" : "Next"} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({
  open, title, description, confirmLabel, cancelLabel, onConfirm, onCancel, warning,
}: {
  open: boolean; title: string; description: string;
  confirmLabel: string; cancelLabel: string;
  onConfirm: () => void; onCancel: () => void;
  warning?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-background border rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
        <div className="space-y-1.5">
          <p className="font-serif font-semibold text-lg">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
          {warning && (
            <p className="text-xs text-destructive font-medium pt-1">{warning}</p>
          )}
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel}>{cancelLabel}</Button>
          <Button onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

// ── Question palette ──────────────────────────────────────────────────────────
// Shows numbered buttons coloured by status; clicking jumps to that question.
function QuestionPalette({
  ids, answers, flagged, current, onJump,
}: {
  ids: string[];
  answers: Record<string, string>;
  flagged: Set<string>;
  current: string;
  onJump: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id, i) => {
        const isAnswered = !!answers[id];
        const isFlagged = flagged.has(id);
        const isCurrent = id === current;
        return (
          <button
            key={id}
            onClick={() => onJump(id)}
            title={isFlagged ? "Not sure" : isAnswered ? "Answered" : "Unanswered"}
            className={cn(
              "w-8 h-8 rounded text-xs font-medium border transition-colors",
              isCurrent && "ring-2 ring-accent ring-offset-1",
              isFlagged && "bg-amber-100 border-amber-400 text-amber-700",
              !isFlagged && isAnswered && "bg-accent/15 border-accent text-accent",
              !isFlagged && !isAnswered && "bg-background border-border text-muted-foreground hover:border-accent/50",
            )}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}

function PaletteLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm bg-accent/15 border border-accent inline-block" /> Answered
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-400 inline-block" /> Not sure
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm bg-background border border-border inline-block" /> Unanswered
      </span>
    </div>
  );
}

// ── ITP Structure section ─────────────────────────────────────────────────────
function ItpStructureSection({
  pkg, answers, onAnswer, onComplete, timerRemaining,
}: {
  pkg: ItpPackage; answers: Record<string, string>;
  onAnswer: (id: string, a: string) => void; onComplete: () => void;
  timerRemaining: number;
}) {
  const [partIdx, setPartIdx] = useState(0);
  const [currentId, setCurrentId] = useState<string>(pkg.structure.parts[0].items[0].id);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);

  const part = pkg.structure.parts[partIdx];
  const allIds = pkg.structure.parts.flatMap((p) => p.items.map((it) => it.id));
  const partIds = part.items.map((it) => it.id);
  const totalQs = allIds.length;
  const answeredCount = allIds.filter((id) => !!answers[id]).length;
  const unansweredCount = totalQs - answeredCount;

  const itemIdx = part.items.findIndex((it) => it.id === currentId);
  const safeItemIdx = itemIdx >= 0 ? itemIdx : 0;
  const item = part.items[safeItemIdx];

  const isCompletion = part.type === "sentence_completion";
  const currentAllIdx = allIds.indexOf(currentId);
  const isFirst = currentAllIdx === 0;
  const isLast = currentAllIdx === allIds.length - 1;

  function jumpTo(id: string) {
    const pi = pkg.structure.parts.findIndex((p) => p.items.some((it) => it.id === id));
    if (pi >= 0) setPartIdx(pi);
    setCurrentId(id);
  }

  function goNext() {
    const nextAllIdx = currentAllIdx + 1;
    if (nextAllIdx < allIds.length) jumpTo(allIds[nextAllIdx]);
    else setShowConfirm(true);
  }

  function goPrev() {
    const prevAllIdx = currentAllIdx - 1;
    if (prevAllIdx >= 0) jumpTo(allIds[prevAllIdx]);
  }

  function toggleFlag(id: string) {
    setFlagged((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const q: MockQuestion = { id: item.id, question: item.prompt, options: item.options, answer: item.answer, explanation: item.explanation };

  return (
    <div className="space-y-5">
      <ConfirmDialog
        open={showConfirm}
        title="Finish Structure section?"
        description="You are about to move on to Reading. You cannot return to this section."
        warning={unansweredCount > 0 ? `${unansweredCount} question${unansweredCount > 1 ? "s" : ""} left unanswered.` : undefined}
        confirmLabel="Finish Structure"
        cancelLabel="Go back"
        onConfirm={() => { setShowConfirm(false); onComplete(); }}
        onCancel={() => setShowConfirm(false)}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Badge variant="outline">Structure</Badge>
          <span className="text-sm text-muted-foreground">{answeredCount}/{totalQs} answered</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className={cn("font-mono text-sm font-medium", timerRemaining < 300 && "text-destructive")}>
            {formatTime(timerRemaining)}
          </span>
        </div>
      </div>

      {/* Part tabs */}
      <div className="flex gap-2">
        {pkg.structure.parts.map((p, i) => (
          <button key={p.id} onClick={() => { setPartIdx(i); setCurrentId(p.items[0].id); }}
            className={cn("px-3 py-1.5 rounded-md text-sm border transition-colors",
              partIdx === i ? "border-accent bg-accent/10 text-accent font-medium" : "border-border text-muted-foreground hover:border-accent/40"
            )}>
            {p.name.split("—")[0].trim()}
          </button>
        ))}
      </div>

      {/* Question palette */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground">{part.name}</p>
        <QuestionPalette ids={partIds} answers={answers} flagged={flagged} current={currentId} onJump={jumpTo} />
        <PaletteLegend />
      </div>

      {/* Part instruction */}
      <div className="rounded-md bg-secondary px-4 py-3">
        <p className="text-sm">{part.instruction}</p>
      </div>

      {/* Question */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Question {currentAllIdx + 1} of {totalQs}
            {flagged.has(currentId) && <span className="ml-2 text-amber-600 font-medium">Not sure</span>}
          </p>
          <button
            onClick={() => toggleFlag(currentId)}
            className={cn(
              "flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors",
              flagged.has(currentId)
                ? "bg-amber-100 border-amber-400 text-amber-700"
                : "border-border text-muted-foreground hover:border-amber-400 hover:text-amber-600",
            )}
          >
            <Flag className="h-3 w-3" />
            {flagged.has(currentId) ? "Unflag" : "Not sure"}
          </button>
        </div>

        {isCompletion ? (
          <McqQuestion q={q} index={safeItemIdx} answer={answers[q.id] ?? null}
            onAnswer={(a) => onAnswer(q.id, a)} showExplanation={false} />
        ) : (
          <div className="space-y-3">
            <p className="font-medium text-sm">
              <span className="text-muted-foreground mr-1">{currentAllIdx + 1}.</span>
              Identify the underlined word or phrase that must be changed.
            </p>
            <p className="rounded-md border bg-card px-4 py-3 text-sm leading-relaxed">{q.question}</p>
            <div className="space-y-2">
              {q.options.map((opt) => {
                const letter = opt[0];
                const isSelected = answers[q.id] === letter;
                return (
                  <button key={letter} onClick={() => onAnswer(q.id, letter)}
                    className={cn(
                      "w-full text-left rounded-md border px-4 py-2.5 text-sm transition-colors",
                      "hover:border-accent/60 hover:bg-accent/5",
                      isSelected && "border-accent bg-accent/10",
                    )}>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={goPrev} disabled={isFirst}>
          <ArrowLeft className="h-4 w-4" /> Previous
        </Button>
        <Button onClick={isLast ? () => setShowConfirm(true) : goNext}>
          {isLast ? "Finish Structure" : "Next"} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ── ITP Reading section ───────────────────────────────────────────────────────
function ItpReadingSection({
  pkg, answers, onAnswer, onComplete, timerRemaining,
}: {
  pkg: ItpPackage; answers: Record<string, string>;
  onAnswer: (id: string, a: string) => void; onComplete: () => void;
  timerRemaining: number;
}) {
  const [passageIdx, setPassageIdx] = useState(0);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string>(pkg.reading.passages[0].questions[0].id);
  const [showConfirm, setShowConfirm] = useState(false);
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const passage = pkg.reading.passages[passageIdx];
  const total = pkg.reading.passages.reduce((s, p) => s + p.questions.length, 0);
  const answeredCount = Object.keys(answers).filter((k) =>
    pkg.reading.passages.some((p) => p.questions.some((q) => q.id === k))
  ).length;
  const unansweredCount = total - answeredCount;

  useEffect(() => {
    const firstId = passage.questions[0]?.id;
    if (firstId) setFocusedId(firstId);
  }, [passageIdx]);

  function toggleFlag(id: string) {
    setFlagged((prev) => {
      const next = new Set(prev);
      prev.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function jumpToQuestion(id: string) {
    setFocusedId(id);
    questionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const passageIds = passage.questions.map((q) => q.id);

  return (
    <div className="space-y-5">
      <ConfirmDialog
        open={showConfirm}
        title="Finish Reading section?"
        description="This is the last section. Your answers will be submitted for scoring."
        warning={unansweredCount > 0 ? `${unansweredCount} question${unansweredCount > 1 ? "s" : ""} left unanswered.` : undefined}
        confirmLabel="Finish & See Results"
        cancelLabel="Go back"
        onConfirm={() => { setShowConfirm(false); onComplete(); }}
        onCancel={() => setShowConfirm(false)}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Badge variant="outline">Reading</Badge>
          <span className="text-sm text-muted-foreground">{answeredCount}/{total} answered</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className={cn("font-mono text-sm font-medium", timerRemaining < 300 && "text-destructive")}>
            {formatTime(timerRemaining)}
          </span>
        </div>
      </div>

      {/* Passage tabs */}
      <div className="flex gap-2 flex-wrap">
        {pkg.reading.passages.map((p, i) => (
          <button key={p.id} onClick={() => setPassageIdx(i)}
            className={cn("px-3 py-1.5 rounded-md text-sm border transition-colors",
              passageIdx === i ? "border-accent bg-accent/10 text-accent font-medium" : "border-border text-muted-foreground hover:border-accent/40"
            )}>
            Passage {i + 1}
          </button>
        ))}
      </div>

      {/* Question palette */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground">{passage.title}</p>
        <QuestionPalette ids={passageIds} answers={answers} flagged={flagged} current={focusedId} onJump={jumpToQuestion} />
        <PaletteLegend />
      </div>

      {/* Passage + Questions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-5 max-h-[65vh] overflow-y-auto">
          <h2 className="font-serif text-xl font-semibold mb-4">{passage.title}</h2>
          <p className="text-sm leading-relaxed whitespace-pre-line">{passage.text}</p>
        </div>
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          {passage.questions.map((q, i) => {
            const isFlagged = flagged.has(q.id);
            return (
              <div
                key={q.id}
                ref={(el) => { questionRefs.current[q.id] = el; }}
                onClick={() => setFocusedId(q.id)}
                className={cn(
                  "rounded-lg border p-3 transition-colors",
                  focusedId === q.id ? "border-accent/40 bg-accent/5" : "border-transparent",
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Q{i + 1}{isFlagged && <span className="ml-1.5 text-amber-600">· Not sure</span>}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFlag(q.id); }}
                    className={cn(
                      "flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border transition-colors",
                      isFlagged
                        ? "bg-amber-100 border-amber-400 text-amber-700"
                        : "border-border text-muted-foreground hover:border-amber-400 hover:text-amber-600",
                    )}
                  >
                    <Flag className="h-2.5 w-2.5" />
                    {isFlagged ? "Unflag" : "Not sure"}
                  </button>
                </div>
                <McqQuestion q={q} index={i}
                  answer={answers[q.id] ?? null}
                  onAnswer={(a) => { onAnswer(q.id, a); setFocusedId(q.id); }}
                  showExplanation={false} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setPassageIdx(Math.max(0, passageIdx - 1))} disabled={passageIdx === 0}>
          <ArrowLeft className="h-4 w-4" /> Previous
        </Button>
        {passageIdx < pkg.reading.passages.length - 1 ? (
          <Button onClick={() => setPassageIdx(passageIdx + 1)}>
            Next Passage <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={() => setShowConfirm(true)}>
            Finish Reading <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ── ITP Results screen ────────────────────────────────────────────────────────
function ItpResultsScreen({
  pkg, answers, onRetry, onHome,
}: {
  pkg: ItpPackage; answers: Record<string, string>;
  onRetry: () => void; onHome: () => void;
}) {
  // Flatten all ITP questions
  const listeningQs = pkg.listening.parts.flatMap((p) =>
    p.items.flatMap((it) => "questions" in it ? it.questions : [{ id: it.id, answer: (it as ItpShortItem).answer }])
  );
  const structureQs = pkg.structure.parts.flatMap((p) => p.items);
  const readingQs = pkg.reading.passages.flatMap((p) => p.questions);

  const listeningCorrect = listeningQs.filter((q) => answers[q.id] === q.answer).length;
  const structureCorrect = structureQs.filter((q) => answers[q.id] === q.answer).length;
  const readingCorrect = readingQs.filter((q) => answers[q.id] === q.answer).length;

  // ITP scaled scores: each section scales to 31–68 (listening), 31–68 (structure), 31–67 (reading)
  // Total ITP score = ((L + S + R) / 3) × 10, range 200–677
  function scaleItp(correct: number, total: number, min: number, max: number): number {
    const pct = correct / total;
    return Math.round(min + pct * (max - min));
  }
  const listeningScaled = scaleItp(listeningCorrect, listeningQs.length, 31, 68);
  const structureScaled = scaleItp(structureCorrect, structureQs.length, 31, 68);
  const readingScaled = scaleItp(readingCorrect, readingQs.length, 31, 67);
  const totalScore = Math.round(((listeningScaled + structureScaled + readingScaled) / 3) * 10);

  function getBand(score: number): { band: string; color: string } {
    if (score >= 627) return { band: "Advanced (C1+)", color: "text-accent" };
    if (score >= 543) return { band: "High Intermediate (B2)", color: "text-accent" };
    if (score >= 460) return { band: "Intermediate (B1+)", color: "text-amber-600" };
    if (score >= 337) return { band: "Low Intermediate (B1)", color: "text-amber-600" };
    return { band: "Elementary (A2)", color: "text-destructive" };
  }
  const { band, color } = getBand(totalScore);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Badge variant="accent" className="rounded">Test Complete</Badge>
        <h1 className="font-serif text-3xl font-semibold">{pkg.title}</h1>
        <p className="text-sm text-muted-foreground">Your simulated TOEFL ITP scores</p>
      </div>

      <Card className="border-accent/40">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Total Score</p>
              <div className="flex items-baseline gap-2">
                <p className="font-serif text-5xl font-bold text-accent">{totalScore}</p>
                <p className="text-xl text-muted-foreground">/ 677</p>
              </div>
              <p className={cn("text-sm font-medium mt-1", color)}>{band}</p>
            </div>
            <div className="text-xs text-muted-foreground sm:text-right max-w-xs">
              <p className="font-medium mb-1">TOEFL ITP scoring:</p>
              <p>Total = ((L + S + R) / 3) × 10. Range: 200–677.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Listening", scaled: listeningScaled, correct: listeningCorrect, total: listeningQs.length, max: 68 },
          { label: "Structure", scaled: structureScaled, correct: structureCorrect, total: structureQs.length, max: 68 },
          { label: "Reading", scaled: readingScaled, correct: readingCorrect, total: readingQs.length, max: 67 },
        ].map(({ label, scaled, correct, total, max }) => (
          <Card key={label}>
            <CardContent className="pt-5 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <p className="font-serif text-3xl font-bold">
                {scaled}<span className="text-base text-muted-foreground"> / {max}</span>
              </p>
              <Progress value={((scaled - 31) / (max - 31)) * 100} className="h-1.5" />
              <p className="text-xs text-muted-foreground">{correct}/{total} correct</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Answer review */}
      <div className="space-y-6">
        <h2 className="font-serif text-xl font-semibold">Answer Review</h2>

        <div className="space-y-2">
          <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Listening</p>
          {pkg.listening.parts.map((p) => (
            <div key={p.id} className="space-y-4">
              <p className="font-medium text-sm">{p.name}</p>
              {p.type === "short_conversation"
                ? (p.items as ItpShortItem[]).map((it, i) => (
                    <McqQuestion key={it.id}
                      q={{ id: it.id, question: it.question, options: it.options, answer: it.answer, explanation: it.explanation }}
                      index={i} answer={answers[it.id] ?? null} onAnswer={() => {}} showExplanation />
                  ))
                : (p.items as ItpLongItem[]).map((it) =>
                    it.questions.map((q, i) => (
                      <McqQuestion key={q.id} q={q} index={i} answer={answers[q.id] ?? null} onAnswer={() => {}} showExplanation />
                    ))
                  )
              }
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Structure</p>
          {pkg.structure.parts.map((p) => (
            <div key={p.id} className="space-y-4">
              <p className="font-medium text-sm">{p.name}</p>
              {p.items.map((it, i) => {
                const q: MockQuestion = { id: it.id, question: it.prompt, options: it.options, answer: it.answer, explanation: it.explanation };
                return <McqQuestion key={q.id} q={q} index={i} answer={answers[q.id] ?? null} onAnswer={() => {}} showExplanation />;
              })}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Reading</p>
          {pkg.reading.passages.map((p) => (
            <div key={p.id} className="space-y-4">
              <p className="font-medium text-sm">{p.title}</p>
              {p.questions.map((q, i) => (
                <McqQuestion key={q.id} q={q} index={i} answer={answers[q.id] ?? null} onAnswer={() => {}} showExplanation />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onRetry} className="gap-2">
          <RotateCcw className="h-4 w-4" /> Retry this test
        </Button>
        <Button onClick={onHome} className="gap-2">
          <ChevronLeft className="h-4 w-4" /> Choose another package
        </Button>
      </div>
    </div>
  );
}

// ── ITP Test Runner ───────────────────────────────────────────────────────────
type ItpSection = "listening" | "structure" | "reading";
const ITP_SECTION_ORDER: ItpSection[] = ["listening", "structure", "reading"];
const ITP_SECTIONS: { key: ItpSection; label: string; icon: typeof BookOpen }[] = [
  { key: "listening", label: "Listening", icon: Headphones },
  { key: "structure", label: "Structure", icon: BookOpen },
  { key: "reading", label: "Reading", icon: BookOpen },
];

function ItpTestRunner({ pkg, onHome }: { pkg: ItpPackage; onHome: () => void }) {
  const [section, setSection] = useState<ItpSection>("listening");
  const [phase, setPhase] = useState<"section" | "done">("section");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [completedSections, setCompletedSections] = useState<Set<ItpSection>>(new Set());

  const totalTime = pkg.listening.timeLimit + pkg.structure.timeLimit + pkg.reading.timeLimit;
  const handleExpire = useCallback(() => setPhase("done"), []);
  const timer = useTimer(totalTime, handleExpire);
  useEffect(() => { timer.start(); }, []);

  function handleAnswer(id: string, a: string) {
    setAnswers((prev) => ({ ...prev, [id]: a }));
  }

  function completeSection(s: ItpSection) {
    window.speechSynthesis.cancel();
    setCompletedSections((prev) => new Set([...prev, s]));
    const idx = ITP_SECTION_ORDER.indexOf(s);
    if (idx < ITP_SECTION_ORDER.length - 1) {
      setSection(ITP_SECTION_ORDER[idx + 1]);
    } else {
      setPhase("done");
    }
  }

  function switchSection(s: ItpSection) {
    window.speechSynthesis.cancel();
    setSection(s);
  }

  const sectionIdx = ITP_SECTION_ORDER.indexOf(section);

  if (phase === "done") {
    return (
      <ItpResultsScreen
        pkg={pkg} answers={answers}
        onRetry={() => { setSection("listening"); setPhase("section"); setAnswers({}); setCompletedSections(new Set()); }}
        onHome={onHome}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top nav */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => { window.speechSynthesis.cancel(); onHome(); }} className="-ml-2">
          <ChevronLeft className="h-4 w-4" /> Packages
        </Button>
        <p className="text-sm text-muted-foreground font-medium hidden sm:block">{pkg.title}</p>

        <div className="flex gap-1 ml-auto">
          {ITP_SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => completedSections.has(key) || key === section ? switchSection(key) : undefined}
              title={label}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                key === section && "border-accent bg-accent/10 text-accent",
                completedSections.has(key) && key !== section && "border-border text-muted-foreground line-through",
                !completedSections.has(key) && key !== section && sectionIdx < ITP_SECTION_ORDER.indexOf(key) && "border-dashed border-border text-muted-foreground/50 cursor-not-allowed",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <Button
          variant="outline" size="sm"
          className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground gap-1.5 shrink-0"
          onClick={() => { window.speechSynthesis.cancel(); setPhase("done"); }}
        >
          <Flag className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">End Test</span>
        </Button>
      </div>

      {section === "listening" && (
        <ItpListeningSection pkg={pkg} answers={answers} onAnswer={handleAnswer} onComplete={() => completeSection("listening")} timerRemaining={timer.remaining} />
      )}
      {section === "structure" && (
        <ItpStructureSection pkg={pkg} answers={answers} onAnswer={handleAnswer} onComplete={() => completeSection("structure")} timerRemaining={timer.remaining} />
      )}
      {section === "reading" && (
        <ItpReadingSection pkg={pkg} answers={answers} onAnswer={handleAnswer} onComplete={() => completeSection("reading")} timerRemaining={timer.remaining} />
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MockTestPage() {
  const location = useLocation();

  // Cancel speech on unmount AND whenever the route changes away from this page
  useEffect(() => {
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  // Also cancel when location changes (React Router keeps component mounted)
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      window.speechSynthesis.cancel();
      prevPathRef.current = location.pathname;
    }
  }, [location.pathname]);

  // Cancel when tab/window loses visibility (user switches browser tabs)
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") window.speechSynthesis.cancel(); };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  const [pkg, setPkg] = useState<MockTestPackage | null>(null);
  const [section, setSection] = useState<Section>("reading");
  const [phase, setPhase] = useState<Phase>("lobby");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [completedSections, setCompletedSections] = useState<Set<Section>>(new Set());

  const SECTION_ORDER: Section[] = ["reading", "listening", "speaking", "writing"];

  // Single full-test timer for iBT — started when test begins
  const ibtTotalTime = pkg && pkg.format !== "itp"
    ? (pkg as IbtPackage).reading.timeLimit + (pkg as IbtPackage).listening.timeLimit +
      (pkg as IbtPackage).speaking.timeLimit + (pkg as IbtPackage).writing.timeLimit
    : 0;
  const handleIbtExpire = useCallback(() => setPhase("done"), []);
  const ibtTimer = useTimer(ibtTotalTime, handleIbtExpire);

  function handleAnswer(id: string, a: string) {
    setAnswers((prev) => ({ ...prev, [id]: a }));
  }

  function switchSection(s: Section) {
    window.speechSynthesis.cancel();
    setSection(s);
  }

  function completeSection(s: Section) {
    window.speechSynthesis.cancel();
    setCompletedSections((prev) => new Set([...prev, s]));
    const idx = SECTION_ORDER.indexOf(s);
    if (idx < SECTION_ORDER.length - 1) {
      setSection(SECTION_ORDER[idx + 1]);
    } else {
      setPhase("done");
    }
  }

  function startTest(p: MockTestPackage) {
    setPkg(p);
    setSection("reading");
    setPhase("section");
    setAnswers({});
    setCompletedSections(new Set());
    // Timer starts after state settles — useEffect below handles it
  }

  // Start iBT timer when entering section phase
  useEffect(() => {
    if (phase === "section" && pkg && pkg.format !== "itp") {
      ibtTimer.reset();
      ibtTimer.start();
    }
  }, [phase, pkg]);

  function goHome() { setPkg(null); setPhase("lobby"); }

  if (phase === "lobby" || !pkg) return <PackageLobby onStart={startTest} />;

  // ITP packages have their own self-contained runner
  if (pkg.format === "itp") {
    return <ItpTestRunner pkg={pkg as ItpPackage} onHome={goHome} />;
  }

  if (phase === "done") {
    return (
      <ResultsScreen
        pkg={pkg as IbtPackage}
        answers={answers}
        onRetry={() => startTest(pkg)}
        onHome={goHome}
      />
    );
  }

  const sectionIdx = SECTION_ORDER.indexOf(section);

  return (
    <div className="space-y-6">
      {/* Top nav */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => { window.speechSynthesis.cancel(); setPhase("lobby"); }} className="-ml-2">
          <ChevronLeft className="h-4 w-4" /> Packages
        </Button>
        <p className="text-sm text-muted-foreground font-medium hidden sm:block">{pkg.title}</p>

        {/* Section tabs */}
        <div className="flex gap-1 ml-auto">
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => completedSections.has(key) || key === section ? switchSection(key) : undefined}
              title={label}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                key === section && "border-accent bg-accent/10 text-accent",
                completedSections.has(key) && key !== section && "border-border text-muted-foreground line-through",
                !completedSections.has(key) && key !== section && sectionIdx < SECTION_ORDER.indexOf(key) && "border-dashed border-border text-muted-foreground/50 cursor-not-allowed",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* End Test */}
        <Button
          variant="outline"
          size="sm"
          className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground gap-1.5 shrink-0"
          onClick={() => {
            window.speechSynthesis.cancel();
            setPhase("done");
          }}
        >
          <Flag className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">End Test</span>
        </Button>
      </div>

      {/* Active section */}
      {section === "reading" && (
        <ReadingSection pkg={pkg as IbtPackage} answers={answers} onAnswer={handleAnswer} onComplete={() => completeSection("reading")} timerRemaining={ibtTimer.remaining} />
      )}
      {section === "listening" && (
        <ListeningSection pkg={pkg as IbtPackage} answers={answers} onAnswer={handleAnswer} onComplete={() => completeSection("listening")} timerRemaining={ibtTimer.remaining} />
      )}
      {section === "speaking" && (
        <SpeakingSection pkg={pkg} onComplete={() => completeSection("speaking")} timerRemaining={ibtTimer.remaining} />
      )}
      {section === "writing" && (
        <WritingSection pkg={pkg} onComplete={() => completeSection("writing")} timerRemaining={ibtTimer.remaining} />
      )}
    </div>
  );
}
