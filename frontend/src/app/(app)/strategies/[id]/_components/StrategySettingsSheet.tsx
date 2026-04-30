"use client";

import React from "react";
import { Strategy, StrategyTag } from "@/types/strategy";
import { AlertRule } from "@/types/alert";
import { ExplanationResult } from "@/types/canvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";

interface StrategySettingsSheetProps {
  open: boolean;
  strategy: Strategy;
  explanation: ExplanationResult | null;
  nodeDisplayMode: "expanded" | "compact";
  availableTags: StrategyTag[];
  tagInput: string;
  isSavingTags: boolean;

  alertRule: AlertRule | null;
  alertEnabled: boolean;
  alertThreshold: number | null;
  alertOnEntry: boolean;
  alertOnExit: boolean;
  notifyEmail: boolean;
  alertError: string | null;
  isSavingAlert: boolean;
  isEditingAlert: boolean;

  onOpenChange: (open: boolean) => void;
  onNodeDisplayModeChange: (mode: "expanded" | "compact") => void;
  onCopyExplanation: () => void;
  onTagInputChange: (value: string) => void;
  onAddTag: (name: string) => void;
  onRemoveTag: (id: string) => void;
  onAlertSave: () => void;
  onAlertEditStart: () => void;
  onAlertEditCancel: () => void;
  onAlertEnabledChange: (enabled: boolean) => void;
  onAlertThresholdChange: (threshold: number | null) => void;
  onAlertOnEntryChange: (enabled: boolean) => void;
  onAlertOnExitChange: (enabled: boolean) => void;
  onNotifyEmailChange: (enabled: boolean) => void;
}

