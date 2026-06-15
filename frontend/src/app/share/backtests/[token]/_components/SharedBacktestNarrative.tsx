import { BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface SharedBacktestNarrativeProps {
  narrative?: string | null;
}

/** Honest-result narrative prose on the public Shared backtest page (#675). */
export function SharedBacktestNarrative({
  narrative,
}: SharedBacktestNarrativeProps) {
  if (!narrative) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="mb-3 flex items-center gap-2 font-semibold tracking-tight">
          <BookOpen className="h-4 w-4 text-primary" aria-hidden />
          Summary
        </h2>
        <p className="text-sm text-muted-foreground">{narrative}</p>
      </CardContent>
    </Card>
  );
}
