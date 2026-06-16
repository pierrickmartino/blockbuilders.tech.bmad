import Link from "next/link";
import { Blocks, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { LessonResponse, ModuleResponse } from "@/types/curriculum";

interface Props {
  lesson: LessonResponse;
  module: ModuleResponse;
}

export function LessonView({ lesson, module: mod }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background">
        <div className="container mx-auto flex max-w-6xl items-center px-4 py-4 md:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Blocks aria-hidden="true" className="h-5 w-5" />
            </div>
            <span className="text-base font-bold tracking-tight">
              Blockbuilders
            </span>
          </Link>
        </div>
      </header>

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
            <Button asChild className="shrink-0">
              <Link href="/login">Sign in to test</Link>
            </Button>
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
