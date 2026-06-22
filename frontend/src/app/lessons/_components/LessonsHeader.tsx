import Link from "next/link";
import { Blocks } from "lucide-react";

/** Public branded header shared across the open-navigation lesson pages. */
export function LessonsHeader() {
  return (
    <header className="border-b border-border/60 bg-background">
      <div className="container mx-auto flex max-w-6xl items-center px-4 py-4 md:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Blocks aria-hidden="true" className="h-5 w-5" />
          </div>
          <span className="text-base font-bold tracking-tight">
            Blockbuilders
          </span>
        </Link>
      </div>
    </header>
  );
}
