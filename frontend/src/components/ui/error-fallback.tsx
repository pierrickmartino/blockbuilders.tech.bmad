import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ErrorFallbackProps {
  /** The error object. Displays `error.message` when present. */
  error?: Error & { digest?: string };
  /** Called when the user clicks "Try again". */
  onRetry?: () => void;
  /** Override the default "Something went wrong" heading. */
  title?: string;
  /** Override the default subtitle copy. */
  description?: string;
  className?: string;
}

/**
 * Inline error fallback used across page-level error boundaries and
 * data-loading failure states. Consolidates the repeated
 * `<Card> … Something went wrong … <Button>` compound from multiple pages.
 *
 * For Next.js `error.tsx` route segments pass the `error` prop and use
 * `reset` as `onRetry`.
 */
export function ErrorFallback({
  error,
  onRetry,
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
  className,
}: ErrorFallbackProps) {
  return (
    <div className={cn("flex min-h-[400px] items-center justify-center p-4", className)}>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-destructive">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error?.message && (
            <p className="text-sm text-muted-foreground">{error.message}</p>
          )}
          <div className="flex gap-2">
            {onRetry && <Button onClick={onRetry}>Try again</Button>}
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </div>
          {error?.digest && (
            <p className="text-xs text-muted-foreground">
              Error ID: {error.digest}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
