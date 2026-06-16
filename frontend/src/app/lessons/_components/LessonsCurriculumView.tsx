import Link from "next/link";
import { Blocks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CurriculumResponse } from "@/types/curriculum";

interface Props {
  curriculum: CurriculumResponse;
}

export function LessonsCurriculumView({ curriculum }: Props) {
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

      <main className="container mx-auto max-w-4xl p-4 md:p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            Learn Strategy Literacy
          </h1>
          <p className="mt-2 text-muted-foreground">
            Test real trading ideas. Understand what the results mean.
          </p>
        </div>

        <div className="space-y-10">
          {curriculum.modules.map((mod) => (
            <section key={mod.id}>
              <div className="mb-4">
                <h2 className="text-lg font-semibold tracking-tight">
                  {mod.title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {mod.description}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {mod.lessons.map((lesson) => (
                  <Link
                    key={lesson.id}
                    href={`/lessons/${mod.id}/${lesson.id}`}
                    aria-label={lesson.title}
                  >
                    <Card className="h-full transition-colors hover:border-primary/50">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-sm font-medium leading-snug">
                            {lesson.title}
                          </CardTitle>
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {lesson.difficulty}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground">
                          {lesson.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
