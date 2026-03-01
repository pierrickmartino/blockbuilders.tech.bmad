import { Input } from "@/components/ui/input";

interface Props {
  values: {
    maType?: "sma" | "ema";
    maFastPeriod?: number;
    maSlowPeriod?: number;
  };
  onChange: (update: Partial<Props["values"]>) => void;
}

export function StepMAConfig({ values, onChange }: Props) {
  const maType = values.maType || "sma";
  const fastPeriod = values.maFastPeriod || 10;
  const slowPeriod = values.maSlowPeriod || 30;

  return (
    <div>
      <h3 className="mb-2 text-lg font-medium">Configure moving averages</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Set periods for fast and slow averages.
      </p>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">MA Type</label>
          <p className="text-sm text-muted-foreground">
            {maType === "sma"
              ? "Simple Moving Average (SMA)"
              : "Exponential Moving Average (EMA)"}
          </p>
        </div>

        <div>
          <label
            htmlFor="fastPeriod"
            className="mb-2 block text-sm font-medium"
          >
            Fast Period
          </label>
          <Input
            id="fastPeriod"
            type="number"
            value={fastPeriod}
            onChange={(e) =>
              onChange({ maFastPeriod: parseInt(e.target.value, 10) })
            }
            min={2}
          />
        </div>

        <div>
          <label
            htmlFor="slowPeriod"
            className="mb-2 block text-sm font-medium"
          >
            Slow Period
          </label>
          <Input
            id="slowPeriod"
            type="number"
            value={slowPeriod}
            onChange={(e) =>
              onChange({ maSlowPeriod: parseInt(e.target.value, 10) })
            }
            min={2}
          />
        </div>
      </div>
    </div>
  );
}
