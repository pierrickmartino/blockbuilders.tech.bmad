# Test Checklist -- Data Completeness Indicators

> Source PRD: `prd-data-completeness-indicators.md`

## 1. API -- GET /data-completeness

- [ ] Endpoint accepts `asset` and `timeframe` query parameters
- [ ] Returns coverage range (earliest to latest candle timestamp)
- [ ] Returns completeness percent
- [ ] Returns gap count (number of missing periods)
- [ ] Returns gap total duration
- [ ] Returns gap ranges (list of start/end timestamps for each gap)
- [ ] Returns valid data for BTC/USDT with 1d timeframe
- [ ] Returns valid data for ETH/USDT with 1d timeframe
- [ ] Returns valid data for other supported asset/timeframe combinations
- [ ] Returns 401 for unauthenticated requests
- [ ] Returns appropriate error for unsupported asset or timeframe
- [ ] Returns appropriate response when no data is available for the pair

## 2. Completeness Percent Calculation

- [ ] Completeness percent is calculated as `actual / expected * 100`
- [ ] Expected candle count is correctly derived from coverage start to coverage end for the timeframe
- [ ] 100% completeness is returned when no gaps exist
- [ ] Less than 100% completeness is returned when gaps exist
- [ ] Value is rounded to a reasonable precision (e.g., 1 decimal)

## 3. Gap Detection

- [ ] A gap is identified when candles are missing for more than one expected interval
- [ ] Each gap includes start timestamp, end timestamp, and missing candle count
- [ ] Gap count matches the number of gap range entries
- [ ] Gap total duration sums all individual gap durations correctly
- [ ] Single-candle gaps are detected (or handled per open question resolution)
- [ ] No false gaps are reported when data is contiguous

## 4. Timeline Visualization

- [ ] A horizontal bar timeline is rendered for the selected asset/timeframe
- [ ] Available data segments are visually distinct from gap segments
- [ ] Gap ranges are highlighted as missing segments on the timeline
- [ ] Timeline scales appropriately for different coverage ranges (short vs long history)
- [ ] Timeline is readable on desktop
- [ ] Timeline is readable on mobile

## 5. Summary String

- [ ] A single-sentence summary is displayed
- [ ] Summary includes the completeness percentage
- [ ] Summary includes the coverage date range (from/to)
- [ ] Summary includes the gap count
- [ ] Summary includes the total gap duration
- [ ] Example format: "99.2% complete from Jan 2020 to present, 3 gap periods totaling 18 hours."
- [ ] Summary for 100% complete data shows no gaps mentioned

## 6. UI Placement -- Backtest Setup

- [ ] Timeline and summary are shown for the currently selected asset/timeframe
- [ ] Data updates when the user changes the asset or timeframe selection
- [ ] If the selected backtest period overlaps a gap, a warning banner is displayed
- [ ] Warning banner text is clear and user-friendly
- [ ] Warning does not block the user from running the backtest

## 7. UI Placement -- Backtest Results

- [ ] Completeness summary is shown on the backtest results page
- [ ] Summary reflects the completeness data used for the specific run
- [ ] Optional timeline visualization is available in results

## 8. Warning Banner Logic

- [ ] Warning appears when the backtest date range overlaps any gap range
- [ ] Warning does not appear when the backtest date range has no overlapping gaps
- [ ] Warning is informational only (does not prevent backtest execution)
- [ ] Warning disappears when the user adjusts the date range to avoid gaps

## 9. Data Storage

- [ ] Completeness data is stored per asset/timeframe
- [ ] Gap ranges are stored as a list of `{ start, end, missing_candles }`
- [ ] Data is computed by the existing validation job (or extended job)
- [ ] Stored data can be queried efficiently by asset and timeframe

## 10. Negative & Edge Cases

- [ ] Asset with no historical data returns 0% completeness and appropriate empty state
- [ ] Asset with 100% complete data returns no gaps
- [ ] Very sparse data (many gaps) is handled without performance issues
- [ ] Very large coverage ranges (years of data) render correctly on the timeline
- [ ] No new dependencies are introduced
- [ ] Changing the timeframe updates the completeness data accordingly
