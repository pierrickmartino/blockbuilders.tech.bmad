"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Strategy, StrategyVersion, StrategyVersionDetail } from "@/types/strategy";
import { ValidationError } from "@/types/canvas";
import { formatDateTime, TimezoneMode } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronLeft,
  MoreVertical,
  Settings as SettingsIcon,
  Clock,
  Check as CheckIcon,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Pencil,
  X,
} from "lucide-react";
import { StrategyTabs } from "@/components/StrategyTabs";
import { cn } from "@/lib/utils";

interface StrategyHeaderProps {
  strategy: Strategy;
  strategyId: string;
  versions: StrategyVersion[];
  selectedVersion: StrategyVersionDetail | null;
  timezone: TimezoneMode;

  /** Name editing */
  editingName: boolean;
  nameInput: string;
  isSavingName: boolean;
  onEditingNameChange: (editing: boolean) => void;
  onNameChange: (value: string) => void;
  onNameSave: () => void;

  /** Draft autosave status indicator (issue #516) */
  draftStatus: "idle" | "saving" | "saved" | "error";
  lastSavedAt: Date | null;
  relativeTimestamp: string;

  /** Version history */
  onLoadVersion: (versionNumber: number) => void;

  /** Actions */
  isUpdatingAutoUpdate: boolean;
  onExport: () => void;
  onAutoUpdateToggle: (enabled: boolean) => void;
  onLookbackChange: (days: number) => void;
  onSettingsOpen: () => void;

  /** Inline alerts */
  error: string | null;
  validationErrors: ValidationError[];
  saveMessage: string | null;
  onErrorDismiss: () => void;
  onMessageDismiss: () => void;
  /** Invoked when the user clicks "Jump to error" with the first block_id. */
  onJumpToError: (blockId: string) => void;
}

