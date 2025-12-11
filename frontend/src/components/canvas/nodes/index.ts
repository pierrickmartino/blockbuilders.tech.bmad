import PriceNode from "./PriceNode";
import VolumeNode from "./VolumeNode";
import SmaNode from "./SmaNode";
import EmaNode from "./EmaNode";
import RsiNode from "./RsiNode";
import MacdNode from "./MacdNode";
import BollingerNode from "./BollingerNode";
import AtrNode from "./AtrNode";
import CompareNode from "./CompareNode";
import CrossoverNode from "./CrossoverNode";
import AndNode from "./AndNode";
import OrNode from "./OrNode";
import NotNode from "./NotNode";
import EntrySignalNode from "./EntrySignalNode";
import ExitSignalNode from "./ExitSignalNode";
import PositionSizeNode from "./PositionSizeNode";
import TakeProfitNode from "./TakeProfitNode";
import StopLossNode from "./StopLossNode";

// Node types map for React Flow
export const nodeTypes = {
  price: PriceNode,
  volume: VolumeNode,
  sma: SmaNode,
  ema: EmaNode,
  rsi: RsiNode,
  macd: MacdNode,
  bollinger: BollingerNode,
  atr: AtrNode,
  compare: CompareNode,
  crossover: CrossoverNode,
  and: AndNode,
  or: OrNode,
  not: NotNode,
  entry_signal: EntrySignalNode,
  exit_signal: ExitSignalNode,
  position_size: PositionSizeNode,
  take_profit: TakeProfitNode,
  stop_loss: StopLossNode,
};

export {
  PriceNode,
  VolumeNode,
  SmaNode,
  EmaNode,
  RsiNode,
  MacdNode,
  BollingerNode,
  AtrNode,
  CompareNode,
  CrossoverNode,
  AndNode,
  OrNode,
  NotNode,
  EntrySignalNode,
  ExitSignalNode,
  PositionSizeNode,
  TakeProfitNode,
  StopLossNode,
};
