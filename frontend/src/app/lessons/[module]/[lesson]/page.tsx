import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurriculumView } from "@/lib/curriculum/get-curriculum-view";
import { LessonView } from "./_components/LessonView";

interface Props {
  params: Promise<{ module: string; lesson: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { module: moduleId, lesson: lessonId } = await params;
  const curriculum = await getCurriculumView();
  const mod = curriculum?.modules.find((m) => m.id === moduleId);
  const lesson = mod?.lessons.find((l) => l.id === lessonId);

  if (!mod || !lesson) {
    return { title: "Lesson not found — Blockbuilders" };
  }

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
  const curriculum = await getCurriculumView();
  const mod = curriculum?.modules.find((m) => m.id === moduleId);
  const lesson = mod?.lessons.find((l) => l.id === lessonId);

  if (!mod || !lesson) {
    notFound();
  }

  return <LessonView lesson={lesson} module={mod} />;
}
