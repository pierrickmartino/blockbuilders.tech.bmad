import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface LoadingCardProps {
  /** Number of rows to render. Default: 4. */
  rows?: number;
  /** Show a header skeleton row above the content rows. Default: true. */
  withHeader?: boolean;
  /** Additional className applied to the outer Card. */
  className?: string;
}

/**
 * Reusable skeleton loading state composed from the `Skeleton` primitive.
 * Covers the common "loading a list of items inside a card" pattern seen
 * across dashboard, strategies, and alert pages.
 *
 * For full-page or bespoke skeletons compose `<Skeleton>` directly.
 */
export function LoadingCard({
  rows = 4,
  withHeader = true,
  className,
}: LoadingCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-3">
        {withHeader && (
          <div className="flex items-center justify-between border-b pb-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-20" />
          </div>
        )}
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-3 py-1">
            <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-12 shrink-0" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
