"use client";

import { useState, useMemo } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { Strategy } from "@/types/strategy";
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

interface Props {
  onClose: () => void;
  onComplete: (strategyId: string) => void;
}

interface WizardState {
  step: number;
  answers: WizardAnswers & {
    name: string;
    asset: string;
    timeframe: string;
  };
}

export function StrategyWizard({ onClose, onComplete }: Props) {
  const [state, setState] = useState<WizardState>({
    step: 1,
    answers: {
      name: "",
      asset: "BTC/USDT",
      timeframe: "1d",
      signalType: "ma_crossover",
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
  const [error, setError] = useState<string | null>(null);

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
    if (state.step === 4 && state.answers.signalType === "ma_crossover") {
      return (
        (state.answers.maFastPeriod || 10) < (state.answers.maSlowPeriod || 30)
      );
    }
    return true;
  }, [state]);

  const handleNext = () => {
    if (state.step === totalSteps) {
      handleComplete();
    } else {
      setState((s) => ({ ...s, step: s.step + 1 }));
    }
  };

  const handleBack = () => {
    setState((s) => ({ ...s, step: Math.max(1, s.step - 1) }));
  };

  const handleComplete = async () => {
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

      onComplete(strategy.id);
    } catch (err) {
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
      setIsSubmitting(false);
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
        return state.answers.signalType === "ma_crossover" ? (
          <StepMAConfig
            values={{
              maType: state.answers.maType,
              maFastPeriod: state.answers.maFastPeriod,
              maSlowPeriod: state.answers.maSlowPeriod,
            }}
            onChange={updateAnswers}
          />
        ) : (
          <StepRSIConfig
            value={state.answers.rsiPeriod || 14}
            onChange={updateAnswers}
          />
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Step content */}
        <div className="py-4">{renderStep()}</div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={state.step === 1}
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!isStepValid || isSubmitting}
          >
            {isSubmitting
              ? "Creating..."
              : state.step === totalSteps
                ? "Create Strategy"
                : "Next"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
