import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ModuleResponse } from "@/types/curriculum";
import { LessonCard } from "../../_components/LessonCard";
import { LessonsHeader } from "../../_components/LessonsHeader";

interface Props {
  module: ModuleResponse;
}

export function ModuleView({ module: mod }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <LessonsHeader />

      <main className="container mx-auto max-w-4xl p-4 md:p-6">
        <div className="mb-6">
          <Link
            href="/lessons"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            aria-label="All lessons"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            All lessons
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">{mod.title}</h1>
          <p className="mt-2 text-muted-foreground">{mod.description}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mod.lessons.map((lesson) => (
            <LessonCard key={lesson.id} moduleId={mod.id} lesson={lesson} />
          ))}
        </div>
      </main>
    </div>
  );
}
