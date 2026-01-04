import { Input } from "@/components/ui/input";

interface Props {
  value: string;
  onChange: (update: { name: string }) => void;
}

export function StepName({ value, onChange }: Props) {
  return (
    <div>
      <h3 className="mb-2 text-lg font-medium">Name your strategy</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Choose a descriptive name that helps you identify this strategy later.
      </p>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="e.g., BTC MA Crossover Daily"
        autoFocus
      />
    </div>
  );
}
