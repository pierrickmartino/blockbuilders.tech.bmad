import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle, X } from "lucide-react";

import { cn } from "@/lib/utils";

type PageAlertVariant = "error" | "success" | "warning" | "info";
type PageAlertMode = "banner" | "inline";

const VARIANT_STYLES: Record<
  PageAlertVariant,
  { container: string; icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }> }
> = {
  error: {
    container: "border-destructive/30 bg-destructive/5 text-destructive",
    icon: XCircle,
  },
  success: {
    container: "border-success/30 bg-success/10 text-success",
    icon: CheckCircle2,
  },
  warning: {
    container: "border-warning/30 bg-warning/10 text-warning",
    icon: AlertTriangle,
  },
  info: {
    container: "border-info/30 bg-info/5 text-info",
    icon: Info,
  },
};

export interface PageAlertProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  variant: PageAlertVariant;
  mode?: PageAlertMode;
  title?: React.ReactNode;
  icon?: React.ReactNode | false;
  action?: React.ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
}

export const PageAlert = React.forwardRef<HTMLDivElement, PageAlertProps>(
  (
    {
      variant,
      mode = "inline",
      title,
      icon,
      action,
      onDismiss,
      dismissLabel = "Dismiss",
      role,
      className,
      children,
      ...rest
    },
    ref,
  ) => {
    const styles = VARIANT_STYLES[variant];
    const DefaultIcon = styles.icon;
    const resolvedIcon =
      icon === false ? null : icon ?? <DefaultIcon aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />;

    const resolvedRole = role ?? (variant === "error" ? "alert" : "status");
    const ariaLive = resolvedRole === "alert" ? "assertive" : "polite";

    return (
      <div
        ref={ref}
        role={resolvedRole}
        aria-live={ariaLive}
        className={cn(
          "flex items-start gap-2 text-sm",
          styles.container,
          mode === "banner"
            ? "border-b px-4 py-2 sm:px-8"
            : "rounded border p-3",
          className,
        )}
        {...rest}
      >
        {resolvedIcon}
        <div className="min-w-0 flex-1">
          {title && (
            <div className="mb-1 flex items-center gap-1.5 text-sm font-medium">
              {title}
            </div>
          )}
          <div className={cn(title ? "text-foreground" : undefined)}>{children}</div>
        </div>
        {action && <div className="shrink-0 self-center">{action}</div>}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={dismissLabel}
            className="shrink-0 self-start rounded p-0.5 opacity-70 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  },
);
PageAlert.displayName = "PageAlert";
