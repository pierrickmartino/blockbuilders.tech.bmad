# PRD: Progress Dashboard

## Summary
Build a lightweight Progress Dashboard that shows a user’s journey at a glance: strategies created, backtests run, lessons learned, and achievements unlocked. The goal is to create momentum with simple metrics pulled from existing usage data, plus a small “next steps” area that nudges users toward their next action.

## Goals
- Provide a simple, motivating snapshot of user progress.
- Reuse existing usage data (strategies, backtests, versions) with minimal new logic.
- Keep the UI minimal: cards, counts, and a short list of achievements.

## Non-Goals
- No new analytics pipelines or event tracking systems.
- No social features (leaderboards, sharing, comparisons).
- No complex gamification (streaks across multiple products, XP systems, etc.).
- No heavy charts (keep it to simple counts and badges).

## User Stories
- As a user, I can see how many strategies I’ve created and backtests I’ve run.
- As a user, I can see which milestones I’ve completed so far.
- As a user, I get a simple suggestion for what to do next.

## Scope

### Core Metrics (simple counts)
- **Strategies created** (total strategies count).
- **Backtests run** (total completed backtest runs).
- **Lessons learned** (count of completed usage milestones, defined below).
- **Achievements unlocked** (total badges unlocked + latest badge).

### Lessons Learned (derived from usage milestones)
Lessons are simple boolean milestones inferred from existing tables. Suggested v1 list:
1. **Created first strategy** → strategies_count ≥ 1.
2. **Saved a strategy version** → strategy_versions_count ≥ 1.
3. **Ran first backtest** → completed_backtests_count ≥ 1.
4. **Reviewed results** → completed_backtests_count ≥ 1 (same as #3 to keep it simple).

> The dashboard displays a count (e.g., 3/4) and the list of completed lessons with checkmarks.

### Achievements (badge-style, derived)
Achievements are computed from the same counts with no extra storage:
- **First Strategy** → strategies_count ≥ 1
- **5 Strategies** → strategies_count ≥ 5
- **First Backtest** → completed_backtests_count ≥ 1
- **10 Backtests** → completed_backtests_count ≥ 10

Show:
- Total achievements unlocked (e.g., 2/4).
- The most recent achievement earned (based on highest threshold reached).

### Next Steps (lightweight guidance)
Provide 1–2 suggestions based on simple rules:
- If strategies_count = 0 → “Create your first strategy.”
- Else if completed_backtests_count = 0 → “Run your first backtest.”
- Else if strategy_versions_count = 0 → “Save a new version of a strategy.”
- Otherwise → “Review your latest backtest results.”

## UX / UI
- Route: `/progress` in the main app navigation.
- Layout: simple stacked sections, no tabs.
- Use cards for each core metric, plus a list for lessons and achievements.
- Keep the tone positive and simple (“You’re building momentum”).

## Data & API

### Data sources (existing)
- **Strategies count**: `strategies` table.
- **Strategy versions count**: `strategy_versions` table.
- **Completed backtests count**: `backtest_runs` with status = completed.

### API shape (minimal)
Option A (preferred): add a small endpoint `GET /progress` that returns aggregated counts and computed achievements/lessons.

Example response:
```json
{
  "strategies_count": 3,
  "strategy_versions_count": 2,
  "completed_backtests_count": 7,
  "lessons": {
    "total": 4,
    "completed": 3,
    "items": [
      {"key": "first_strategy", "label": "Created first strategy", "done": true},
      {"key": "saved_version", "label": "Saved a strategy version", "done": true},
      {"key": "first_backtest", "label": "Ran first backtest", "done": true},
      {"key": "reviewed_results", "label": "Reviewed results", "done": false}
    ]
  },
  "achievements": {
    "total": 4,
    "unlocked": 2,
    "latest": {"key": "first_backtest", "label": "First Backtest"}
  },
  "next_steps": [
    "Save a new version of a strategy.",
    "Review your latest backtest results."
  ]
}
```

Option B (if avoiding a new endpoint): extend `GET /usage/me` with these fields. Prefer Option A for clarity.

## Acceptance Criteria
- Progress dashboard route renders for authenticated users.
- Counts are accurate based on existing tables.
- Lessons and achievements are computed deterministically from counts.
- Next steps are shown using simple, predictable rules.
- No new analytics/event tracking systems are introduced.

## Implementation Notes (Minimal)
- Keep computations server-side to avoid extra client queries.
- Reuse existing query patterns from `/usage/me` and `/strategies` endpoints.
- Avoid extra dependencies; use existing UI components (Card, Badge).
