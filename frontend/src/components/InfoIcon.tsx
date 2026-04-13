import type { TooltipContent as TooltipContentType } from "@/lib/tooltip-content";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InfoIconProps {
  tooltip?: TooltipContentType;
  className?: string;
}

export default function InfoIcon({ tooltip, className = "" }: InfoIconProps) {
  if (!tooltip?.short && !tooltip?.long) return null;

  const label = tooltip.short || tooltip.long!;
  const body = tooltip.long || tooltip.short!;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className={`inline-flex items-center justify-center rounded-full text-[1rem] text-muted-foreground transition-colors duration-150 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${className}`}
          >
            <svg
              aria-hidden="true"
              className="h-[1em] w-[1em]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <path
                strokeWidth="2"
                d="M12 16v-4M12 8h.01"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs leading-snug">
          {body}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
