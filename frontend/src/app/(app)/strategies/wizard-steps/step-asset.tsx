import { ALLOWED_ASSETS, ALLOWED_TIMEFRAMES } from "@/types/strategy";

interface Props {
  values: { asset: string; timeframe: string };
  onChange: (update: Partial<Props["values"]>) => void;
}

export function StepAsset({ values, onChange }: Props) {
  return (
    <div>
      <h3 className="mb-2 text-lg font-medium">Select asset and timeframe</h3>
      <p className="mb-4 text-sm text-gray-600">
        Choose which asset to trade and the candle timeframe for analysis.
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="asset" className="mb-2 block text-sm font-medium">
            Asset
          </label>
          <select
            id="asset"
            value={values.asset}
            onChange={(e) => onChange({ asset: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {ALLOWED_ASSETS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="timeframe"
            className="mb-2 block text-sm font-medium"
          >
            Timeframe
          </label>
          <select
            id="timeframe"
            value={values.timeframe}
            onChange={(e) => onChange({ timeframe: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {ALLOWED_TIMEFRAMES.map((tf) => (
              <option key={tf} value={tf}>
                {tf}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
