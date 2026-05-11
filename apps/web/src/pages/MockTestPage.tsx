import { Timer, FileCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function MockTestPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge variant="secondary">Coming soon</Badge>
        <h1 className="font-serif text-4xl font-semibold">Mock Test</h1>
        <p className="max-w-2xl text-muted-foreground">
          Timed full-section practice in TOEFL/IELTS format. Get a real feel for
          test pacing before you sit the exam.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <Timer className="h-6 w-6 text-accent" />
            <CardTitle className="text-xl">TOEFL Structure</CardTitle>
            <CardDescription>
              25-minute grammar block, mixed difficulty.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <FileCheck className="h-6 w-6 text-accent" />
            <CardTitle className="text-xl">IELTS Writing Task</CardTitle>
            <CardDescription>
              Translate Indonesian prompts into a 250-word English response.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
