import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  value: "ma_crossover" | "rsi_reversion";
  onChange: (update: { signalType: Props["value"] }) => void;
}

export function StepSignal({ value, onChange }: Props) {
  return (
    <div>
      <h3 className="mb-2 text-lg font-medium">Choose signal type</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Select the type of trading signal to use.
      </p>

      <div className="space-y-3">
        <Card
          className={cn(
            "cursor-pointer transition-colors hover:bg-accent",
            value === "ma_crossover" && "border-primary"
          )}
          onClick={() => onChange({ signalType: "ma_crossover" })}
        >
          <CardContent className="flex items-start p-4">
            <input
              type="radio"
              checked={value === "ma_crossover"}
              onChange={() => onChange({ signalType: "ma_crossover" })}
              className="mr-3 mt-1"
            />
            <div>
              <div className="font-medium">Moving Average Crossover</div>
              <div className="text-sm text-muted-foreground">
                Enter when fast MA crosses above slow MA, exit when it crosses
                below.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-colors hover:bg-accent",
            value === "rsi_reversion" && "border-primary"
          )}
          onClick={() => onChange({ signalType: "rsi_reversion" })}
        >
          <CardContent className="flex items-start p-4">
            <input
              type="radio"
              checked={value === "rsi_reversion"}
              onChange={() => onChange({ signalType: "rsi_reversion" })}
              className="mr-3 mt-1"
            />
            <div>
              <div className="font-medium">RSI Mean Reversion</div>
              <div className="text-sm text-muted-foreground">
                Enter when RSI drops below 30 (oversold), exit when it rises
                above neutral.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
