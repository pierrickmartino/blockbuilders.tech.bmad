interface Props {
  value: number;
  onChange: (update: { rsiPeriod: number }) => void;
}

export function StepRSIConfig({ value, onChange }: Props) {
  return (
    <div>
      <h3 className="mb-2 text-lg font-medium">Configure RSI</h3>
      <p className="mb-4 text-sm text-gray-600">
        Set the period for RSI calculation (typically 14).
      </p>

      <div>
        <label htmlFor="rsiPeriod" className="mb-2 block text-sm font-medium">
          RSI Period
        </label>
        <input
          id="rsiPeriod"
          type="number"
          value={value}
          onChange={(e) => onChange({ rsiPeriod: parseInt(e.target.value, 10) })}
          min="2"
          max="100"
          className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}
