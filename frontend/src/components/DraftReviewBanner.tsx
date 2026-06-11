import { Sparkles } from "lucide-react";

interface DraftReviewBannerProps {
  visible: boolean;
}

/**
 * Non-committal canvas banner shown while an NL-wedge draft is under review
 * (ADR-0012). UI-only signal — no persisted status (ADR-0005).
 */
export function DraftReviewBanner({ visible }: DraftReviewBannerProps) {
  if (!visible) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary dark:bg-primary/10 sm:px-8"
    >
      <Sparkles className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>AI draft — under review</span>
    </div>
  );
}
