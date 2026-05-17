import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, BookOpen, ChevronLeft,
  Clock, Headphones, MessageSquare, Mic, Pause,
  Play, RotateCcw, Volume2, VolumeX, PenLine,
} from "lucide-react";
import { api, type MockTestPackage, type MockQuestion } from "../api";
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

function getAmericanVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === "en-US" && v.localService) ||
    voices.find((v) => v.lang === "en-US") ||
    voices.find((v) => v.lang.startsWith("en")) ||
    null
  );
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
function PackageLobby({ onStart }: { onStart: (pkg: MockTestPackage) => void }) {
  const [packages, setPackages] = useState<{ id: string; title: string }[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.listMockTests().then(setPackages).catch(() => setPackages([])); }, []);

  async function load(id: string) {
    setLoading(true);
    try { onStart(await api.getMockTest(id)); }
    finally { setLoading(false); }
  }

  const SECTION_INFO = [
    { icon: BookOpen, label: "Reading", detail: "2 passages · 20 questions · 35 min" },
    { icon: Headphones, label: "Listening", detail: "1 conversation + 1 lecture · 11 questions · 36 min" },
    { icon: Mic, label: "Speaking", detail: "4 tasks · 17 min" },
    { icon: PenLine, label: "Writing", detail: "2 tasks · 50 min" },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Badge variant="accent" className="rounded">TOEFL iBT Format</Badge>
        <h1 className="font-serif text-4xl font-semibold">Mock Test</h1>
        <p className="max-w-2xl text-muted-foreground">
          Full TOEFL iBT practice — Reading, Listening, Speaking, and Writing sections with a timer.
          Listening passages are read aloud by your browser.
        </p>
      </div>

      {/* Section overview */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SECTION_INFO.map(({ icon: Icon, label, detail }) => (
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
      <div className="space-y-3">
        <h2 className="font-serif text-xl font-semibold">Choose a Practice Package</h2>
        {!packages ? (
          <p className="text-muted-foreground">Loading packages…</p>
        ) : packages.length === 0 ? (
          <p className="text-muted-foreground">No packages available yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {packages.map((pkg, i) => (
              <button
                key={pkg.id}
                onClick={() => load(pkg.id)}
                disabled={loading}
                className="text-left rounded-lg border bg-card p-5 hover:shadow-md hover:border-accent/50 transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-serif font-semibold text-lg">Package {i + 1}</p>
                  <Badge variant="outline" className="text-[10px]">Full iBT</Badge>
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
  pkg, answers, onAnswer, onComplete,
}: {
  pkg: MockTestPackage; answers: Record<string, string>;
  onAnswer: (id: string, a: string) => void; onComplete: () => void;
}) {
  const [passageIdx, setPassageIdx] = useState(0);
  const passage = pkg.reading.passages[passageIdx];
  const total = pkg.reading.passages.reduce((s, p) => s + p.questions.length, 0);
  const answered = Object.keys(answers).filter((k) =>
    pkg.reading.passages.some((p) => p.questions.some((q) => q.id === k))
  ).length;

  const handleExpire = useCallback(onComplete, [onComplete]);
  const timer = useTimer(pkg.reading.timeLimit, handleExpire);
  useEffect(() => { timer.start(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Badge variant="outline">Reading</Badge>
          <span className="text-sm text-muted-foreground">{answered}/{total} answered</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className={cn("font-mono text-sm font-medium", timer.remaining < 300 && "text-destructive")}>
            {formatTime(timer.remaining)}
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Passage text */}
        <div className="rounded-lg border bg-card p-5 max-h-[70vh] overflow-y-auto">
          <h2 className="font-serif text-xl font-semibold mb-4">{passage.title}</h2>
          <p className="text-sm leading-relaxed whitespace-pre-line">{passage.text}</p>
        </div>

        {/* Questions */}
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
          {passage.questions.map((q, i) => (
            <McqQuestion key={q.id} q={q} index={i}
              answer={answers[q.id] ?? null}
              onAnswer={(a) => onAnswer(q.id, a)}
              showExplanation={false}
            />
          ))}
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
          <Button onClick={onComplete}>
            Finish Reading <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Listening section ─────────────────────────────────────────────────────────
function ListeningSection({
  pkg, answers, onAnswer, onComplete,
}: {
  pkg: MockTestPackage; answers: Record<string, string>;
  onAnswer: (id: string, a: string) => void; onComplete: () => void;
}) {
  const [trackIdx, setTrackIdx] = useState(0);
  const [played, setPlayed] = useState<Record<number, boolean>>({});
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);

  const track = pkg.listening.tracks[trackIdx];
  const total = pkg.listening.tracks.reduce((s, t) => s + t.questions.length, 0);
  const answered = Object.keys(answers).filter((k) =>
    pkg.listening.tracks.some((t) => t.questions.some((q) => q.id === k))
  ).length;

  const handleExpire = useCallback(onComplete, [onComplete]);
  const timer = useTimer(pkg.listening.timeLimit, handleExpire);
  useEffect(() => { timer.start(); }, []);

  function playTrack() {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(track.script);
    const voice = getAmericanVoice();
    if (voice) utt.voice = voice;
    utt.lang = "en-US";
    utt.rate = 0.92;
    utt.pitch = 1;
    utt.onstart = () => setSpeaking(true);
    utt.onend = () => { setSpeaking(false); setShowQuestions(true); setPlayed((p) => ({ ...p, [trackIdx]: true })); };
    utt.onerror = () => setSpeaking(false);
    if (!muted) window.speechSynthesis.speak(utt);
    else { setSpeaking(false); setShowQuestions(true); setPlayed((p) => ({ ...p, [trackIdx]: true })); }
  }

  function stopTrack() {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setShowQuestions(true);
    setPlayed((p) => ({ ...p, [trackIdx]: true }));
  }

  useEffect(() => {
    setShowQuestions(played[trackIdx] ?? false);
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [trackIdx]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Badge variant="outline">Listening</Badge>
          <span className="text-sm text-muted-foreground">{answered}/{total} answered</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className={cn("font-mono text-sm font-medium", timer.remaining < 300 && "text-destructive")}>
            {formatTime(timer.remaining)}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setMuted((m) => !m)} title={muted ? "Unmute" : "Mute"}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Track tabs */}
      <div className="flex gap-2">
        {pkg.listening.tracks.map((t, i) => (
          <button key={t.id} onClick={() => setTrackIdx(i)}
            className={cn("px-3 py-1.5 rounded-md text-sm border transition-colors capitalize",
              trackIdx === i ? "border-accent bg-accent/10 text-accent font-medium" : "border-border text-muted-foreground hover:border-accent/40"
            )}>
            {i + 1}. {t.type}
          </button>
        ))}
      </div>

      {!showQuestions ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-6 py-16 text-center">
            <div className={cn("rounded-full p-6 border-2 transition-all",
              speaking ? "border-accent animate-pulse bg-accent/10" : "border-border")}>
              <Headphones className={cn("h-12 w-12", speaking ? "text-accent" : "text-muted-foreground")} />
            </div>
            <div className="space-y-1">
              <p className="font-serif text-xl font-semibold capitalize">{track.type}</p>
              <p className="text-sm text-muted-foreground">
                {speaking ? "Playing audio… listen carefully." : played[trackIdx] ? "Audio complete. Questions unlocked." : "Press play to hear the audio. Questions appear after."}
              </p>
              {muted && !played[trackIdx] && (
                <p className="text-xs text-amber-600">Audio muted — click play to skip to questions.</p>
              )}
            </div>
            <div className="flex gap-3">
              {!speaking ? (
                <Button onClick={playTrack} className="gap-2">
                  <Play className="h-4 w-4" />
                  {played[trackIdx] ? "Replay" : "Play Audio"}
                </Button>
              ) : (
                <Button variant="outline" onClick={stopTrack} className="gap-2">
                  <Pause className="h-4 w-4" /> Stop & Show Questions
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Questions for {track.type}</p>
            <Button variant="ghost" size="sm" onClick={() => { setShowQuestions(false); }} className="gap-1.5 text-xs">
              <RotateCcw className="h-3 w-3" /> Replay audio
            </Button>
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

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setTrackIdx(Math.max(0, trackIdx - 1))} disabled={trackIdx === 0}>
          <ArrowLeft className="h-4 w-4" /> Previous
        </Button>
        {trackIdx < pkg.listening.tracks.length - 1 ? (
          <Button onClick={() => setTrackIdx(trackIdx + 1)} disabled={!showQuestions}>
            Next Track <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={onComplete} disabled={!showQuestions}>
            Finish Listening <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Speaking section ──────────────────────────────────────────────────────────
function SpeakingSection({ pkg, onComplete }: { pkg: MockTestPackage; onComplete: () => void }) {
  const [taskIdx, setTaskIdx] = useState(0);
  const [phase, setPhase] = useState<"intro" | "reading" | "listening" | "prep" | "speaking" | "done">("intro");
  const [notes, setNotes] = useState<Record<number, string>>({});

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
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(task.listeningScript ?? "");
    const voice = getAmericanVoice();
    if (voice) utt.voice = voice;
    utt.lang = "en-US"; utt.rate = 0.92;
    utt.onend = () => { setPhase("prep"); timer.reset(); timer.start(); };
    window.speechSynthesis.speak(utt);
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
        {(phase === "prep" || phase === "speaking") && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className={cn("font-mono text-sm font-medium", timer.remaining < 5 && "text-destructive animate-pulse")}>
              {formatTime(timer.remaining)}
            </span>
          </div>
        )}
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
function WritingSection({ pkg, onComplete }: { pkg: MockTestPackage; onComplete: () => void }) {
  const [taskIdx, setTaskIdx] = useState(0);
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [audioPlayed, setAudioPlayed] = useState(false);

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
    const utt = new SpeechSynthesisUtterance(task.listeningScript ?? "");
    const voice = getAmericanVoice();
    if (voice) utt.voice = voice;
    utt.lang = "en-US"; utt.rate = 0.92;
    utt.onend = () => setAudioPlayed(true);
    window.speechSynthesis.speak(utt);
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
          <span className={cn("font-mono text-sm font-medium", timer.remaining < 120 && "text-destructive")}>
            {formatTime(timer.remaining)}
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

// ── Results screen ────────────────────────────────────────────────────────────
function ResultsScreen({
  pkg, answers, onRetry, onHome,
}: {
  pkg: MockTestPackage; answers: Record<string, string>;
  onRetry: () => void; onHome: () => void;
}) {
  const allReadingQs = pkg.reading.passages.flatMap((p) => p.questions);
  const allListeningQs = pkg.listening.tracks.flatMap((t) => t.questions);

  function sectionScore(qs: MockQuestion[]) {
    const total = qs.length;
    const correct = qs.filter((q) => answers[q.id] === q.answer).length;
    return { correct, total, pct: total > 0 ? Math.round((correct / total) * 100) : 0 };
  }

  const reading = sectionScore(allReadingQs);
  const listening = sectionScore(allListeningQs);
  const overall = {
    correct: reading.correct + listening.correct,
    total: reading.total + listening.total,
    pct: Math.round(((reading.correct + listening.correct) / (reading.total + listening.total)) * 100),
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-serif text-3xl font-semibold">Test Complete</h1>
        <p className="text-muted-foreground">{pkg.title}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Reading", ...reading },
          { label: "Listening", ...listening },
          { label: "Overall (MCQ)", ...overall },
        ].map(({ label, correct, total, pct }) => (
          <Card key={label}>
            <CardContent className="pt-5 space-y-3">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <p className="font-serif text-3xl font-bold">{pct}<span className="text-lg text-muted-foreground">%</span></p>
              <Progress value={pct} className="h-2" />
              <p className="text-xs text-muted-foreground">{correct} / {total} correct</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        Speaking and Writing sections are self-evaluated — use official TOEFL rubrics to score your spoken and written responses.
      </p>

      {/* Answer review */}
      <div className="space-y-6">
        <h2 className="font-serif text-xl font-semibold">Answer Review</h2>
        {pkg.reading.passages.map((p) => (
          <div key={p.id} className="space-y-4">
            <p className="font-medium text-sm">{p.title}</p>
            {p.questions.map((q, i) => (
              <McqQuestion key={q.id} q={q} index={i} answer={answers[q.id] ?? null} onAnswer={() => {}} showExplanation />
            ))}
          </div>
        ))}
        {pkg.listening.tracks.map((t) => (
          <div key={t.id} className="space-y-4">
            <p className="font-medium text-sm capitalize">{t.type} — questions</p>
            {t.questions.map((q, i) => (
              <McqQuestion key={q.id} q={q} index={i} answer={answers[q.id] ?? null} onAnswer={() => {}} showExplanation />
            ))}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MockTestPage() {
  const [pkg, setPkg] = useState<MockTestPackage | null>(null);
  const [section, setSection] = useState<Section>("reading");
  const [phase, setPhase] = useState<Phase>("lobby");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [completedSections, setCompletedSections] = useState<Set<Section>>(new Set());

  const SECTION_ORDER: Section[] = ["reading", "listening", "speaking", "writing"];

  function handleAnswer(id: string, a: string) {
    setAnswers((prev) => ({ ...prev, [id]: a }));
  }

  function completeSection(s: Section) {
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
  }

  if (phase === "lobby" || !pkg) return <PackageLobby onStart={startTest} />;

  if (phase === "done") {
    return (
      <ResultsScreen
        pkg={pkg}
        answers={answers}
        onRetry={() => startTest(pkg)}
        onHome={() => { setPkg(null); setPhase("lobby"); }}
      />
    );
  }

  const sectionIdx = SECTION_ORDER.indexOf(section);

  return (
    <div className="space-y-6">
      {/* Top nav */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => setPhase("lobby")} className="-ml-2">
          <ChevronLeft className="h-4 w-4" /> Packages
        </Button>
        <p className="text-sm text-muted-foreground font-medium">{pkg.title}</p>
        <div className="ml-auto flex gap-1">
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => completedSections.has(key) || key === section ? setSection(key) : null}
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
      </div>

      {/* Active section */}
      {section === "reading" && (
        <ReadingSection pkg={pkg} answers={answers} onAnswer={handleAnswer} onComplete={() => completeSection("reading")} />
      )}
      {section === "listening" && (
        <ListeningSection pkg={pkg} answers={answers} onAnswer={handleAnswer} onComplete={() => completeSection("listening")} />
      )}
      {section === "speaking" && (
        <SpeakingSection pkg={pkg} onComplete={() => completeSection("speaking")} />
      )}
      {section === "writing" && (
        <WritingSection pkg={pkg} onComplete={() => completeSection("writing")} />
      )}
    </div>
  );
}
