import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  /** Lucide icon component or any React element rendered in the icon slot. */
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** Optional action element (e.g. a Button). Rendered below the description. */
  action?: React.ReactNode;
  /** When true the empty state is presented inside a Card. Default: true. */
  withCard?: boolean;
  className?: string;
}

/**
 * Reusable empty-state pattern used across dashboard, strategies, alerts,
 * and market pages. Accepts an icon, title, description, and optional action
 * slot so call sites stay semantically explicit while sharing the layout.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  withCard = true,
  className,
}: EmptyStateProps) {
  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center",
        !withCard && className
      )}
    >
      {icon && (
        <div
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10"
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <h3 className="mb-1 font-semibold">{title}</h3>
      {description && (
        <p className="mb-4 max-w-xs text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action}
    </div>
  );

  if (withCard) {
    return (
      <Card className={className}>
        <CardContent className="p-0">{content}</CardContent>
      </Card>
    );
  }

  return content;
}
