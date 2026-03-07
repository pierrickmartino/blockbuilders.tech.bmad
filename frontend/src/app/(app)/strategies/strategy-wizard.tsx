"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/context/auth";
import type { Strategy } from "@/types/strategy";
import type { BacktestCreateResponse, BacktestStatusResponse } from "@/types/backtest";
import { generateTemplate, type WizardAnswers } from "./wizard-template-generator";
import { StepName } from "./wizard-steps/step-name";
import { StepAsset } from "./wizard-steps/step-asset";
import { StepSignal } from "./wizard-steps/step-signal";
import { StepMAConfig } from "./wizard-steps/step-ma-config";
import { StepRSIConfig } from "./wizard-steps/step-rsi-config";
import { StepExit } from "./wizard-steps/step-exit";
import { StepRisk } from "./wizard-steps/step-risk";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const LOADING_MESSAGES = [
  "Building your strategy...",
  "Running against 365 days of data...",
  "Calculating results...",
  "Almost there...",
];

type BacktestPhase = "idle" | "enqueuing" | "polling" | "done" | "error";

interface Props {
  isFirstRun?: boolean;
  onClose: () => void;
  onComplete: (strategyId: string) => void;
  onSkipToCanvas?: (strategyId: string) => void;
}

interface WizardState {
  step: number;
  answers: WizardAnswers & {
    name: string;
    asset: string;
    timeframe: string;
  };
}

