import Link from "next/link";

interface InfoIconProps {
  glossaryId: string;
  className?: string;
}

export default function InfoIcon({
  glossaryId,
  className = "",
}: InfoIconProps) {
  return (
    <Link
      href={`/glossary#${glossaryId}`}
      className={`inline-flex items-center justify-center text-gray-400 transition-colors hover:text-blue-500 ${className}`}
      title="View in glossary"
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
    </Link>
  );
}
