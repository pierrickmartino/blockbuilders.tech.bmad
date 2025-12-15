# Strategy Setup Guide

Welcome to **Blockbuilders**! This guide will walk you through creating your first trading strategy and running a backtest. No coding experience required.

---

## Table of Contents

1. [What is a Strategy?](#what-is-a-strategy)
2. [Getting Started](#getting-started)
3. [Understanding the Canvas](#understanding-the-canvas)
4. [Building Blocks Explained](#building-blocks-explained)
5. [Creating Your First Strategy](#creating-your-first-strategy)
6. [Running a Backtest](#running-a-backtest)
7. [Understanding Results](#understanding-results)
8. [Common Patterns & Examples](#common-patterns--examples)
9. [Troubleshooting](#troubleshooting)

---

## What is a Strategy?

A **trading strategy** is a set of rules that tells you when to buy (enter) and when to sell (exit) a cryptocurrency. In Blockbuilders, you build these rules visually by connecting blocks together—no code required.

**Key Concepts:**
- **Indicators**: Mathematical calculations on price data (like moving averages, RSI, etc.)
- **Logic**: Rules that compare values or combine conditions (like "RSI is below 30")
- **Signals**: The final decision to enter or exit a trade
- **Risk Management**: Rules for position sizing, stop losses, and take profits

---

## Getting Started

### Step 1: Create a New Strategy

1. Log in to your Blockbuilders account
2. Click the **"New Strategy"** button on your dashboard
3. Fill in the strategy details:
   - **Name**: Give your strategy a descriptive name (e.g., "RSI Oversold Strategy")
   - **Asset**: Choose which cryptocurrency pair to trade (BTC/USDT or ETH/USDT)
   - **Timeframe**: Select the candle timeframe (1 day or 4 hours)
4. Click **"Create"**

You'll be taken to the **Strategy Canvas**, where you'll build your strategy visually.

---

## Understanding the Canvas

The Strategy Canvas has three main areas:

### Left Sidebar: Block Palette
This is your toolbox of building blocks. Blocks are organized into categories:
- **Input** (purple): Price and volume data
- **Indicators** (blue): Technical indicators like moving averages and RSI
- **Logic** (amber): Comparison and boolean operators
- **Signals** (green): Entry and exit signals
- **Risk** (red): Position sizing, take profit, and stop loss

**On Mobile**: Tap the menu icon to open the Block Palette as a drawer.

### Center: Canvas
The main workspace where you drag blocks and connect them together. Every new strategy starts with three blocks already placed:
- **Price** (input block)
- **Entry Signal** (where your strategy decides to buy)
- **Exit Signal** (where your strategy decides to sell)

You can:
- **Drag blocks** from the palette onto the canvas
- **Move blocks** by clicking and dragging them
- **Connect blocks** by clicking an output port and dragging to an input port
- **Delete blocks** by selecting them and pressing Delete/Backspace
- **Pan the canvas** by clicking and dragging the background
- **Zoom** using your mouse wheel or pinch gesture

### Right Sidebar: Properties Panel
When you click on a block, its properties appear here. This is where you configure parameters like:
- Moving average period
- RSI threshold values
- Position size percentage
- Take profit/stop loss percentages

**On Mobile**: The Properties Panel opens as a bottom drawer when you tap a block.

---

## Building Blocks Explained

### Input Blocks (Purple)

#### Price
Provides price data for your chosen asset and timeframe.

**Output Ports:**
- `output`: The price value (configurable in properties)

**Properties:**
- **Source**: Which price to use (Open, High, Low, Close)

**Example Use**: Connect to indicators like SMA or use directly in comparisons.

---

#### Volume
Provides trading volume data.

**Output Ports:**
- `output`: The volume value

**Example Use**: Create volume-based filters (e.g., only trade when volume is high).

---

### Indicator Blocks (Blue)

#### SMA (Simple Moving Average)
Calculates the average price over a specified number of candles.

**Input Ports:**
- `input`: The data to average (usually price)

**Output Ports:**
- `output`: The moving average value

**Properties:**
- **Period**: Number of candles to average (default: 20)

**Common Uses:**
- Trend identification: Price above SMA = uptrend
- Support/resistance levels
- Crossover strategies

---

#### EMA (Exponential Moving Average)
Like SMA but gives more weight to recent prices, making it more responsive.

**Input Ports:**
- `input`: The data to average

**Output Ports:**
- `output`: The EMA value

**Properties:**
- **Period**: Number of candles (default: 20)

**Common Uses:**
- Faster trend detection than SMA
- Crossover strategies (e.g., EMA 12 crossing EMA 26)

---

#### RSI (Relative Strength Index)
Measures momentum on a scale of 0-100. Values below 30 suggest oversold (potential buy), above 70 suggest overbought (potential sell).

**Input Ports:**
- `input`: The price data

**Output Ports:**
- `output`: RSI value (0-100)

**Properties:**
- **Period**: Number of candles for calculation (default: 14)

**Common Uses:**
- Buy when RSI crosses above 30 (oversold bounce)
- Sell when RSI crosses below 70 (overbought reversal)
- Divergence detection

---

#### MACD (Moving Average Convergence Divergence)
Shows the relationship between two moving averages. Produces a MACD line and a signal line.

**Input Ports:**
- `input`: The price data

**Output Ports:**
- `macd`: The MACD line
- `signal`: The signal line
- `histogram`: The difference (MACD - Signal)

**Properties:**
- **Fast Period**: Fast EMA period (default: 12)
- **Slow Period**: Slow EMA period (default: 26)
- **Signal Period**: Signal line EMA period (default: 9)

**Common Uses:**
- Buy when MACD crosses above signal line
- Sell when MACD crosses below signal line
- Trend strength (histogram size)

---

#### Bollinger Bands
Creates three lines: a moving average (middle) with upper/lower bands based on standard deviation.

**Input Ports:**
- `input`: The price data

**Output Ports:**
- `upper`: Upper band
- `middle`: Middle band (SMA)
- `lower`: Lower band

**Properties:**
- **Period**: SMA period (default: 20)
- **Std Dev**: Number of standard deviations (default: 2)

**Common Uses:**
- Price touching lower band = oversold (buy signal)
- Price touching upper band = overbought (sell signal)
- Band width indicates volatility

---

#### ATR (Average True Range)
Measures market volatility (average price movement range).

**Input Ports:**
- (Uses OHLC data automatically)

**Output Ports:**
- `output`: ATR value

**Properties:**
- **Period**: Number of candles (default: 14)

**Common Uses:**
- Dynamic stop loss placement (e.g., 2x ATR below entry)
- Volatility filters (only trade when ATR is high/low)
- Position sizing based on volatility

---

### Logic Blocks (Amber)

#### Compare
Compares two values using mathematical operators.

**Input Ports:**
- `a`: First value
- `b`: Second value

**Output Ports:**
- `output`: Boolean result (true/false)

**Properties:**
- **Operator**: >, <, >=, <= (greater than, less than, etc.)

**Example**: Compare price to SMA (Price > SMA 50)

---

#### Crossover
Detects when one line crosses over or under another line.

**Input Ports:**
- `a`: First series
- `b`: Second series

**Output Ports:**
- `output`: Boolean signal (true when crossover occurs)

**Properties:**
- **Direction**: crosses_above or crosses_below

**Example**: EMA 12 crosses above EMA 26 (bullish signal)

---

#### AND
Combines two conditions—both must be true for output to be true.

**Input Ports:**
- `a`: First condition
- `b`: Second condition

**Output Ports:**
- `output`: Boolean result

**Example**: (RSI < 30) AND (Price > SMA 200)

---

#### OR
Combines two conditions—at least one must be true.

**Input Ports:**
- `a`: First condition
- `b`: Second condition

**Output Ports:**
- `output`: Boolean result

**Example**: (RSI < 30) OR (Price touches lower Bollinger Band)

---

#### NOT
Inverts a condition (true becomes false, false becomes true).

**Input Ports:**
- `input`: Condition to invert

**Output Ports:**
- `output`: Inverted boolean

**Example**: NOT (RSI > 70) = RSI is not overbought

---

### Signal Blocks (Green)

#### Entry Signal
**Required** block that marks when to enter (buy) a trade.

**Input Ports:**
- `input`: Boolean condition that triggers entry

**Properties**: None

**Important**: Every strategy must have exactly one Entry Signal block with a connection.

---

#### Exit Signal
**Required** block that marks when to exit (sell) a trade.

**Input Ports:**
- `input`: Boolean condition that triggers exit

**Properties**: None

**Important**: Every strategy must have exactly one Exit Signal block with a connection.

---

### Risk Management Blocks (Red)

#### Position Size
Determines what percentage of your equity to use per trade.

**Properties:**
- **Size %**: Percentage of total equity (default: 5%, range: 0.1-100%)

**Example**: With $10,000 equity and 5% position size, each trade uses $500.

**Best Practice**: Start with 1-5% to manage risk. Never use 100% unless you're very confident.

---

#### Take Profit
Automatically exits the trade when profit reaches your target percentage.

**Properties:**
- **Target %**: Profit percentage to trigger exit (default: 10%, range: 0.1-1000%)

**Example**: With 10% take profit, a trade entered at $50,000 will exit at $55,000.

---

#### Stop Loss
Automatically exits the trade when loss reaches your threshold percentage.

**Properties:**
- **Threshold %**: Loss percentage to trigger exit (default: 5%, range: 0.1-100%)

**Example**: With 5% stop loss, a trade entered at $50,000 will exit at $47,500.

**Best Practice**: Always use a stop loss to protect against large losses.

---

## Creating Your First Strategy

Let's build a simple **"RSI Oversold Strategy"** together. This strategy buys when RSI is oversold and sells when it recovers.

### Strategy Rules:
- **Enter**: When RSI crosses above 30 (recovering from oversold)
- **Exit**: When RSI crosses below 70 (before becoming too overbought)
- **Position Size**: 5% of equity
- **Stop Loss**: 5%
- **Take Profit**: 10%

### Step-by-Step Instructions:

#### 1. Add Blocks to Canvas

From the Block Palette, drag these blocks onto the canvas:
1. **RSI** (from Indicators)
2. **Crossover** (from Logic) - drag two of these
3. **Position Size** (from Risk)
4. **Stop Loss** (from Risk)
5. **Take Profit** (from Risk)

You should now have these blocks plus the three pre-placed blocks (Price, Entry Signal, Exit Signal).

---

#### 2. Build Entry Logic

We want to enter when RSI crosses above 30.

**Connections:**
1. Connect **Price → RSI**
   - Click the `output` port on the Price block
   - Drag to the `input` port on the RSI block

2. Configure RSI
   - Click the RSI block
   - In Properties Panel, keep Period at 14 (default)

3. Create constant for "30"
   - We need to compare RSI to the value 30
   - Unfortunately, we don't have a "constant" block yet, so we'll use a workaround:
   - Drag another **SMA** block onto canvas
   - We'll configure it in a moment as our "30 threshold"

4. Connect **RSI → Crossover #1**
   - Connect RSI's `output` to Crossover's `a` port

5. Configure Crossover #1
   - Click the Crossover block
   - Set Direction to: **crosses_above**

6. Connect **Crossover #1 → Entry Signal**
   - Connect Crossover's `output` to Entry Signal's `input`

**Note**: The current implementation requires numeric values for comparison. If you need to compare to a fixed threshold like 30, you may need to use a workaround or check if Compare block supports numeric literals.

---

#### 3. Build Exit Logic

We want to exit when RSI crosses below 70.

**Connections:**
1. Drag another **Crossover** block (Crossover #2)

2. Connect **RSI → Crossover #2**
   - Connect RSI's `output` to Crossover #2's `a` port

3. Configure Crossover #2
   - Click the Crossover #2 block
   - Set Direction to: **crosses_below**

4. Connect **Crossover #2 → Exit Signal**
   - Connect Crossover #2's `output` to Exit Signal's `input`

---

#### 4. Add Risk Management

**Position Size:**
1. Click the **Position Size** block
2. In Properties Panel, set Size % to: **5**

**Stop Loss:**
1. Click the **Stop Loss** block
2. In Properties Panel, set Threshold % to: **5**

**Take Profit:**
1. Click the **Take Profit** block
2. In Properties Panel, set Target % to: **10**

**Note**: Risk blocks don't need connections—they apply automatically to all trades.

---

#### 5. Save Your Strategy

1. Click the **"Save"** button in the top right
2. Your strategy will be validated:
   - ✅ Entry Signal has input connection
   - ✅ Exit Signal has input connection
   - ✅ All connections are valid
3. If validation passes, your strategy is saved as a new version

**Troubleshooting**: If you see errors, check:
- Both Entry and Exit Signals must have connections
- All block connections must be between valid ports
- No dangling connections (connections to nowhere)

---

## Running a Backtest

Now that your strategy is saved, let's test it against historical data.

### Step 1: Navigate to Backtest Tab

Click the **"Backtest"** tab at the top of the strategy editor.

---

### Step 2: Configure Backtest Parameters

Fill in the backtest form:

**Date Range:**
- **From**: Choose a start date (e.g., 2024-01-01)
- **To**: Choose an end date (e.g., 2024-12-31)

**Tip**: Start with 6-12 months of data to see how your strategy performs across different market conditions.

**Trading Costs** (optional, uses defaults if not specified):
- **Fee Rate**: Trading fee percentage per trade (default: 0.1%)
- **Slippage Rate**: Price slippage percentage (default: 0.05%)

**Tip**: The defaults are reasonable for most exchanges. Higher values = more realistic but worse results.

---

### Step 3: Start Backtest

1. Click **"Run Backtest"** button
2. The backtest will be queued and processed in the background
3. You'll see a status indicator: "Pending..." → "Running..." → "Completed"

**Wait Time**: Typically 10-60 seconds depending on data range and strategy complexity.

---

### Step 4: View Results

Once complete, you'll see three sections:

#### A. Equity Curve Chart
A line graph showing your account balance over time.

**What to Look For:**
- **Upward trend**: Strategy is profitable
- **Smooth line**: Consistent returns
- **Sharp drops**: Large losses (drawdowns)
- **Flat periods**: No trades or breakeven periods

---

#### B. Performance Metrics

**Initial Balance**: Starting equity (default: $10,000)

**Final Balance**: Ending equity after all trades

**Total Return %**: Overall profit/loss percentage
- Example: 45% means you gained 45% of initial equity

**CAGR %**: Annualized return (Compound Annual Growth Rate)
- Shows what % you'd gain per year if results compound
- More useful than Total Return for comparing strategies

**Max Drawdown %**: Largest peak-to-trough decline
- Example: -15% means at worst, you lost 15% from a previous high
- Lower is better (less risk)

**Number of Trades**: Total trades executed

**Win Rate %**: Percentage of profitable trades
- Example: 60% means 6 out of 10 trades were winners

---

#### C. Trade List

A table showing every trade with:
- **Entry Time**: When the trade was opened
- **Entry Price**: Price at entry
- **Exit Time**: When the trade was closed
- **Exit Price**: Price at exit
- **P&L**: Profit/Loss in dollars
- **P&L %**: Profit/Loss percentage
- **Duration**: How long the trade lasted

**Tip**: Review losing trades to see if your strategy needs adjustment.

---

## Understanding Results

### What Makes a Good Strategy?

**Profitability:**
- Total Return > 0% (positive returns)
- CAGR > 10% annually (decent performance)
- CAGR > 20% annually (excellent performance)

**Risk Management:**
- Max Drawdown < 20% (manageable losses)
- Max Drawdown < 10% (low risk)
- Win Rate > 50% (more winners than losers)

**Consistency:**
- Equity curve trends upward consistently
- Not just 1-2 lucky trades carrying all returns
- Works across different time periods

**Trade Frequency:**
- At least 20-30 trades for statistical significance
- Too few trades = results might be luck
- Too many trades = high trading costs

---

### Red Flags to Watch For

❌ **Curve Fitting**: Strategy works perfectly on backtest but fails in reality
- Caused by over-optimizing parameters to historical data
- Test on multiple time periods to verify robustness

❌ **Survivorship Bias**: Only testing on assets that "survived"
- Less of an issue with BTC/ETH but be aware

❌ **Look-Ahead Bias**: Using future data to make past decisions
- Blockbuilders prevents this by design
- Trades execute at *next* candle open after signal

❌ **Excessive Drawdowns**: Losing 50%+ of equity
- Even if overall profitable, these are psychologically hard to endure
- Add stricter risk management

---

## Common Patterns & Examples

### Example 1: Moving Average Crossover

**Strategy**: Buy when fast MA crosses above slow MA (golden cross), sell when it crosses below (death cross).

**Blocks Needed:**
- Price
- EMA (Period: 12) - Fast
- EMA (Period: 26) - Slow
- Crossover (crosses_above) - For entry
- Crossover (crosses_below) - For exit
- Entry Signal
- Exit Signal

**Connections:**
1. Price → EMA 12
2. Price → EMA 26
3. EMA 12 → Crossover #1 (port a)
4. EMA 26 → Crossover #1 (port b)
5. Crossover #1 (crosses_above) → Entry Signal
6. EMA 12 → Crossover #2 (port a)
7. EMA 26 → Crossover #2 (port b)
8. Crossover #2 (crosses_below) → Exit Signal

---

### Example 2: Bollinger Band Bounce

**Strategy**: Buy when price touches lower band (oversold), sell when price reaches middle band (reversion to mean).

**Blocks Needed:**
- Price
- Bollinger Bands
- Compare (operator: <=) - For entry
- Compare (operator: >=) - For exit
- Entry Signal
- Exit Signal

**Connections:**
1. Price → Bollinger Bands
2. Price → Compare #1 (port a)
3. Bollinger Bands (lower) → Compare #1 (port b)
4. Compare #1 (<=) → Entry Signal
5. Price → Compare #2 (port a)
6. Bollinger Bands (middle) → Compare #2 (port b)
7. Compare #2 (>=) → Exit Signal

---

### Example 3: MACD + RSI Confirmation

**Strategy**: Buy when MACD crosses above signal *and* RSI is oversold. Sell when MACD crosses below signal.

**Blocks Needed:**
- Price
- MACD
- RSI
- Crossover (crosses_above) - MACD crossover
- Compare (operator: <) - RSI < 40
- AND - Combine conditions
- Crossover (crosses_below) - Exit condition
- Entry Signal
- Exit Signal

**Connections:**
1. Price → MACD
2. Price → RSI
3. MACD (macd) → Crossover #1 (port a)
4. MACD (signal) → Crossover #1 (port b)
5. Crossover #1 (crosses_above) → AND (port a)
6. RSI → Compare (port a)
7. Compare (<) [threshold: 40] → AND (port b)
8. AND → Entry Signal
9. MACD (macd) → Crossover #2 (port a)
10. MACD (signal) → Crossover #2 (port b)
11. Crossover #2 (crosses_below) → Exit Signal

---

## Troubleshooting

### "Strategy validation failed: Entry Signal must have input"

**Cause**: Your Entry Signal block isn't connected to any logic.

**Fix**: Connect a logic block (Compare, Crossover, AND, OR) to the Entry Signal's input port.

---

### "Strategy validation failed: Exit Signal must have input"

**Cause**: Your Exit Signal block isn't connected to any logic.

**Fix**: Connect a logic block to the Exit Signal's input port.

---

### "Invalid connection: port does not exist"

**Cause**: You tried to connect incompatible ports or connected to the wrong side.

**Fix**:
- Connections flow left-to-right: outputs → inputs
- Make sure you're connecting output port (right side) to input port (left side)
- Check that the port name exists on both blocks

---

### "Daily backtest limit reached"

**Cause**: You've run 50+ backtests today (default limit).

**Fix**:
- Wait until tomorrow when limit resets
- Review your existing backtest results instead of running new ones
- Contact support if you need higher limits

---

### "No trades generated"

**Cause**: Your strategy conditions were never met during the backtest period.

**Fix**:
- Check if your entry conditions are too strict (maybe RSI never hit your threshold)
- Try a longer date range
- Review your logic—are you using AND when you meant OR?
- Simplify your strategy to see if trades occur

---

### "Backtest failed: insufficient data"

**Cause**: Not enough historical candles available for the date range or strategy's indicator periods.

**Fix**:
- Choose a more recent date range
- Reduce indicator periods (e.g., SMA 200 needs at least 200 candles of warmup)

---

### Strategy saved but can't find it

**Cause**: Strategies are user-specific and private.

**Fix**:
- Make sure you're logged into the correct account
- Check the "My Strategies" page (main dashboard)
- Strategies are saved automatically—click the strategy name to reopen

---

### Mobile: Can't see Block Palette

**Cause**: On mobile, the palette is hidden by default to save space.

**Fix**:
- Tap the **menu icon** (☰) in the top left to open the drawer
- Tap outside the drawer to close it after dragging a block

---

### Mobile: Can't edit block properties

**Cause**: Properties Panel is hidden until you select a block.

**Fix**:
- Tap any block on the canvas
- A drawer will slide up from the bottom with properties
- Swipe down to close it

---

### Equity curve shows wild swings

**Cause**:
- Position size is too high (using 50-100% of equity)
- No stop loss configured
- Strategy takes very few trades (each has huge impact)

**Fix**:
- Reduce Position Size to 1-5%
- Add a Stop Loss (5-10%)
- Adjust entry conditions to generate more trades

---

### Win rate is 80%+ but strategy loses money

**Cause**: Your winning trades are small, but losing trades are large (poor risk/reward ratio).

**Fix**:
- Review Trade List to see P&L per trade
- Tighten your stop loss
- Widen your take profit
- Adjust entry/exit logic to catch bigger moves

---

## Tips for Success

### Start Simple
- Your first strategy should have 5-10 blocks maximum
- Test one idea at a time
- Add complexity only if simple version works

### Backtest Multiple Periods
- Bull markets (2023-2024)
- Bear markets (2022)
- Sideways markets
- A good strategy works in all conditions

### Compare Strategies
- Create variations (e.g., RSI 30 vs RSI 35)
- Run same backtest period for fair comparison
- Track which patterns work best for your asset/timeframe

### Respect Risk Management
- Always use Position Size ≤ 5% to start
- Always use Stop Loss to limit downside
- Take Profit is optional but recommended

### Iterate Based on Data
- Review losing trades in Trade List
- Look for patterns (time of day, market conditions, etc.)
- Adjust logic blocks accordingly
- Re-backtest to validate improvements

### Don't Overfit
- If you run 100 backtests tweaking parameters, you'll find one that "works"
- But it won't work on new data (overfitting)
- Make logical changes, not random ones

---

## Next Steps

Now you know how to:
- ✅ Create a strategy on the visual canvas
- ✅ Use indicators, logic, and signals
- ✅ Add risk management
- ✅ Run backtests
- ✅ Interpret results

**What's next?**

1. **Experiment**: Build 3-5 different strategies and compare results
2. **Learn**: Study trading education resources to understand indicators better
3. **Refine**: Iterate on your best-performing strategy
4. **Schedule**: Set up automatic re-backtests to see how strategies perform on new data
5. **Share** (future): Once marketplace is live, share your best strategies

---

## Additional Resources

- **README.md**: Technical documentation and API reference
- **Support**: Contact support if you encounter bugs or have questions
- **Community** (coming soon): Forums and strategy discussions

---

**Happy backtesting! 🚀**

*Remember: Past performance doesn't guarantee future results. Always backtest thoroughly and understand the risks before trading real money.*
