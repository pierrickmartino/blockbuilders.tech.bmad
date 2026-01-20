import { StrategyDefinition } from "@/types/canvas";

export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  logic_summary: string;
  use_cases: string[];
  parameter_ranges: Record<string, string>;
  asset: string;
  timeframe: string;
  created_at: string;
}

export interface StrategyTemplateDetail extends StrategyTemplate {
  definition_json: StrategyDefinition;
}
