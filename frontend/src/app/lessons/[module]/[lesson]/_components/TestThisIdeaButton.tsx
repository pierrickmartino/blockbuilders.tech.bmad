"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth";
import { useTestThisIdea } from "@/hooks/useTestThisIdea";

interface Props {
  templateId: string | null;
}

export function TestThisIdeaButton({ templateId }: Props) {
  const { user } = useAuth();
  const { trigger, isLoading, error } = useTestThisIdea({
    templateId,
    userId: user?.id,
  });

  if (!user || !templateId) {
    return (
      <Button asChild className="shrink-0">
        <Link href="/login">Sign in to test</Link>
      </Button>
    );
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <Button onClick={() => void trigger()} disabled={isLoading} className="shrink-0">
        {isLoading ? "Starting…" : "Test this idea"}
      </Button>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
