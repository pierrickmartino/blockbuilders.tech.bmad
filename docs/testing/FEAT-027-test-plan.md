# Test Checklist -- Contextual Help & Tooltips

> Source PRD: `prd-contextual-help-tooltips.md`

## 1. Indicator Tooltips

- [ ] SMA tooltip is present with a correct, concise definition
- [ ] EMA tooltip is present with a correct, concise definition
- [ ] RSI tooltip is present with a correct, concise definition
- [ ] MACD tooltip is present with a correct, concise definition
- [ ] Bollinger Bands tooltip is present with a correct, concise definition
- [ ] ATR tooltip is present with a correct, concise definition

## 2. Logic Block Tooltips

- [ ] Compare block tooltip is present with a correct definition
- [ ] Crossover block tooltip is present with a correct definition
- [ ] AND block tooltip is present with a correct definition
- [ ] OR block tooltip is present with a correct definition
- [ ] NOT block tooltip is present with a correct definition

## 3. Signal & Risk Block Tooltips

- [ ] Entry Signal tooltip is present with a correct definition
- [ ] Exit Signal tooltip is present with a correct definition
- [ ] Time Exit tooltip is present with a correct definition
- [ ] Trailing Stop tooltip is present with a correct definition
- [ ] Position Size tooltip is present with a correct definition
- [ ] Take Profit tooltip is present with a correct definition
- [ ] Stop Loss tooltip is present with a correct definition
- [ ] Max Drawdown tooltip is present with a correct definition

## 4. Metric Tooltips

- [ ] Total Return tooltip is present with a correct definition
- [ ] CAGR tooltip is present with a correct definition
- [ ] Max Drawdown tooltip is present with a correct definition
- [ ] Number of Trades tooltip is present with a correct definition
- [ ] Win Rate tooltip is present with a correct definition
- [ ] Benchmark Return tooltip is present with a correct definition
- [ ] Alpha tooltip is present with a correct definition
- [ ] Beta tooltip is present with a correct definition

## 5. Placement -- Strategy Builder

- [ ] Tooltips appear on block palette cards for indicator blocks
- [ ] Tooltips appear on block palette cards for logic blocks
- [ ] Tooltips appear on block palette cards for signal blocks
- [ ] Tooltips appear on block palette cards for risk blocks
- [ ] Tooltips appear on block headers on canvas nodes
- [ ] Tooltips appear on properties panel labels for block parameters (when applicable)
- [ ] Same tooltip text is used for the same block across palette and canvas

## 6. Placement -- Backtest Results

- [ ] Tooltips appear on metric labels in summary cards/tables
- [ ] All metrics listed in Section 5.1 have tooltips in the results view

## 7. Tooltip Behavior

- [ ] Tooltips appear on hover (desktop)
- [ ] Tooltips appear on tap (mobile) if supported by existing patterns
- [ ] Tooltip content is 1--2 sentences maximum
- [ ] Tooltip language is plain and concise (minimal jargon)
- [ ] Tooltip does not block underlying interactions
- [ ] Tooltip disappears when hover/focus is removed

## 8. Info Icons

- [ ] Small info icons (e.g., "i" in a circle) are visible next to technical terms
- [ ] Info icons reveal the definition directly in the tooltip
- [ ] Tooltip definitions are shown in-tooltip (no external links required)

## 9. Content Consistency

- [ ] The same term uses the same definition across all UI locations
- [ ] Tooltip text is 120 characters or fewer when possible
- [ ] Tooltip text explains what the item measures or signals (actionable)
- [ ] All terms listed in Section 6.2 are defined (Moving Average, EMA, RSI, MACD, Bollinger Bands, ATR, Crossover, Signal, Stop Loss, Take Profit, Trailing Stop, Drawdown, CAGR, Alpha, Beta, Benchmark Return, Win Rate)

## 10. Implementation Constraints

- [ ] No new backend endpoints are introduced
- [ ] No database changes are introduced
- [ ] No new third-party UI libraries are added
- [ ] Tooltip copy is centralized in a static map (not duplicated across components)
- [ ] Existing UI components or native `title` attributes are used

## 11. Responsive & Accessibility

- [ ] UI remains clean and readable on desktop with tooltips
- [ ] UI remains clean and readable on mobile with tooltips
- [ ] Tooltips do not create overlays that block interactions
- [ ] Info icons are minimal and do not clutter the interface
