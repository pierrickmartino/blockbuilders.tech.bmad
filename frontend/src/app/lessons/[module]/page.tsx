import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurriculumView } from "@/lib/curriculum/get-curriculum-view";
import { ModuleView } from "./_components/ModuleView";

interface Props {
  params: Promise<{ module: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { module: moduleId } = await params;
  const curriculum = await getCurriculumView();
  const mod = curriculum?.modules.find((m) => m.id === moduleId);

  if (!mod) {
    return { title: "Module not found — Blockbuilders" };
  }

  return {
    title: `${mod.title} — Blockbuilders Lessons`,
    description: mod.description,
    openGraph: {
      title: `${mod.title} — Blockbuilders Lessons`,
      description: mod.description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${mod.title} — Blockbuilders Lessons`,
      description: mod.description,
    },
  };
}

export default async function ModulePage({ params }: Props) {
  const { module: moduleId } = await params;
  const curriculum = await getCurriculumView();
  const mod = curriculum?.modules.find((m) => m.id === moduleId);

  if (!mod) {
    notFound();
  }

  return <ModuleView module={mod} />;
}
