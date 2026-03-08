import { Block, Connection } from "./canvas";

export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  logic_summary: string;
  use_cases: string[];
  parameter_ranges: Record<string, string>;
  asset: string;
  timeframe: string;
  difficulty: string;
  sort_order: number;
  teaches_description: string | null;
  created_at: string;
}

export interface StrategyTemplateDetail extends StrategyTemplate {
  definition_json: {
    blocks: Block[];
    connections: Connection[];
    meta: Record<string, unknown>;
  };
}