export function StrategyHeader({
  strategy,
  strategyId,
  versions,
  selectedVersion,
  timezone,
  editingName,
  nameInput,
  isSavingName,
  onEditingNameChange,
  onNameChange,
  onNameSave,
  draftStatus,
  lastSavedAt,
  relativeTimestamp,
  onLoadVersion,
  isUpdatingAutoUpdate,
  onExport,
  onAutoUpdateToggle,
  onLookbackChange,
  onSettingsOpen,
  error,
  validationErrors,
  saveMessage,
  onErrorDismiss,
  onMessageDismiss,
  onJumpToError,
}: StrategyHeaderProps) {
  const [pendingLoadVersion, setPendingLoadVersion] = useState<number | null>(null);

  const hasDraft = lastSavedAt !== null || draftStatus === "saved" || draftStatus === "saving";

  function handleLoadVersionClick(versionNumber: number) {
    if (hasDraft) {
      setPendingLoadVersion(versionNumber);
    } else {
      onLoadVersion(versionNumber);
    }
  }

  function handleLoadVersionConfirm() {
    if (pendingLoadVersion !== null) {
      onLoadVersion(pendingLoadVersion);
      setPendingLoadVersion(null);
    }
  }

  return (
    <div className="flex-shrink-0 border-b bg-background px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        {/* Left: Back + Name + Badges */}
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/strategies"
            aria-label="Back to strategies"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring sm:h-8 sm:w-8"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </Link>

          {editingName ? (
            <div className="flex items-center gap-1">
              <Input
                type="text"
                value={nameInput}
                onChange={(e) => onNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onNameSave();
                  if (e.key === "Escape") {
                    onEditingNameChange(false);
                    onNameChange(strategy.name);
                  }
                }}
                className="h-9 min-w-[8rem] flex-1 text-sm font-semibold sm:h-8 sm:max-w-xs"
                autoFocus
              />
              <Button
                size="sm"
                className="h-9 px-3 sm:h-8"
                onClick={onNameSave}
                disabled={isSavingName}
              >
                {isSavingName ? "Saving…" : "Save"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-9 px-3 sm:h-8"
                onClick={() => {
                  onEditingNameChange(false);
                  onNameChange(strategy.name);
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <button
              className="group flex min-w-0 items-center gap-1 truncate rounded-md text-sm font-semibold text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring"
              onClick={() => onEditingNameChange(true)}
              aria-label={`Edit strategy name (current: ${strategy.name})`}
            >
              <span className="truncate">{strategy.name}</span>
              <Pencil
                className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60 group-focus-visible:opacity-60"
                aria-hidden="true"
              />
            </button>
          )}

          <Badge variant="secondary" className="hidden flex-shrink-0 sm:inline-flex">
            {strategy.asset}
          </Badge>
          <Badge variant="secondary" className="hidden flex-shrink-0 sm:inline-flex">
            {strategy.timeframe}
          </Badge>

          {/* Tags preview (compact) */}
          {strategy.tags && strategy.tags.length > 0 && (
            <div className="hidden items-center gap-1 lg:flex">
              {strategy.tags.slice(0, 2).map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="bg-primary/10 text-primary dark:bg-primary/20 text-xs"
                >
                  {tag.name}
                </Badge>
              ))}
              {strategy.tags.length > 2 && (
                <span className="text-xs text-muted-foreground">
                  +{strategy.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex flex-shrink-0 items-center gap-2">
          {/* Autosave status indicator */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
            {draftStatus === "saving" && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                <span>Saving…</span>
              </>
            )}
            {draftStatus === "saved" && lastSavedAt && (
              <>
                <CheckIcon className="h-3 w-3 text-primary" aria-hidden="true" />
                <span className="hidden sm:inline">
                  Saved • <span className="data-text">{relativeTimestamp}</span>
                </span>
                <span className="sm:hidden">Saved</span>
              </>
            )}
            {draftStatus === "error" && (
              <>
                <AlertCircle className="h-3 w-3 text-destructive" aria-hidden="true" />
                <span className="text-destructive">Save failed</span>
              </>
            )}
          </div>

          {/* Canvas health indicator */}
          {validationErrors.length > 0 && (
            <div className="flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-400">
              <AlertCircle className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
              <span>
                {validationErrors.length} error{validationErrors.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* History Sheet (mobile only) */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-2 focus-visible:ring-1 focus-visible:ring-focus-ring sm:h-8 lg:hidden"
                aria-label="Version history"
              >
                <Clock className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">History</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-full overflow-y-auto sm:w-[400px] sm:max-w-[400px]"
            >
              <SheetHeader>
                <SheetTitle>Version History</SheetTitle>
                <SheetDescription>Load previous strategy versions.</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-2">
                {versions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No saved versions yet.</p>
                ) : (
                  versions.map((v) => (
                    <div
                      key={v.id}
                      className={cn(
                        "flex items-center justify-between rounded-lg border p-3",
                        v.version_number === selectedVersion?.version_number &&
                          "border-primary bg-primary/5"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          Version{" "}
                          <span className="data-text">{v.version_number}</span>
                          {v.version_number === selectedVersion?.version_number && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                        <div className="data-text text-xs text-muted-foreground">
                          {formatDateTime(v.created_at, timezone)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {v.version_number !== selectedVersion?.version_number && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8"
                            onClick={() => handleLoadVersionClick(v.version_number)}
                          >
                            Load
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* More actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-2 focus-visible:ring-1 focus-visible:ring-focus-ring sm:h-8"
                aria-label="More actions"
              >
                <MoreVertical className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onExport}>Export JSON</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onAutoUpdateToggle(!strategy.auto_update_enabled)}
                disabled={isUpdatingAutoUpdate}
              >
                {strategy.auto_update_enabled
                  ? `Disable Strategy Monitor (${strategy.auto_update_lookback_days}d)`
                  : "Enable Strategy Monitor"}
              </DropdownMenuItem>
              {strategy.auto_update_enabled && (
                <>
                  <DropdownMenuItem
                    onClick={() => onLookbackChange(90)}
                    disabled={isUpdatingAutoUpdate}
                  >
                    <span className="flex-1">Lookback: 90 days</span>
                    {strategy.auto_update_lookback_days === 90 && (
                      <CheckIcon
                        className="ml-2 h-4 w-4 text-primary"
                        aria-label="Selected"
                      />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onLookbackChange(180)}
                    disabled={isUpdatingAutoUpdate}
                  >
                    <span className="flex-1">Lookback: 180 days</span>
                    {strategy.auto_update_lookback_days === 180 && (
                      <CheckIcon
                        className="ml-2 h-4 w-4 text-primary"
                        aria-label="Selected"
                      />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onLookbackChange(365)}
                    disabled={isUpdatingAutoUpdate}
                  >
                    <span className="flex-1">Lookback: 365 days</span>
                    {strategy.auto_update_lookback_days === 365 && (
                      <CheckIcon
                        className="ml-2 h-4 w-4 text-primary"
                        aria-label="Selected"
                      />
                    )}
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator className="lg:hidden" />
              <DropdownMenuItem
                onClick={onSettingsOpen}
                className="lg:hidden"
              >
                Settings...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings gear icon (desktop only) */}
          <Button
            variant="outline"
            size="sm"
            className="hidden h-8 px-2 focus-visible:ring-1 focus-visible:ring-focus-ring lg:inline-flex"
            onClick={onSettingsOpen}
            aria-label="Strategy settings"
          >
            <SettingsIcon className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Tabs row */}
      <div className="mt-1 flex items-center gap-2">
        <StrategyTabs strategyId={strategyId} activeTab="build" />
      </div>

      {/* Compact error/success messages — Signal design system `alert` spec */}
      {error && (
        <div
          role="alert"
          className="mt-1 flex items-center gap-2.5 rounded border border-destructive/20 bg-destructive/[0.03] px-3.5 py-2.5 text-[13px] font-medium text-destructive dark:border-destructive/30 dark:bg-destructive/10"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">{error}</span>
          {validationErrors.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 shrink-0 px-2 text-xs text-destructive hover:text-destructive/80"
              onClick={() => {
                const firstErrorBlockId = validationErrors.find((e) => e.block_id)?.block_id;
                if (firstErrorBlockId) onJumpToError(firstErrorBlockId);
              }}
            >
              Jump to error ({validationErrors.length})
            </Button>
          )}
          <button
            type="button"
            onClick={onErrorDismiss}
            className="shrink-0 rounded-sm p-0.5 text-destructive/60 hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring"
            aria-label="Dismiss error"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
      {saveMessage && (
        <div
          role="status"
          aria-live="polite"
          className="mt-1 flex items-center gap-2.5 rounded border border-success/20 bg-success/[0.03] px-3.5 py-2.5 text-[13px] font-medium text-success dark:border-success/30 dark:bg-success/10"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">{saveMessage}</span>
          <button
            type="button"
            onClick={onMessageDismiss}
            className="shrink-0 rounded-sm p-0.5 text-success/60 hover:text-success focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring"
            aria-label="Dismiss message"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Load version with draft — overwrite warning dialog */}
      <AlertDialog
        open={pendingLoadVersion !== null}
        onOpenChange={(open) => { if (!open) setPendingLoadVersion(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace unsaved draft?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved edits. Loading a different version will
              replace them. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLoadVersionConfirm}>
              Load version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
