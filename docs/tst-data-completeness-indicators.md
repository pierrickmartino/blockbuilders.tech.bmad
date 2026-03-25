# Test Checklist -- Data Completeness Indicators

> Source PRD: `prd-data-completeness-indicators.md`

## 1. API -- GET /data-completeness

- [x] Endpoint accepts `asset` and `timeframe` query parameters
- [x] Returns coverage range (earliest to latest candle timestamp)
- [x] Returns completeness percent
- [x] Returns gap count (number of missing periods)
- [x] Returns gap total duration
- [x] Returns gap ranges (list of start/end timestamps for each gap)
- [x] Returns valid data for BTC/USDT with 1d timeframe
- [x] Returns valid data for ETH/USDT with 1d timeframe
- [x] Returns valid data for other supported asset/timeframe combinations
- [ ] Returns 401 for unauthenticated requests
- [ ] Returns appropriate error for unsupported asset or timeframe
- [x] Returns appropriate response when no data is available for the pair

## 2. Completeness Percent Calculation

- [x] Completeness percent is calculated as `actual / expected * 100`
- [x] Expected candle count is correctly derived from coverage start to coverage end for the timeframe
- [x] 100% completeness is returned when no gaps exist
- [x] Less than 100% completeness is returned when gaps exist
- [ ] Value is rounded to a reasonable precision (e.g., 1 decimal)

## 3. Gap Detection

- [x] A gap is identified when candles are missing for more than one expected interval
- [ ] Each gap includes start timestamp, end timestamp, and missing candle count
- [x] Gap count matches the number of gap range entries
- [x] Gap total duration sums all individual gap durations correctly
- [x] Single-candle gaps are detected (or handled per open question resolution)
- [x] No false gaps are reported when data is contiguous

## 4. Timeline Visualization

- [x] A horizontal bar timeline is rendered for the selected asset/timeframe
- [x] Available data segments are visually distinct from gap segments
- [x] Gap ranges are highlighted as missing segments on the timeline
- [x] Timeline scales appropriately for different coverage ranges (short vs long history)
- [ ] Timeline is readable on desktop
- [ ] Timeline is readable on mobile

## 5. Summary String

- [x] A single-sentence summary is displayed
- [x] Summary includes the completeness percentage
- [x] Summary includes the coverage date range (from/to)
- [x] Summary includes the gap count
- [x] Summary includes the total gap duration
- [x] Example format: "99.2% complete from Jan 2020 to present, 3 gap periods totaling 18 hours."
- [x] Summary for 100% complete data shows no gaps mentioned

## 6. UI Placement -- Backtest Setup

- [x] Timeline and summary are shown for the currently selected asset/timeframe
- [ ] Data updates when the user changes the asset or timeframe selection
- [x] If the selected backtest period overlaps a gap, a warning banner is displayed
- [x] Warning banner text is clear and user-friendly
- [x] Warning does not block the user from running the backtest

## 7. UI Placement -- Backtest Results

- [x] Completeness summary is shown on the backtest results page
- [ ] Summary reflects the completeness data used for the specific run
- [x] Optional timeline visualization is available in results

## 8. Warning Banner Logic

- [x] Warning appears when the backtest date range overlaps any gap range
- [x] Warning does not appear when the backtest date range has no overlapping gaps
- [x] Warning is informational only (does not prevent backtest execution)
- [x] Warning disappears when the user adjusts the date range to avoid gaps

## 9. Data Storage

- [ ] Completeness data is stored per asset/timeframe
- [ ] Gap ranges are stored as a list of `{ start, end, missing_candles }`
- [ ] Data is computed by the existing validation job (or extended job)
- [ ] Stored data can be queried efficiently by asset and timeframe

## 10. Negative & Edge Cases

- [x] Asset with no historical data returns 0% completeness and appropriate empty state
- [x] Asset with 100% complete data returns no gaps
- [x] Very sparse data (many gaps) is handled without performance issues
- [x] Very large coverage ranges (years of data) render correctly on the timeline
- [ ] No new dependencies are introduced
- [ ] Changing the timeframe updates the completeness data accordingly
