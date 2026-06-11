import { Check, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DraftReviewControlsProps {
  onAccept: () => void;
  onEdit: () => void;
  onReject: () => void;
}

/**
 * Result-page disposition controls for an NL-wedge draft under review
 * (ADR-0012). Accept keeps the strategy and unlocks sharing; Edit keeps the
 * strategy and routes to the canvas as an ordinary working copy; Reject is a
 * single click that starts the deferred-delete grace window with an Undo
 * toast (ADR-0012 §7) — no pre-confirm dialog.
 */
export function DraftReviewControls({ onAccept, onEdit, onReject }: DraftReviewControlsProps) {
  return (
    <div className="flex flex-col gap-3 rounded border border-primary/20 bg-primary/5 px-4 py-4 dark:bg-primary/10 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div>
        <p className="text-sm font-semibold">AI draft — review this result</p>
        <p className="text-xs text-muted-foreground">
          Keep this strategy and unlock sharing, refine it on the canvas, or reject it.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onReject} className="gap-2 text-destructive hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Reject
        </Button>
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
