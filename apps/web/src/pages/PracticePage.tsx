import { Dumbbell, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PracticePage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge variant="secondary">Coming soon</Badge>
        <h1 className="font-serif text-4xl font-semibold">Practice</h1>
        <p className="max-w-2xl text-muted-foreground">
          Mixed drills pulling from every module you've studied. Designed for
          spaced repetition — short bursts that keep what you learned alive.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <Dumbbell className="h-6 w-6 text-accent" />
            <CardTitle className="text-xl">Quick Drill</CardTitle>
            <CardDescription>
              5-minute warm-up of 10 mixed exercises across completed modules.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Sparkles className="h-6 w-6 text-accent" />
            <CardTitle className="text-xl">Weak Spots</CardTitle>
            <CardDescription>
              Re-attempts of questions you got wrong, sorted by frequency.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Built from your attempt history.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
