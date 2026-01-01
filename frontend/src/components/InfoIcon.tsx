import { TooltipContent } from "@/lib/tooltip-content";

interface InfoIconProps {
  tooltip?: TooltipContent;
  className?: string;
}

export default function InfoIcon({
  tooltip,
  className = "",
}: InfoIconProps) {
  const tooltipText = tooltip?.long || tooltip?.short || "More information";

  return (
    <span
      className={`inline-flex items-center justify-center text-gray-400 transition-colors hover:text-blue-500 ${className}`}
      title={tooltipText}
      aria-label={tooltipText}
    >
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="10" strokeWidth="2" />
        <path strokeWidth="2" d="M12 16v-4M12 8h.01" strokeLinecap="round" />
      </svg>
    </span>
  );
}
