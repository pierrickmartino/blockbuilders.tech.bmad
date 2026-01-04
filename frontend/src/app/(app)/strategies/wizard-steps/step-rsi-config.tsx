import { Input } from "@/components/ui/input";

interface Props {
  value: number;
  onChange: (update: { rsiPeriod: number }) => void;
}

export function StepRSIConfig({ value, onChange }: Props) {
  return (
    <div>
      <h3 className="mb-2 text-lg font-medium">Configure RSI</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Set the period for RSI calculation (typically 14).
      </p>

      <div>
        <label htmlFor="rsiPeriod" className="mb-2 block text-sm font-medium">
          RSI Period
        </label>
        <Input
          id="rsiPeriod"
          type="number"
          value={value}
          onChange={(e) => onChange({ rsiPeriod: parseInt(e.target.value, 10) })}
          min={2}
          max={100}
        />
      </div>
    </div>
  );
}
