import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StrategyEntryPath } from "@/types/strategy";

interface AiDraftedBadgeProps {
  entryPath: StrategyEntryPath | null | undefined;
  className?: string;
}

/**
 * Provenance badge for strategies born from the NL wedge (CONTEXT.md →
 * AI-drafted; ADR-0012). A pure projection of `entry_path = nl_wedge`:
 * marks origin, not current authorship, so it survives Edit.
 */
export function AiDraftedBadge({ entryPath, className }: AiDraftedBadgeProps) {
  if (entryPath !== "nl_wedge") return null;

  return (
    <Badge
      variant="outline"
      className={cn("gap-1 border-transparent bg-primary/10 text-primary dark:bg-primary/20", className)}
    >
      <Sparkles className="h-3 w-3" aria-hidden="true" />
      AI-drafted
    </Badge>
  );
}
