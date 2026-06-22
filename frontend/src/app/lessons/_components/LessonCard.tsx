import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LessonResponse } from "@/types/curriculum";

interface LessonCardProps {
  moduleId: string;
  lesson: LessonResponse;
}

/** Grid card linking into a single lesson, shared by the module and index pages. */
export function LessonCard({ moduleId, lesson }: LessonCardProps) {
  return (
    <Link href={`/lessons/${moduleId}/${lesson.id}`} aria-label={lesson.title}>
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
          <p className="text-xs text-muted-foreground">{lesson.description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
