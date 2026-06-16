import type { Metadata } from "next";
import { getCurriculumView } from "@/lib/curriculum/get-curriculum-view";
import { LessonsCurriculumView } from "./_components/LessonsCurriculumView";

export const metadata: Metadata = {
  title: "Lessons — Blockbuilders",
  description:
    "Learn strategy literacy by testing real trading ideas. Work through guided lessons built on real backtested templates.",
  openGraph: {
    title: "Lessons — Blockbuilders",
    description:
      "Test real trading ideas. Understand what the results mean. Free, public lessons built on live backtests.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lessons — Blockbuilders",
    description:
      "Learn strategy literacy by testing real trading ideas on Blockbuilders.",
  },
};

export default async function LessonsPage() {
  const curriculum = await getCurriculumView();

  if (!curriculum) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <p className="text-muted-foreground">
          Lessons are temporarily unavailable. Please try again later.
        </p>
      </div>
    );
  }

  return <LessonsCurriculumView curriculum={curriculum} />;
}
