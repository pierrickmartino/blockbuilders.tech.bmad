import { ALLOWED_ASSETS, ALLOWED_TIMEFRAMES } from "@/types/strategy";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  values: { asset: string; timeframe: string };
  onChange: (update: Partial<Props["values"]>) => void;
}

export function StepAsset({ values, onChange }: Props) {
  return (
    <div>
      <h3 className="mb-2 text-lg font-medium">Select asset and timeframe</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Choose which asset to trade and the candle timeframe for analysis.
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="asset" className="mb-2 block text-sm font-medium">
            Asset
          </label>
          <Select
            value={values.asset}
            onValueChange={(value) => onChange({ asset: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select asset" />
            </SelectTrigger>
            <SelectContent>
              {ALLOWED_ASSETS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label
            htmlFor="timeframe"
            className="mb-2 block text-sm font-medium"
          >
            Timeframe
          </label>
          <Select
            value={values.timeframe}
            onValueChange={(value) => onChange({ timeframe: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              {ALLOWED_TIMEFRAMES.map((tf) => (
                <SelectItem key={tf} value={tf}>
                  {tf}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
