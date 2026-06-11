import { Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DraftReviewControlsProps {
  onAccept: () => void;
  onEdit: () => void;
}

/**
 * Result-page disposition controls for an NL-wedge draft under review
 * (ADR-0012). Accept keeps the strategy and unlocks sharing; Edit keeps the
 * strategy and routes to the canvas as an ordinary working copy.
 */
export function DraftReviewControls({ onAccept, onEdit }: DraftReviewControlsProps) {
  return (
    <div className="flex flex-col gap-3 rounded border border-primary/20 bg-primary/5 px-4 py-4 dark:bg-primary/10 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div>
        <p className="text-sm font-semibold">AI draft — review this result</p>
        <p className="text-xs text-muted-foreground">
          Keep this strategy and unlock sharing, or refine it on the canvas.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          Edit
        </Button>
        <Button size="sm" onClick={onAccept} className="gap-2">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Accept
        </Button>
      </div>
    </div>
  );
}
