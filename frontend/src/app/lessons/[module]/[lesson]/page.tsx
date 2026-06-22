import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurriculumView } from "@/lib/curriculum/get-curriculum-view";
import { resolveLesson } from "@/lib/curriculum/resolve";
import { LessonView } from "./_components/LessonView";

interface Props {
  params: Promise<{ module: string; lesson: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { module: moduleId, lesson: lessonId } = await params;
  const resolved = resolveLesson(await getCurriculumView(), moduleId, lessonId);

  if (!resolved) {
    return { title: "Lesson not found — Blockbuilders" };
  }

  const { module: mod, lesson } = resolved;
  return {
    title: `${lesson.title} — ${mod.title} — Blockbuilders`,
    description: lesson.description,
    openGraph: {
      title: `${lesson.title} — Blockbuilders`,
      description: lesson.description,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${lesson.title} — Blockbuilders`,
      description: lesson.description,
    },
  };
}

export default async function LessonPage({ params }: Props) {
  const { module: moduleId, lesson: lessonId } = await params;
  const resolved = resolveLesson(await getCurriculumView(), moduleId, lessonId);

  if (!resolved) {
    notFound();
  }

  return <LessonView lesson={resolved.lesson} module={resolved.module} />;
}
