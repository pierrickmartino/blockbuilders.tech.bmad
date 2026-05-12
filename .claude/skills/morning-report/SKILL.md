---
name: morning-report
description: >-
  Generate the Blockbuilders morning report.
  Synthesises overnight activity from multiple sources.
  Usage: /morning-report YYYY-MM-DD
---

Read AGENTS.md and .github/ai-context/github-snapshot.md.
Read the latest file in docs/ai/nightly-research/.
Read tasks/ai-usage-log.csv.
Read tasks/lessons.md.

Write docs/ai/morning-reports/$ARGUMENTS.md with this structure:
  # Blockbuilders Morning Report — $ARGUMENTS
  ## 1. Executive summary (one paragraph)
  ## 2. Overnight activity
     | Item | Status | Link | Notes |
  ## 3. PRs ready for your decision
     | PR | CI | Codex review | Risk | Recommendation |
  ## 4. Blocked tasks
     | Issue | Blocker | Decision needed |
  ## 5. Questions for you (numbered, decisions only)
  ## 6. Risks
     | Risk | Severity | Action |
  ## 7. Agent usage this cycle
     | Agent | Tasks | Notes |
  ## 8. Recommended plan for today (numbered, max 5 items)

Rules:
  - Every section must fit on one phone screen.
  - Do not hide failures.
  - Do not mark PRs ready if CI failed.
  - Focus on decisions, not explanations.
