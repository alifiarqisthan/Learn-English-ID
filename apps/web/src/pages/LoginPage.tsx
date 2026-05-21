import { useEffect, useRef, useState } from "react";
import { BookOpen } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [slowServer, setSlowServer] = useState(false);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (slowTimer.current) clearTimeout(slowTimer.current); };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSlowServer(false);
    if (name.trim().length === 0) { setError("Please enter your name."); return; }
    if (!/^\d{4}$/.test(pin)) { setError("PIN must be exactly 4 digits."); return; }

    setLoading(true);
    slowTimer.current = setTimeout(() => setSlowServer(true), 5000);
    try {
      await login(name.trim(), pin);
    } catch (err) {
      const msg = String(err);
      if (msg.includes("401")) setError("Incorrect PIN for this name.");
      else setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      setSlowServer(false);
      if (slowTimer.current) clearTimeout(slowTimer.current);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <BookOpen className="h-10 w-10 text-accent" />
          <h1 className="font-serif text-3xl font-semibold">LearnEnglishID</h1>
          <p className="text-sm text-muted-foreground">
            Enter your name and a 4-digit PIN to get started.
            <br />
            New here? Just pick a name and PIN — your account will be created automatically.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">Sign in</CardTitle>
            <CardDescription>Your progress is saved to your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="name">Name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alifi"
                  autoComplete="username"
                  maxLength={50}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="pin">4-digit PIN</label>
                <input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                  autoComplete="current-password"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 tracking-widest"
                />
              </div>

              {slowServer && (
                <p className="text-sm text-muted-foreground">
                  Server sedang bangun dari tidur… harap tunggu ~30 detik ☕
                </p>
              )}

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign in / Register"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
