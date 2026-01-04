import { Input } from "@/components/ui/input";

interface Props {
  values: {
    useStopLoss: boolean;
    stopLossPercent?: number;
    useTakeProfit: boolean;
    takeProfitPercent?: number;
  };
  onChange: (update: Partial<Props["values"]>) => void;
}

export function StepRisk({ values, onChange }: Props) {
  return (
    <div>
      <h3 className="mb-2 text-lg font-medium">Risk controls (optional)</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Add stop loss and take profit levels to manage risk.
      </p>

      <div className="space-y-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={values.useStopLoss}
            onChange={(e) => onChange({ useStopLoss: e.target.checked })}
            className="mr-2"
          />
          <span className="font-medium">Use Stop Loss</span>
        </label>

        {values.useStopLoss && (
          <div className="ml-6">
            <label htmlFor="stopLoss" className="mb-2 block text-sm">
              Stop Loss %
            </label>
            <Input
              id="stopLoss"
              type="number"
              value={values.stopLossPercent || 5}
              onChange={(e) =>
                onChange({ stopLossPercent: parseFloat(e.target.value) })
              }
              step={0.5}
              min={0.1}
              max={100}
              className="w-32"
            />
          </div>
        )}

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={values.useTakeProfit}
            onChange={(e) => onChange({ useTakeProfit: e.target.checked })}
            className="mr-2"
          />
          <span className="font-medium">Use Take Profit</span>
        </label>

        {values.useTakeProfit && (
          <div className="ml-6">
            <label htmlFor="takeProfit" className="mb-2 block text-sm">
              Take Profit %
            </label>
            <Input
              id="takeProfit"
              type="number"
              value={values.takeProfitPercent || 10}
              onChange={(e) =>
                onChange({ takeProfitPercent: parseFloat(e.target.value) })
              }
              step={0.5}
              min={0.1}
              max={1000}
              className="w-32"
            />
          </div>
        )}
      </div>
    </div>
  );
}
