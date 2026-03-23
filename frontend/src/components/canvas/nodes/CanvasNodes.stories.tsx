/**
 * Canvas Node Stories
 *
 * All block types available in the Blockbuilders strategy canvas, grouped by category:
 *   - Input (purple)    — data source blocks
 *   - Indicator (blue)  — technical analysis blocks
 *   - Logic (amber)     — conditional/boolean blocks
 *   - Signal (green)    — entry/exit trigger blocks
 *   - Risk (red)        — risk management blocks
 */
import type { Meta, StoryObj } from "@storybook/react";
import { ReactFlowProvider } from "@xyflow/react";

import PriceNode from "./PriceNode";
import ConstantNode from "./ConstantNode";
import VolumeNode from "./VolumeNode";
import PriceVariationPctNode from "./PriceVariationPctNode";
import YesterdayCloseNode from "./YesterdayCloseNode";

import SmaNode from "./SmaNode";
import EmaNode from "./EmaNode";
import RsiNode from "./RsiNode";
import MacdNode from "./MacdNode";
import BollingerNode from "./BollingerNode";
import AtrNode from "./AtrNode";
import AdxNode from "./AdxNode";
import FibonacciNode from "./FibonacciNode";
import IchimokuNode from "./IchimokuNode";
import StochasticNode from "./StochasticNode";
import ObvNode from "./ObvNode";

import CompareNode from "./CompareNode";
import CrossoverNode from "./CrossoverNode";
import AndNode from "./AndNode";
import OrNode from "./OrNode";
import NotNode from "./NotNode";

import EntrySignalNode from "./EntrySignalNode";
import ExitSignalNode from "./ExitSignalNode";
import NoteNode from "./NoteNode";

import StopLossNode from "./StopLossNode";
import TakeProfitNode from "./TakeProfitNode";
import TrailingStopNode from "./TrailingStopNode";
import PositionSizeNode from "./PositionSizeNode";
import TimeExitNode from "./TimeExitNode";
import MaxDrawdownNode from "./MaxDrawdownNode";

/** Minimal mock of React Flow NodeProps */
function mkProps(data: Record<string, unknown> = {}) {
  return {
    id: "node-1",
    type: "custom",
    data,
    selected: false,
    zIndex: 0,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    dragging: false,
  } as Parameters<typeof PriceNode>[0];
}

const meta = {
  title: "Canvas/Nodes",
  tags: ["autodocs"],
  decorators: [
    (Story: () => React.ReactNode) => (
      <ReactFlowProvider>
        <div className="flex flex-wrap gap-4 p-8 bg-slate-100 dark:bg-slate-900 min-h-32 items-start">
          <Story />
        </div>
      </ReactFlowProvider>
    ),
  ],
  parameters: { nextjs: { appDirectory: true } },
} satisfies Meta;

export default meta;

// ─── Input nodes ─────────────────────────────────────────────────────────────

export const Price: StoryObj = {
  render: () => <PriceNode {...mkProps({ label: "Price", params: { source: "close" } })} />,
};

export const Constant: StoryObj = {
  render: () => <ConstantNode {...mkProps({ label: "Constant", params: { value: 30 } })} />,
};

export const Volume: StoryObj = {
  render: () => <VolumeNode {...mkProps({ label: "Volume" })} />,
};

export const PriceVariationPct: StoryObj = {
  name: "Price Change %",
  render: () => (
    <PriceVariationPctNode {...mkProps({ label: "Price Change %", params: { period: 1 } })} />
  ),
};

export const YesterdayClose: StoryObj = {
  render: () => <YesterdayCloseNode {...mkProps({ label: "Yesterday Close" })} />,
};

// ─── Indicator nodes ─────────────────────────────────────────────────────────

export const SMA: StoryObj = {
  render: () => <SmaNode {...mkProps({ label: "SMA", params: { period: 20, source: "close" } })} />,
};

export const EMA: StoryObj = {
  render: () => <EmaNode {...mkProps({ label: "EMA", params: { period: 12, source: "close" } })} />,
};

export const RSI: StoryObj = {
  render: () => <RsiNode {...mkProps({ label: "RSI", params: { period: 14, source: "close" } })} />,
};

