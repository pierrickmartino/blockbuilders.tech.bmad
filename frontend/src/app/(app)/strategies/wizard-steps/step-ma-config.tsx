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
      <p className="mb-4 text-sm text-gray-600">
        Choose MA type and periods for fast/slow averages.
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="maType" className="mb-2 block text-sm font-medium">
            MA Type
          </label>
          <select
            id="maType"
            value={maType}
            onChange={(e) =>
              onChange({ maType: e.target.value as "sma" | "ema" })
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="sma">SMA (Simple Moving Average)</option>
            <option value="ema">EMA (Exponential Moving Average)</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="fastPeriod"
            className="mb-2 block text-sm font-medium"
          >
            Fast Period
          </label>
          <input
            id="fastPeriod"
            type="number"
            value={fastPeriod}
            onChange={(e) =>
              onChange({ maFastPeriod: parseInt(e.target.value, 10) })
            }
            min="2"
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="slowPeriod"
            className="mb-2 block text-sm font-medium"
          >
            Slow Period
          </label>
          <input
            id="slowPeriod"
            type="number"
            value={slowPeriod}
            onChange={(e) =>
              onChange({ maSlowPeriod: parseInt(e.target.value, 10) })
            }
            min="2"
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
