# Test Checklist -- Progress Dashboard

> Source PRD: `prd-progress-dashboard.md`

## 1. Route and Access

- [x] `/progress` route renders for authenticated users
- [x] `/progress` redirects to login for unauthenticated users
- [x] Progress link is present in the main app navigation
- [x] Page layout is simple stacked sections (no tabs)

## 2. Core Metrics -- Strategies Created

- [x] Displays total strategies count accurately
- [x] Count matches the actual number of strategies in the database for the user
- [x] Shows 0 for a new user with no strategies

## 3. Core Metrics -- Backtests Run

- [x] Displays total completed backtest runs accurately
- [x] Count matches actual completed runs (status=completed) in the database
- [x] Shows 0 for a user with no completed backtests
- [x] Does not count failed or in-progress backtest runs

## 4. Core Metrics -- Lessons Learned

- [x] Displays "x/4" count of completed lessons
- [x] Count increments correctly as milestones are achieved

## 5. Lessons -- Individual Milestones

- [x] "Created first strategy" is marked done when strategies_count >= 1
- [x] "Created first strategy" is not done when strategies_count = 0
- [x] "Saved a strategy version" is marked done when strategy_versions_count >= 1
- [x] "Saved a strategy version" is not done when strategy_versions_count = 0
- [x] "Ran first backtest" is marked done when completed_backtests_count >= 1
- [x] "Ran first backtest" is not done when completed_backtests_count = 0
- [x] "Reviewed results" is marked done when completed_backtests_count >= 1
- [x] Each completed lesson shows a checkmark indicator
- [x] Incomplete lessons show an empty/unchecked indicator

## 6. Achievements -- Thresholds

- [x] "First Strategy" badge unlocks when strategies_count >= 1
- [x] "First Strategy" badge is locked when strategies_count = 0
- [x] "5 Strategies" badge unlocks when strategies_count >= 5
- [x] "5 Strategies" badge is locked when strategies_count < 5
- [x] "First Backtest" badge unlocks when completed_backtests_count >= 1
- [x] "First Backtest" badge is locked when completed_backtests_count = 0
- [x] "10 Backtests" badge unlocks when completed_backtests_count >= 10
- [x] "10 Backtests" badge is locked when completed_backtests_count < 10

## 7. Achievements -- Display

- [x] Total achievements unlocked is shown (e.g., "2/4")
- [x] Most recent achievement earned is highlighted
- [ ] "Most recent" is determined by the highest threshold reached
- [x] All 4 achievements are shown (locked and unlocked states)

## 8. Next Steps -- Suggestion Logic

- [x] If strategies_count = 0, next step is "Create your first strategy."
- [x] If strategies_count > 0 and completed_backtests_count = 0, next step is "Run your first backtest."
- [x] If completed_backtests_count > 0 and strategy_versions_count = 0, next step is "Save a new version of a strategy."
- [x] Otherwise, next step is "Review your latest backtest results."
- [x] 1-2 suggestions are shown (not more)
- [x] Suggestions update correctly as user progresses

## 9. API -- GET /progress

- [x] Returns `strategies_count` (integer)
- [x] Returns `strategy_versions_count` (integer)
- [x] Returns `completed_backtests_count` (integer)
- [x] Returns `lessons` object with total, completed count, and items array
- [x] Each lesson item includes key, label, and done (boolean)
- [x] Returns `achievements` object with total, unlocked count, and latest achievement
- [x] Returns `next_steps` array of 1-2 suggestion strings
- [x] Returns 401 for unauthenticated requests
- [x] Computations are performed server-side

## 10. Data Accuracy

- [x] Strategies count matches `strategies` table for current user
- [x] Strategy versions count matches `strategy_versions` table for current user
- [x] Completed backtests count matches `backtest_runs` with status=completed for current user
- [x] Counts update in real-time (on page refresh) as user creates/runs items
- [x] Deleting a strategy updates the count on next load

## 11. Frontend -- UI Components

- [x] Each core metric is displayed in a card component
- [x] Lessons are displayed as a list with checkmarks
- [ ] Achievements are displayed using Badge components
- [x] Next steps section is visible with action-oriented text
- [x] Tone is positive and motivating (e.g., "You're building momentum")
- [x] Uses existing Card and Badge components (no new UI libraries)

## 12. Edge Cases

- [x] New user with zero activity sees all zeros, no lessons completed, all achievements locked
- [x] New user sees appropriate next step ("Create your first strategy")
- [x] User at exact threshold values (e.g., exactly 1 strategy, exactly 10 backtests) earns the achievement
- [x] Responsive layout works on mobile, tablet, and desktop
- [ ] Page handles API errors gracefully with a retry option

## 13. No New Infrastructure

- [x] No new analytics pipelines or event tracking systems are introduced
- [x] No new database tables are created
- [x] Existing query patterns from `/usage/me` and `/strategies` are reused
- [x] No extra dependencies are added
