import type { CurriculumResponse } from "@/types/curriculum";
import { LessonCard } from "./LessonCard";
import { LessonsHeader } from "./LessonsHeader";

interface Props {
  curriculum: CurriculumResponse;
}

export function LessonsCurriculumView({ curriculum }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <LessonsHeader />

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
                  <LessonCard key={lesson.id} moduleId={mod.id} lesson={lesson} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