export function StrategyWizard({ isFirstRun, onClose, onComplete, onSkipToCanvas }: Props) {
  const { user, refreshUser } = useAuth();
  const [state, setState] = useState<WizardState>({
    step: 1,
    answers: {
      name: "",
      asset: "BTC/USDT",
      timeframe: "1d",
      signalType: "sma_crossover",
      maType: "sma",
      maFastPeriod: 10,
      maSlowPeriod: 30,
      rsiPeriod: 14,
      exitRule: "opposite_signal",
      useStopLoss: true,
      stopLossPercent: 5,
      useTakeProfit: true,
      takeProfitPercent: 10,
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkippingToCanvas, setIsSkippingToCanvas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backtestPhase, setBacktestPhase] = useState<BacktestPhase>("idle");
  const backtestPhaseRef = useRef<BacktestPhase>("idle");
  const [savedStrategyId, setSavedStrategyId] = useState<string | null>(null);
  const [loadingMessageIdx, setLoadingMessageIdx] = useState(0);

  const updateBacktestPhase = (phase: BacktestPhase) => {
    backtestPhaseRef.current = phase;
    setBacktestPhase(phase);
  };

  useEffect(() => {
    trackEvent("wizard_started", undefined, user?.id);
    if (isFirstRun) {
      trackEvent("wizard_first_run_started", undefined, user?.id);
    }
  }, [user?.id, isFirstRun]);

  // Rotate loading messages during auto-backtest
  useEffect(() => {
    if (backtestPhase === "idle" || backtestPhase === "done" || backtestPhase === "error") return;
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      if (elapsed > 25000) {
        setLoadingMessageIdx(3); // "Almost there..."
      } else {
        setLoadingMessageIdx((prev) => (prev + 1) % 3);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [backtestPhase]);

  const totalSteps = 6;

  const updateAnswers = (
    partial: Partial<WizardState["answers"]>
  ) => {
    setState((s) => ({ ...s, answers: { ...s.answers, ...partial } }));
  };

  const isStepValid = useMemo(() => {
    if (state.step === 1) {
      return state.answers.name.trim() !== "";
    }
    if (
      state.step === 4 &&
      (state.answers.signalType === "sma_crossover" ||
        state.answers.signalType === "ema_crossover")
    ) {
      return (
        (state.answers.maFastPeriod || 10) < (state.answers.maSlowPeriod || 30)
      );
    }
    return true;
  }, [state]);

  const handleNext = () => {
    if (isSkippingToCanvas) return;
    if (state.step === totalSteps) {
      handleComplete();
    } else {
      setState((s) => ({ ...s, step: s.step + 1 }));
    }
  };

  const handleBack = () => {
    if (isSkippingToCanvas) return;
    setState((s) => ({ ...s, step: Math.max(1, s.step - 1) }));
  };

  const handleSkipToCanvas = async () => {
    setIsSkippingToCanvas(true);
    setError(null);
    try {
      const strategy = await apiFetch<Strategy>("/strategies/", {
        method: "POST",
        body: JSON.stringify({
          name: "Untitled Strategy",
          asset: "BTC/USDT",
          timeframe: "1d",
        }),
      });
      trackEvent("wizard_skipped", {
        step: state.step,
        entry_point: "first_run",
      }, user?.id);
      try {
        await apiFetch("/users/me/complete-onboarding", { method: "POST" });
        await refreshUser();
      } catch {
        // Non-blocking: still navigate to canvas
      }
      onSkipToCanvas!(strategy.id);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError(
          "You've reached the maximum number of strategies. Archive some existing strategies to create new ones."
        );
      } else {
        setError(
          "We couldn't create a blank strategy. Please try again, or continue with the wizard."
        );
      }
      setIsSkippingToCanvas(false);
    }
  };

  const handleComplete = async () => {
    if (isSkippingToCanvas) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const definition = generateTemplate(state.answers);

      // Create strategy
      const strategy = await apiFetch<Strategy>("/strategies/", {
        method: "POST",
        body: JSON.stringify({
          name: state.answers.name.trim(),
          asset: state.answers.asset,
          timeframe: state.answers.timeframe,
        }),
      });

      // Save first version with generated definition
      await apiFetch(`/strategies/${strategy.id}/versions`, {
        method: "POST",
        body: JSON.stringify({ definition }),
      });

      trackEvent("strategy_created", {
        asset: state.answers.asset,
        timeframe: state.answers.timeframe,
        source: "wizard",
      }, user?.id);

      // Non-first-run: existing behavior
      if (!isFirstRun) {
        onComplete(strategy.id);
        return;
      }

      // First-run: auto-enqueue backtest
      setSavedStrategyId(strategy.id);
      updateBacktestPhase("enqueuing");

      const now = new Date();
      const yearAgo = new Date(now);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);

      const res = await apiFetch<BacktestCreateResponse>("/backtests/", {
        method: "POST",
        body: JSON.stringify({
          strategy_id: strategy.id,
          date_from: yearAgo.toISOString(),
          date_to: now.toISOString(),
        }),
      });

      trackEvent("auto_backtest_started", {
        strategy_id: strategy.id,
        run_id: res.run_id,
        source: "wizard_first_run",
      }, user?.id);

      updateBacktestPhase("polling");

      // Poll for completion (max 5 min at 5s intervals)
      const maxAttempts = 60;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        const detail = await apiFetch<BacktestStatusResponse>(
          `/backtests/${res.run_id}`
        );
        if (detail.status === "completed") {
          updateBacktestPhase("done");
          trackEvent("auto_backtest_completed", {
            strategy_id: strategy.id,
            run_id: res.run_id,
          }, user?.id);
          // Mark onboarding complete (non-critical)
          try {
            await apiFetch("/users/me/complete-onboarding", { method: "POST" });
            await refreshUser();
          } catch {
            // Don't block navigation
          }
          onComplete(strategy.id);
          return;
        }
        if (detail.status === "failed") {
          updateBacktestPhase("error");
          setError(
            detail.error_message ||
            "The backtest could not complete. You can try again from the strategy page."
          );
          setIsSubmitting(false);
          return;
        }
      }
      // Timeout
      updateBacktestPhase("error");
      setError(
        "The backtest is taking longer than expected. You can check results from the strategy page."
      );
      setIsSubmitting(false);
    } catch (err) {
      if (backtestPhaseRef.current !== "idle") {
        // Strategy saved but backtest enqueue failed
        updateBacktestPhase("error");
        setError(
          "Your strategy was saved, but we couldn't start the backtest. You can run it from the strategy page."
        );
        setIsSubmitting(false);
        return;
      }
      if (err instanceof ApiError && err.status === 403) {
        setError(
          "You've reached the maximum number of strategies. Archive some existing strategies to create new ones."
        );
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to create strategy"
        );
      }
    } finally {
      if (backtestPhaseRef.current === "idle") {
        setIsSubmitting(false);
      }
    }
  };

  const renderStep = () => {
    switch (state.step) {
      case 1:
        return (
          <StepName value={state.answers.name} onChange={updateAnswers} />
        );
      case 2:
        return (
          <StepAsset
            values={{
              asset: state.answers.asset,
              timeframe: state.answers.timeframe,
            }}
            onChange={updateAnswers}
          />
        );
      case 3:
        return (
          <StepSignal
            value={state.answers.signalType}
            onChange={updateAnswers}
          />
        );
      case 4:
        if (
          state.answers.signalType === "sma_crossover" ||
          state.answers.signalType === "ema_crossover"
        ) {
          return (
            <StepMAConfig
              values={{
                maType:
                  state.answers.signalType === "sma_crossover" ? "sma" : "ema",
                maFastPeriod: state.answers.maFastPeriod,
                maSlowPeriod: state.answers.maSlowPeriod,
              }}
              onChange={updateAnswers}
            />
          );
        }
        if (state.answers.signalType === "rsi_reversion") {
          return (
            <StepRSIConfig
              value={state.answers.rsiPeriod || 14}
              onChange={updateAnswers}
            />
          );
        }
        // Bollinger / MACD: show standard defaults
        return (
          <div>
            <h3 className="mb-2 text-lg font-medium">Configuration</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {state.answers.signalType === "bollinger_breakout"
                ? "Bollinger Bands will use standard settings: 20-period with 2 standard deviations."
                : "MACD will use standard settings: fast 12, slow 26, signal 9."}
            </p>
            <p className="text-sm text-muted-foreground">
              You can fine-tune these after the wizard in the strategy canvas.
            </p>
          </div>
        );
      case 5:
        return (
          <StepExit
            values={{
              signalType: state.answers.signalType,
              exitRule: state.answers.exitRule,
            }}
            onChange={updateAnswers}
          />
        );
      case 6:
        return (
          <StepRisk
            values={{
              useStopLoss: state.answers.useStopLoss,
              stopLossPercent: state.answers.stopLossPercent,
              useTakeProfit: state.answers.useTakeProfit,
              takeProfitPercent: state.answers.takeProfitPercent,
            }}
            onChange={updateAnswers}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && backtestPhase === "idle" && onClose()}>
      <DialogContent className="max-h-[85vh] w-full overflow-y-auto sm:max-w-xl md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Strategy Wizard</DialogTitle>
          <div className="flex gap-1 pt-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded ${
                  i < state.step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <div className="text-xs text-muted-foreground">
            Step {state.step} of {totalSteps}
          </div>
        </DialogHeader>

        {/* Error message */}
        {error && (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            {error}
            {backtestPhase === "error" && savedStrategyId && (
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onComplete(savedStrategyId)}
                >
                  Go to Strategy
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Loading state during auto-backtest */}
        {isFirstRun && backtestPhase !== "idle" && backtestPhase !== "error" ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
            <p className="text-sm font-medium">
              {LOADING_MESSAGES[loadingMessageIdx]}
            </p>
          </div>
        ) : (
          <div className="py-4">{renderStep()}</div>
        )}

        {isFirstRun && onSkipToCanvas && backtestPhase === "idle" && (
          <div className="text-center">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              disabled={isSkippingToCanvas || isSubmitting}
              onClick={handleSkipToCanvas}
            >
              {isSkippingToCanvas ? "Creating blank strategy..." : "I want to build manually"}
            </button>
          </div>
        )}

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={state.step === 1 || backtestPhase !== "idle" || isSkippingToCanvas}
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!isStepValid || isSubmitting || isSkippingToCanvas}
          >
            {isSubmitting
              ? (isFirstRun && backtestPhase !== "idle"
                  ? LOADING_MESSAGES[loadingMessageIdx]
                  : "Creating...")
              : state.step === totalSteps
                ? (isFirstRun ? "See how it would have performed" : "Create Strategy")
                : "Next"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
