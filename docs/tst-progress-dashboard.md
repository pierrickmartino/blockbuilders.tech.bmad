# Test Checklist -- Progress Dashboard

> Source PRD: `prd-progress-dashboard.md`

## 1. Route and Access

- [ ] `/progress` route renders for authenticated users
- [ ] `/progress` redirects to login for unauthenticated users
- [ ] Progress link is present in the main app navigation
- [ ] Page layout is simple stacked sections (no tabs)

## 2. Core Metrics -- Strategies Created

- [ ] Displays total strategies count accurately
- [ ] Count matches the actual number of strategies in the database for the user
- [ ] Shows 0 for a new user with no strategies

## 3. Core Metrics -- Backtests Run

- [ ] Displays total completed backtest runs accurately
- [ ] Count matches actual completed runs (status=completed) in the database
- [ ] Shows 0 for a user with no completed backtests
- [ ] Does not count failed or in-progress backtest runs

## 4. Core Metrics -- Lessons Learned

- [ ] Displays "x/4" count of completed lessons
- [ ] Count increments correctly as milestones are achieved

## 5. Lessons -- Individual Milestones

- [ ] "Created first strategy" is marked done when strategies_count >= 1
- [ ] "Created first strategy" is not done when strategies_count = 0
- [ ] "Saved a strategy version" is marked done when strategy_versions_count >= 1
- [ ] "Saved a strategy version" is not done when strategy_versions_count = 0
- [ ] "Ran first backtest" is marked done when completed_backtests_count >= 1
- [ ] "Ran first backtest" is not done when completed_backtests_count = 0
- [ ] "Reviewed results" is marked done when completed_backtests_count >= 1
- [ ] Each completed lesson shows a checkmark indicator
- [ ] Incomplete lessons show an empty/unchecked indicator

## 6. Achievements -- Thresholds

- [ ] "First Strategy" badge unlocks when strategies_count >= 1
- [ ] "First Strategy" badge is locked when strategies_count = 0
- [ ] "5 Strategies" badge unlocks when strategies_count >= 5
- [ ] "5 Strategies" badge is locked when strategies_count < 5
- [ ] "First Backtest" badge unlocks when completed_backtests_count >= 1
- [ ] "First Backtest" badge is locked when completed_backtests_count = 0
- [ ] "10 Backtests" badge unlocks when completed_backtests_count >= 10
- [ ] "10 Backtests" badge is locked when completed_backtests_count < 10

## 7. Achievements -- Display

- [ ] Total achievements unlocked is shown (e.g., "2/4")
- [ ] Most recent achievement earned is highlighted
- [ ] "Most recent" is determined by the highest threshold reached
- [ ] All 4 achievements are shown (locked and unlocked states)

## 8. Next Steps -- Suggestion Logic

- [ ] If strategies_count = 0, next step is "Create your first strategy."
- [ ] If strategies_count > 0 and completed_backtests_count = 0, next step is "Run your first backtest."
- [ ] If completed_backtests_count > 0 and strategy_versions_count = 0, next step is "Save a new version of a strategy."
- [ ] Otherwise, next step is "Review your latest backtest results."
- [ ] 1-2 suggestions are shown (not more)
- [ ] Suggestions update correctly as user progresses

## 9. API -- GET /progress

- [ ] Returns `strategies_count` (integer)
- [ ] Returns `strategy_versions_count` (integer)
- [ ] Returns `completed_backtests_count` (integer)
- [ ] Returns `lessons` object with total, completed count, and items array
- [ ] Each lesson item includes key, label, and done (boolean)
- [ ] Returns `achievements` object with total, unlocked count, and latest achievement
- [ ] Returns `next_steps` array of 1-2 suggestion strings
- [ ] Returns 401 for unauthenticated requests
- [ ] Computations are performed server-side

## 10. Data Accuracy

- [ ] Strategies count matches `strategies` table for current user
- [ ] Strategy versions count matches `strategy_versions` table for current user
- [ ] Completed backtests count matches `backtest_runs` with status=completed for current user
- [ ] Counts update in real-time (on page refresh) as user creates/runs items
- [ ] Deleting a strategy updates the count on next load

## 11. Frontend -- UI Components

- [ ] Each core metric is displayed in a card component
- [ ] Lessons are displayed as a list with checkmarks
- [ ] Achievements are displayed using Badge components
- [ ] Next steps section is visible with action-oriented text
- [ ] Tone is positive and motivating (e.g., "You're building momentum")
- [ ] Uses existing Card and Badge components (no new UI libraries)

## 12. Edge Cases

- [ ] New user with zero activity sees all zeros, no lessons completed, all achievements locked
- [ ] New user sees appropriate next step ("Create your first strategy")
- [ ] User at exact threshold values (e.g., exactly 1 strategy, exactly 10 backtests) earns the achievement
- [ ] Responsive layout works on mobile, tablet, and desktop
- [ ] Page handles API errors gracefully with a retry option

## 13. No New Infrastructure

- [ ] No new analytics pipelines or event tracking systems are introduced
- [ ] No new database tables are created
- [ ] Existing query patterns from `/usage/me` and `/strategies` are reused
- [ ] No extra dependencies are added
