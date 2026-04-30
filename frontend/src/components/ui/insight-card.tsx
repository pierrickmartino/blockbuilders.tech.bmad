"use client";

import { useId, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface InsightCardProps {
  /** Icon element rendered inside the colored icon well. */
  icon: React.ReactNode;
  /** CSS classes applied to the icon well container (background, text color). */
  iconClassName?: string;
  /** Card heading, announced as an `<h2>` for screen readers. */
  title: string;
  /** Optional badge element rendered next to the title. */
  badge?: React.ReactNode;
  /** Main card body content. */
  children: React.ReactNode;
  /** Optional right-hand side content (dates, metadata). */
  aside?: React.ReactNode;
  /** When provided, renders a dismiss button; calls `onDismiss` after the
   *  exit transition completes. */
  onDismiss?: () => void;
  /** Dismiss button content (default: "Got it"). */
  dismissLabel?: React.ReactNode;
  /** Additional class names on the root element. */
  className?: string;
  /** When true, use a plain `<div>` root instead of a shadcn `<Card>`. */
  unstyled?: boolean;
  /** Forwarded ref for IntersectionObserver / analytics hooks. */
  cardRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * InsightCard — shared base for NarrativeCard and WhatYouLearnedCard.
 *
 * Provides a consistent icon + title + body layout with optional dismiss
 * animation. Both cards remain as thin wrappers that supply the
 * card-specific props and children.
 */
export function InsightCard({
  icon,
  iconClassName = "bg-primary/10 text-primary",
  title,
  badge,
  children,
  aside,
  onDismiss,
  dismissLabel,
  className,
  unstyled = false,
  cardRef,
}: InsightCardProps) {
  const [exiting, setExiting] = useState(false);
  const titleId = useId();

  const handleDismiss = () => setExiting(true);

  const inner = (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        unstyled && "transition-all duration-fast ease-default motion-reduce:transition-none",
        unstyled && (exiting ? "scale-95 opacity-0" : "scale-100 opacity-100"),
      )}
      onTransitionEnd={() => {
        if (exiting) onDismiss?.();
      }}
    >
      {/* Icon well */}
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          iconClassName,
        )}
        aria-hidden
      >
        {icon}
      </div>

      {/* Body */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2 id={titleId} className="text-[15px] font-semibold">
            {title}
          </h2>
          {badge}
        </div>
        {children}
      </div>

      {/* Aside (dates, metadata) */}
      {aside && (
        <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          {aside}
        </div>
      )}

      {/* Dismiss */}
      {onDismiss && (
        <button
          onClick={handleDismiss}
          className="flex min-h-[44px] flex-shrink-0 items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Dismiss"
        >
          {dismissLabel ?? "Got it"}
        </button>
      )}
    </div>
  );

  if (unstyled) {
    return (
      <div
        ref={cardRef}
        role="region"
        aria-labelledby={titleId}
        className={cn(
          "rounded-lg border border-dashed bg-white dark:bg-card",
          className,
        )}
      >
        {inner}
      </div>
    );
  }

  return (
    <Card
      ref={cardRef}
      role="region"
      aria-labelledby={titleId}
      className={className}
    >
      <CardContent className="p-0">{inner}</CardContent>
    </Card>
  );
}