export const MACD: StoryObj = {
  render: () => (
    <MacdNode {...mkProps({ label: "MACD", params: { fast: 12, slow: 26, signal: 9 } })} />
  ),
};

export const BollingerBands: StoryObj = {
  render: () => (
    <BollingerNode {...mkProps({ label: "Bollinger Bands", params: { period: 20, stddev: 2 } })} />
  ),
};

export const ATR: StoryObj = {
  render: () => <AtrNode {...mkProps({ label: "ATR", params: { period: 14 } })} />,
};

export const ADX: StoryObj = {
  render: () => <AdxNode {...mkProps({ label: "ADX", params: { period: 14 } })} />,
};

export const Fibonacci: StoryObj = {
  render: () => (
    <FibonacciNode {...mkProps({ label: "Fibonacci", params: { period: 20 } })} />
  ),
};

export const Ichimoku: StoryObj = {
  render: () => (
    <IchimokuNode
      {...mkProps({
        label: "Ichimoku",
        params: { tenkan: 9, kijun: 26, senkou_b: 52 },
      })}
    />
  ),
};

export const Stochastic: StoryObj = {
  render: () => (
    <StochasticNode
      {...mkProps({ label: "Stochastic", params: { k_period: 14, d_period: 3 } })}
    />
  ),
};

export const OBV: StoryObj = {
  render: () => <ObvNode {...mkProps({ label: "OBV" })} />,
};

// ─── Logic nodes ─────────────────────────────────────────────────────────────

export const Compare: StoryObj = {
  render: () => (
    <CompareNode {...mkProps({ label: "Compare", params: { operator: ">" } })} />
  ),
};

export const Crossover: StoryObj = {
  render: () => <CrossoverNode {...mkProps({ label: "Crossover" })} />,
};

export const And: StoryObj = {
  render: () => <AndNode {...mkProps({ label: "AND" })} />,
};

export const Or: StoryObj = {
  render: () => <OrNode {...mkProps({ label: "OR" })} />,
};

export const Not: StoryObj = {
  render: () => <NotNode {...mkProps({ label: "NOT" })} />,
};

// ─── Signal nodes ─────────────────────────────────────────────────────────────

export const EntrySignal: StoryObj = {
  render: () => <EntrySignalNode {...mkProps({ label: "Entry Signal" })} />,
};

export const EntrySignalError: StoryObj = {
  name: "Entry Signal (validation error)",
  render: () => (
    <EntrySignalNode
      {...mkProps({
        label: "Entry Signal",
        hasError: true,
        validationMessage:
          "No logic block connected. Connect a Compare or Crossover block.",
      })}
    />
  ),
};

export const ExitSignal: StoryObj = {
  render: () => <ExitSignalNode {...mkProps({ label: "Exit Signal" })} />,
};

export const Note: StoryObj = {
  render: () => (
    <NoteNode
      {...mkProps({ label: "Note", params: { text: "RSI buy when oversold < 30" } })}
    />
  ),
};

// ─── Risk nodes ─────────────────────────────────────────────────────────────

export const StopLoss: StoryObj = {
  render: () => (
    <StopLossNode {...mkProps({ label: "Stop Loss", params: { percent: 2 } })} />
  ),
};

export const TakeProfit: StoryObj = {
  render: () => (
    <TakeProfitNode {...mkProps({ label: "Take Profit", params: { percent: 5 } })} />
  ),
};

export const TrailingStop: StoryObj = {
  render: () => (
    <TrailingStopNode {...mkProps({ label: "Trailing Stop", params: { percent: 1.5 } })} />
  ),
};

export const PositionSize: StoryObj = {
  render: () => (
    <PositionSizeNode {...mkProps({ label: "Position Size", params: { percent: 10 } })} />
  ),
};

export const TimeExit: StoryObj = {
  render: () => (
    <TimeExitNode {...mkProps({ label: "Time Exit", params: { max_bars: 20 } })} />
  ),
};

export const MaxDrawdown: StoryObj = {
  render: () => (
    <MaxDrawdownNode {...mkProps({ label: "Max Drawdown", params: { percent: 15 } })} />
  ),
};