export function StrategySettingsSheet({
  open,
  strategy,
  explanation,
  nodeDisplayMode,
  availableTags,
  tagInput,
  isSavingTags,
  alertRule,
  alertEnabled,
  alertThreshold,
  alertOnEntry,
  alertOnExit,
  notifyEmail,
  alertError,
  isSavingAlert,
  isEditingAlert,
  onOpenChange,
  onNodeDisplayModeChange,
  onCopyExplanation,
  onTagInputChange,
  onAddTag,
  onRemoveTag,
  onAlertSave,
  onAlertEditStart,
  onAlertEditCancel,
  onAlertEnabledChange,
  onAlertThresholdChange,
  onAlertOnEntryChange,
  onAlertOnExitChange,
  onNotifyEmailChange,
}: StrategySettingsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:w-[400px] sm:max-w-[400px]">
        <SheetHeader>
          <SheetTitle>Strategy Settings</SheetTitle>
          <SheetDescription>
            Configure tags, alerts, and view strategy summary.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Canvas Mode Section */}
          <div>
            <h4 className="text-sm font-semibold">Canvas Mode</h4>
            <p className="text-xs text-muted-foreground">
              Choose how nodes are displayed on the canvas.
            </p>
            <div className="mt-3">
              <label htmlFor="canvas-mode" className="sr-only">
                Canvas display mode
              </label>
              <Select
                value={nodeDisplayMode}
                onValueChange={(v) =>
                  onNodeDisplayModeChange(v as "expanded" | "compact")
                }
              >
                <SelectTrigger id="canvas-mode" className="h-8 w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expanded">
                    Standard (Expanded by default)
                  </SelectItem>
                  <SelectItem value="compact">
                    Compact (Click to expand)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Strategy Summary */}
          {explanation && explanation.status === "valid" && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary">
                  Strategy Summary
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-primary"
                  onClick={onCopyExplanation}
                >
                  Copy
                </Button>
              </div>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <p>{explanation.entry}</p>
                <p>{explanation.exit}</p>
                {explanation.risk && <p>{explanation.risk}</p>}
              </div>
            </div>
          )}
          {explanation && explanation.status === "fallback" && (
            <div className="rounded-lg border bg-muted p-3 text-sm text-muted-foreground">
              {explanation.entry}
            </div>
          )}

          {/* Tags Section */}
          <div>
            <h4 className="text-sm font-semibold">Tags</h4>
            <p className="text-xs text-muted-foreground">
              Organize strategies with custom tags for filtering.
            </p>

            <div className="mt-3 space-y-3">
              {strategy.tags && strategy.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {strategy.tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className="bg-primary/10 text-primary dark:bg-primary/20"
                    >
                      {tag.name}
                      <button
                        onClick={() => onRemoveTag(tag.id)}
                        disabled={isSavingTags}
                        aria-label={`Remove tag ${tag.name}`}
                        className="ml-1 text-primary/70 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring disabled:opacity-50"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Add tag..."
                  value={tagInput}
                  onChange={(e) => onTagInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && tagInput.trim()) {
                      onAddTag(tagInput);
                    }
                  }}
                  disabled={
                    isSavingTags || (strategy?.tags?.length || 0) >= 20
                  }
                  className="h-8 flex-1"
                  list="available-tags"
                />
                <Button
                  size="sm"
                  className="h-8 bg-primary hover:bg-primary/90"
                  onClick={() => onAddTag(tagInput)}
                  disabled={
                    !tagInput.trim() ||
                    isSavingTags ||
                    (strategy?.tags?.length || 0) >= 20
                  }
                >
                  Add
                </Button>
              </div>

              <datalist id="available-tags">
                {availableTags.map((tag) => (
                  <option key={tag.id} value={tag.name} />
                ))}
              </datalist>

              {(strategy?.tags?.length || 0) >= 20 && (
                <p className="text-xs text-muted-foreground">
                  Maximum 20 tags per strategy.
                </p>
              )}
            </div>
          </div>

          {/* Performance Alerts Section */}
          <div>
            <h4 className="text-sm font-semibold">Performance Alerts</h4>
            <p className="text-xs text-muted-foreground">
              Get notified when your strategy performance changes significantly.
            </p>

            {isEditingAlert ? (
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="alert-enabled" className="text-sm">
                    Enable Alerts
                  </label>
                  <Checkbox
                    id="alert-enabled"
                    checked={alertEnabled}
                    onCheckedChange={(checked) =>
                      onAlertEnabledChange(checked === true)
                    }
                  />
                </div>

                {alertEnabled && (
                  <>
                    <div>
                      <label
                        htmlFor="alert-threshold"
                        className="text-sm"
                      >
                        Performance Drop Threshold (%)
                      </label>
                      <Input
                        id="alert-threshold"
                        type="number"
                        value={alertThreshold ?? ""}
                        onChange={(e) =>
                          onAlertThresholdChange(
                            e.target.value ? parseFloat(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 5 for 5% drop"
                        min="0.1"
                        max="100"
                        step="0.1"
                        className="mt-1 h-8"
                      />
                    </div>

                    <fieldset>
                      <legend className="text-sm">Alert Triggers</legend>
                      <div className="mt-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="alert-entry"
                            checked={alertOnEntry}
                            onCheckedChange={(checked) =>
                              onAlertOnEntryChange(checked === true)
                            }
                          />
                          <label htmlFor="alert-entry" className="text-sm">
                            Entry signal detected
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="alert-exit"
                            checked={alertOnExit}
                            onCheckedChange={(checked) =>
                              onAlertOnExitChange(checked === true)
                            }
                          />
                          <label htmlFor="alert-exit" className="text-sm">
                            Exit signal detected
                          </label>
                        </div>
                      </div>
                    </fieldset>

                    <div className="flex items-center justify-between">
                      <label htmlFor="notify-email" className="text-sm">
                        Email notifications
                      </label>
                      <Checkbox
                        id="notify-email"
                        checked={notifyEmail}
                        onCheckedChange={(checked) =>
                          onNotifyEmailChange(checked === true)
                        }
                      />
                    </div>
                  </>
                )}

                {alertError && (
                  <p className="text-xs text-destructive">{alertError}</p>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-9 sm:h-8"
                    onClick={onAlertSave}
                    disabled={isSavingAlert}
                  >
                    {isSavingAlert ? "Saving..." : "Save Alerts"}
                  </Button>
                  {alertRule && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 sm:h-8"
                      onClick={onAlertEditCancel}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <div className="text-sm">
                  <strong>Status:</strong>{" "}
                  {alertRule?.is_active ? "Enabled" : "Disabled"}
                </div>
                {alertRule?.is_active && (
                  <>
                    {alertRule.threshold_pct !== null && (
                      <div className="text-sm">
                        <strong>Threshold:</strong>{" "}
                        {alertRule.threshold_pct}% drop
                      </div>
                    )}
                    <div className="text-sm">
                      <strong>Triggers:</strong>{" "}
                      {alertRule.alert_on_entry && "Entry signal"}
                      {alertRule.alert_on_entry &&
                        alertRule.alert_on_exit &&
                        ", "}
                      {alertRule.alert_on_exit && "Exit signal"}
                    </div>
                    <div className="text-sm">
                      <strong>Email:</strong>{" "}
                      {alertRule.notify_email ? "Yes" : "No"}
                    </div>
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 sm:h-8"
                  onClick={onAlertEditStart}
                >
                  Edit Alerts
                </Button>
              </div>
            )}
          </div>

          {/* Strategy Monitor Status */}
          <div>
            <h4 className="text-sm font-semibold">Strategy Monitor</h4>
            <p className="text-xs text-muted-foreground mb-1">
              Automated daily re-testing of your strategy against the latest
              market data
            </p>
            <p className="text-sm text-muted-foreground">
              {strategy.auto_update_enabled
                ? `Enabled (${strategy.auto_update_lookback_days} days lookback)`
                : "Disabled"}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
