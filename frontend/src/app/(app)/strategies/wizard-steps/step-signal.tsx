import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  WIZARD_ESSENTIAL_OPTIONS,
  type SignalType,
} from "../wizard-template-generator";

interface Props {
  value: SignalType;
  onChange: (update: { signalType: SignalType }) => void;
}

export function StepSignal({ value, onChange }: Props) {
  return (
    <div>
      <h3 className="mb-2 text-lg font-medium">Choose signal type</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Select the type of trading signal to use.
      </p>

      <div className="space-y-3">
        {WIZARD_ESSENTIAL_OPTIONS.map((option) => (
          <Card
            key={option.value}
            className={cn(
              "cursor-pointer transition-colors hover:bg-accent",
              value === option.value && "border-primary"
            )}
            onClick={() => onChange({ signalType: option.value })}
          >
            <CardContent className="flex items-start p-4">
              <input
                type="radio"
                checked={value === option.value}
                onChange={() => onChange({ signalType: option.value })}
                className="mr-3 mt-1"
              />
              <div>
                <div className="font-medium">{option.label}</div>
                <div className="text-sm text-muted-foreground">
                  {option.description}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
