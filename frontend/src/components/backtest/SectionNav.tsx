"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface SectionNavItem {
  id: string;
  label: string;
}

interface SectionNavProps {
  sections: SectionNavItem[];
  className?: string;
}

export function SectionNav({ sections, className }: SectionNavProps) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? "");
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (sections.length === 0) return;

    const elements = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const visibility = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibility.set(entry.target.id, entry.intersectionRatio);
        }
        let bestId = active;
        let bestRatio = -1;
        for (const s of sections) {
          const ratio = visibility.get(s.id) ?? 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = s.id;
          }
        }
        if (bestRatio > 0 && bestId !== active) setActive(bestId);
      },
      {
        // Bias detection toward the upper portion of the viewport so the
        // "active" section matches what the user is reading, not what's
        // about to leave from the bottom.
        rootMargin: "-20% 0px -60% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [sections, active]);

  const handleClick = (id: string) => (event: React.MouseEvent) => {
    event.preventDefault();
    const target = document.getElementById(id);
    if (!target) return;
    setActive(id);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (sections.length === 0) return null;

  return (
    <nav
      ref={navRef}
      aria-label="Backtest sections"
      className={cn(
        "sticky top-0 z-20 -mx-4 border-b border-border bg-background px-4 py-2 sm:-mx-8 sm:px-8",
        className
      )}
    >
      <ul className="flex items-center gap-1 overflow-x-auto">
        {sections.map((section) => {
          const isActive = active === section.id;
          return (
            <li key={section.id} className="shrink-0">
              <a
                href={`#${section.id}`}
                onClick={handleClick(section.id)}
                aria-current={isActive ? "location" : undefined}
                className={cn(
                  "inline-flex items-center rounded px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {section.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
