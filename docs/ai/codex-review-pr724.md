# Codex review comments on PR #724 (re-validated against latest `main`)

PR #724 ("docs: triage Codex review comments (PR #655 → latest) against main")
is closed/merged. It received exactly **one** `chatgpt-codex-connector`
(openai-codex) review comment, plus a Vercel deploy comment (ignored). The
single Codex thread is **still unresolved** and its substance has been
re-checked against the current branch HEAD (`d1365ab`, merge of PR #748).

**Verdict: 1 of 1 Codex comments still valid.**

## Still valid (action needed)

### 1. [P1, badged P2] Strategy-settings alert path can never create a new alert
- **Source**: PR #724, [`docs/codex-review-pr655-to-latest.md:206`](https://github.com/pierrickmartino/blockbuilders.tech.bmad/pull/724#discussion_r3427934465)
- **Codex claim**: PR #724's triage doc marked the #713 strategy-settings alert finding as "resolved", but it is not. The Save Alerts path shipped in the strategy settings sheet still cannot create a new performance alert.
- **Re-validation against current branch (`d1365ab`)** — all three sub-claims confirmed:
  1. `frontend/src/app/(app)/strategies/[id]/page.tsx:323` still calls `useStrategyAlerts({ strategyId: id })` with **no** `backtestRunId`.
  2. `frontend/src/hooks/use-strategy-alerts.ts:82-85` throws `Error("Open a completed backtest result to create an alert.")` inside `saveMutation` whenever no `alertRule` exists and no `backtestRunId` was supplied.
  3. The settings sheet still wires up the create/save path: `page.tsx:628` passes `onAlertSave={alerts.save}` into `StrategySettingsSheet`, and `StrategySettingsSheet.tsx:340-343` renders a "Save Alerts" button (disabled only while `isSavingAlert`, never gated on an existing `alertRule` or a `backtestRunId`).
- **Effect**: A user who opens **strategy settings** (not a backtest result) with no existing alert sees the Save Alerts UI, clicks it, and the mutation throws — there is no in-context way to create a new performance alert from the settings surface. The original Codex P1 was dropped as resolved when the shipped UI path is still broken.
- **Fix direction**: Either (a) supply a valid `backtestRunId` to `useStrategyAlerts` on the strategy-settings surface (e.g. the latest completed backtest run for the strategy), or (b) hide/disable the "Save Alerts" create path in settings when no `backtestRunId` is available and surface guidance pointing users to open a completed backtest result, so the Save button is never a dead end.

## Resolved / no action needed

None — the only Codex comment on PR #724 is still valid.
