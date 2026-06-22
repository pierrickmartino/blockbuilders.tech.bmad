import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { LessonResponse, ModuleResponse } from "@/types/curriculum";
import { LessonsHeader } from "../../../_components/LessonsHeader";
import { TestThisIdeaButton } from "./TestThisIdeaButton";

interface Props {
  lesson: LessonResponse;
  module: ModuleResponse;
}

export function LessonView({ lesson, module: mod }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <LessonsHeader />

      <main className="container mx-auto max-w-3xl p-4 md:p-6">
        <div className="mb-6">
          <Link
            href={`/lessons/${mod.id}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            aria-label={mod.title}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            {mod.title}
          </Link>
        </div>

        <div className="mb-8 space-y-3">
          <div className="flex items-center gap-3">
            <Badge variant="outline">{lesson.difficulty}</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{lesson.title}</h1>
          <p className="text-muted-foreground">{lesson.description}</p>
        </div>

        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">
                Test this idea on real historical data
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Clone the{" "}
                <strong className="text-foreground">{lesson.template_name}</strong>{" "}
                template, run a backtest, and see the results live.
              </p>
            </div>
            <TestThisIdeaButton templateId={lesson.template_id} />
          </CardContent>
        </Card>

        <section className="rounded-lg border bg-surface-elevated p-5">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              What you&apos;ll discover:
            </span>{" "}
            Clone the template, run a real backtest, and see what the data
            says. No prior experience needed — the numbers do the teaching.
          </p>
        </section>
      </main>
    </div>
  );
}
