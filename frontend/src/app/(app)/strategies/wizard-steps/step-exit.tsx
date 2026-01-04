import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  values: {
    signalType: string;
    exitRule: "opposite_signal" | "rsi_neutral";
  };
  onChange: (update: { exitRule: "opposite_signal" | "rsi_neutral" }) => void;
}

export function StepExit({ values, onChange }: Props) {
  const isMA = values.signalType === "ma_crossover";

  return (
    <div>
      <h3 className="mb-2 text-lg font-medium">Choose exit rule</h3>
      <p className="mb-4 text-sm text-muted-foreground">Decide when to exit positions.</p>

      <div className="space-y-3">
        <Card
          className={cn(
            "cursor-pointer transition-colors hover:bg-accent",
            values.exitRule === "opposite_signal" && "border-primary"
          )}
          onClick={() => onChange({ exitRule: "opposite_signal" })}
        >
          <CardContent className="flex items-start p-4">
            <input
              type="radio"
              checked={values.exitRule === "opposite_signal"}
              onChange={() => onChange({ exitRule: "opposite_signal" })}
              className="mr-3 mt-1"
            />
            <div>
              <div className="font-medium">Opposite Signal</div>
              <div className="text-sm text-muted-foreground">
                {isMA
                  ? "Exit when fast MA crosses below slow MA"
                  : "Exit when RSI rises above 70 (overbought)"}
              </div>
            </div>
          </CardContent>
        </Card>

        {!isMA && (
          <Card
            className={cn(
              "cursor-pointer transition-colors hover:bg-accent",
              values.exitRule === "rsi_neutral" && "border-primary"
            )}
            onClick={() => onChange({ exitRule: "rsi_neutral" })}
          >
            <CardContent className="flex items-start p-4">
              <input
                type="radio"
                checked={values.exitRule === "rsi_neutral"}
                onChange={() => onChange({ exitRule: "rsi_neutral" })}
                className="mr-3 mt-1"
              />
              <div>
                <div className="font-medium">RSI Neutral</div>
                <div className="text-sm text-muted-foreground">
                  Exit when RSI returns above 50 (neutral zone)
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
