interface Props {
  value: string;
  onChange: (update: { name: string }) => void;
}

export function StepName({ value, onChange }: Props) {
  return (
    <div>
      <h3 className="mb-2 text-lg font-medium">Name your strategy</h3>
      <p className="mb-4 text-sm text-gray-600">
        Choose a descriptive name that helps you identify this strategy later.
      </p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="e.g., BTC MA Crossover Daily"
        className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        autoFocus
      />
    </div>
  );
}
