import { getCatalogueBlock } from "@/generated/blocks";
import { BlockType } from "@/types/canvas";

export interface ParamConfig {
  key: string;
  label: string;
  type: "number" | "select";
  defaultValue: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  help?: string;
  // Inspector Panel enhancements
  presets?: number[];        // Period preset values [14, 20, 50, 200]
  quickSwap?: boolean;       // Source quick-swap UI (close/prev_close)
  advanced?: boolean;        // Hidden under "Advanced" disclosure by default
}

function catalogueParamConfigs(blockType: BlockType): ParamConfig[] {
  const spec = getCatalogueBlock(blockType as string);
  if (!spec) return [];
  return spec.params.map((p) => {
    if (p.kind === "enum") {
      return {
        key: p.name,
        label: p.label,
        type: "select" as const,
        defaultValue: p.default,
        options: (p.options ?? []).map((v) => ({ value: v, label: v })),
      };
    }
    return {
      key: p.name,
      label: p.label,
      type: "number" as const,
      defaultValue: p.default,
      min: p.min,
      max: p.max,
    };
  });
}

export function getParamConfigs(blockType: BlockType): ParamConfig[] {
  switch (blockType) {
    // Risk blocks — not catalogue-managed; explicit configs required
    case "position_size":
      return [
        {
          key: "value",
          label: "Position Size (%)",
          type: "number",
          defaultValue: 5,
          min: 1,
          max: 100,
          help: "% of equity per trade",
        },
      ];
    case "take_profit":
      // Handled by custom renderTakeProfitLevels
      return [];
    case "stop_loss":
      return [
        {
          key: "stop_loss_pct",
          label: "Stop Loss (%)",
          type: "number",
          defaultValue: 5,
          min: 0.1,
          max: 100,
          step: 0.1,
          help: "Exit when loss reaches this %",
        },
      ];
    case "max_drawdown":
      return [
        {
          key: "max_drawdown_pct",
          label: "Max Drawdown (%)",
          type: "number",
          defaultValue: 10,
          min: 0.1,
          max: 100,
          step: 0.1,
          help: "Exit when equity drawdown exceeds this %",
        },
      ];
    case "time_exit":
      return [
        {
          key: "bars",
          label: "Bars in Trade",
          type: "number",
          defaultValue: 10,
          min: 1,
          max: 1000,
          step: 1,
          help: "Exit after N bars in position",
        },
      ];
    case "trailing_stop":
      return [
        {
          key: "trail_pct",
          label: "Trail (%)",
          type: "number",
          defaultValue: 5,
          min: 0.1,
          max: 100,
          step: 0.1,
          help: "Exit when price drops by % from highest close",
        },
      ];
    default:
      // All catalogue-managed blocks derive param configs from the catalogue spec
      return catalogueParamConfigs(blockType);
  }
}