// ─── Gallery — all nodes at once ─────────────────────────────────────────────

export const AllNodesGallery: StoryObj = {
  name: "All Nodes (Gallery)",
  render: () => (
    <ReactFlowProvider>
      <div className="p-6 bg-slate-100 dark:bg-slate-900 space-y-6 w-full">
        {[
          {
            label: "Input",
            color: "text-violet-600 dark:text-violet-400",
            nodes: [
              <PriceNode key="price" {...mkProps({ label: "Price", params: { source: "close" } })} />,
              <ConstantNode key="const" {...mkProps({ label: "Constant", params: { value: 30 } })} />,
              <VolumeNode key="vol" {...mkProps({ label: "Volume" })} />,
              <PriceVariationPctNode key="pct" {...mkProps({ label: "Price Change %", params: { period: 1 } })} />,
              <YesterdayCloseNode key="yday" {...mkProps({ label: "Yesterday Close" })} />,
            ],
          },
          {
            label: "Indicator",
            color: "text-sky-600 dark:text-sky-400",
            nodes: [
              <SmaNode key="sma" {...mkProps({ label: "SMA", params: { period: 20 } })} />,
              <EmaNode key="ema" {...mkProps({ label: "EMA", params: { period: 12 } })} />,
              <RsiNode key="rsi" {...mkProps({ label: "RSI", params: { period: 14 } })} />,
              <MacdNode key="macd" {...mkProps({ label: "MACD", params: { fast: 12, slow: 26, signal: 9 } })} />,
              <BollingerNode key="boll" {...mkProps({ label: "Bollinger Bands", params: { period: 20, stddev: 2 } })} />,
              <AtrNode key="atr" {...mkProps({ label: "ATR", params: { period: 14 } })} />,
              <AdxNode key="adx" {...mkProps({ label: "ADX", params: { period: 14 } })} />,
              <FibonacciNode key="fib" {...mkProps({ label: "Fibonacci", params: { period: 20 } })} />,
              <ObvNode key="obv" {...mkProps({ label: "OBV" })} />,
            ],
          },
          {
            label: "Logic",
            color: "text-amber-600 dark:text-amber-400",
            nodes: [
              <CompareNode key="cmp" {...mkProps({ label: "Compare", params: { operator: ">" } })} />,
              <CrossoverNode key="cross" {...mkProps({ label: "Crossover" })} />,
              <AndNode key="and" {...mkProps({ label: "AND" })} />,
              <OrNode key="or" {...mkProps({ label: "OR" })} />,
              <NotNode key="not" {...mkProps({ label: "NOT" })} />,
            ],
          },
          {
            label: "Signal",
            color: "text-emerald-600 dark:text-emerald-400",
            nodes: [
              <EntrySignalNode key="entry" {...mkProps({ label: "Entry Signal" })} />,
              <ExitSignalNode key="exit" {...mkProps({ label: "Exit Signal" })} />,
            ],
          },
          {
            label: "Risk",
            color: "text-rose-600 dark:text-rose-400",
            nodes: [
              <StopLossNode key="sl" {...mkProps({ label: "Stop Loss", params: { percent: 2 } })} />,
              <TakeProfitNode key="tp" {...mkProps({ label: "Take Profit", params: { percent: 5 } })} />,
              <TrailingStopNode key="trail" {...mkProps({ label: "Trailing Stop", params: { percent: 1.5 } })} />,
              <PositionSizeNode key="pos" {...mkProps({ label: "Position Size", params: { percent: 10 } })} />,
              <TimeExitNode key="time" {...mkProps({ label: "Time Exit", params: { max_bars: 20 } })} />,
              <MaxDrawdownNode key="dd" {...mkProps({ label: "Max Drawdown", params: { percent: 15 } })} />,
            ],
          },
        ].map(({ label, color, nodes }) => (
          <div key={label}>
            <h3 className={`mb-3 text-xs font-semibold uppercase tracking-widest ${color}`}>
              {label}
            </h3>
            <div className="flex flex-wrap gap-3">{nodes}</div>
          </div>
        ))}
      </div>
    </ReactFlowProvider>
  ),
};
