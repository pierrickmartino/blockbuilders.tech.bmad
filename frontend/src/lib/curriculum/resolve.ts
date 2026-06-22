import type {
  CurriculumResponse,
  LessonResponse,
  ModuleResponse,
} from "@/types/curriculum";

/** Find a module by id within a fetched curriculum, or null. */
export function resolveModule(
  curriculum: CurriculumResponse | null,
  moduleId: string
): ModuleResponse | null {
  return curriculum?.modules.find((m) => m.id === moduleId) ?? null;
}

/** Find a module + lesson by id within a fetched curriculum, or null. */
export function resolveLesson(
  curriculum: CurriculumResponse | null,
  moduleId: string,
  lessonId: string
): { module: ModuleResponse; lesson: LessonResponse } | null {
  const mod = resolveModule(curriculum, moduleId);
  const lesson = mod?.lessons.find((l) => l.id === lessonId);
  return mod && lesson ? { module: mod, lesson } : null;
}
