"use client";

import Link from "next/link";
import { CheckCircle2, Circle, BookOpen, Map } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TrackView as TrackViewType } from "@/types/track";

interface TrackViewProps {
  track: TrackViewType;
}

export function TrackView({ track }: TrackViewProps) {
  const overallPct = Math.round(track.percent_complete);

  return (
    <main className="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Map className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Literacy Track</h1>
          <p className="text-sm text-muted-foreground">
            {track.completed_lessons} of {track.total_lessons} lessons complete — {overallPct}%
          </p>
        </div>
        <Badge variant="secondary" className="ml-auto">
          {overallPct}%
        </Badge>
      </div>

      {/* Overall progress bar */}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={overallPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Overall track completion"
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${overallPct}%` }}
        />
      </div>

      {/* Modules */}
      <div className="space-y-6">
        {track.modules.map((module) => {
          const modulePct = Math.round(module.percent_complete);
          return (
            <Card key={module.id}>
              <CardHeader className="space-y-2 pb-3">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {module.title}
                  <Badge variant="outline" className="ml-auto text-xs">
                    {module.completed_count} / {module.total_count}
                  </Badge>
                </CardTitle>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={modulePct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${module.title} completion`}
                >
                  <div
                    className="h-full rounded-full bg-primary/70 transition-all"
                    style={{ width: `${modulePct}%` }}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {module.lessons.map((lesson) => {
                    const isResume = lesson.id === track.resume_lesson_id;
                    return (
                      <li
                        key={lesson.id}
                        data-testid={`lesson-${lesson.id}`}
                        data-completed={String(lesson.completed)}
                        data-resume={String(isResume)}
                      >
                        <Link
                          href={`/lessons/${module.id}/${lesson.id}`}
                          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted ${
                            isResume ? "ring-1 ring-primary/40" : ""
                          }`}
                        >
                          {lesson.completed ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-[hsl(var(--success))]" />
                          ) : (
                            <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <span
                            className={
                              lesson.completed
                                ? "font-medium"
                                : "text-muted-foreground"
                            }
                          >
                            {lesson.title}
                          </span>
                          {isResume && (
                            <Badge
                              variant="secondary"
                              className="ml-auto text-[10px]"
                            >
                              Resume
                            </Badge>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
