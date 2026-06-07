# Activation Metric Runbook

> Codifies the activation north-star so its definition stops drifting.
> Source of truth: `CONTEXT.md` → *Analytics concepts* and
> `docs/adr/0008-activation-is-first-result-viewed.md`. This runbook is the
> spec the PostHog dashboard (HITL — requires dashboard access) must match;
> it does not replace either document, it operationalizes them.

## 1. Canonical activation metric (the north star)

**Definition**: the first per-user occurrence of `results_viewed`.

Build it in PostHog as a **funnel insight**:

| Step | Event | Notes |
|------|-------|-------|
| 1 | `signup_completed` | Cohort entry point |
| 2 | `results_viewed` | Conversion event |

- **Aggregation**: unique users, "first time" semantics — each user is
  counted at most once per step, on their first occurrence of the event.
  This is what makes "first per user" native rather than a computed
  property grouping (per ADR-0008 §2, identity comes from
  `posthog.identify(user.id)` bound on login/signup/OAuth —
  `frontend/src/context/auth.tsx:91,101,141`).
- **Conversion window**: open-ended (no cap). Activation is a one-time,
  first-touch event — bounding the window would artificially exclude users
  who take longer than the window to see their first verdict.
- **Date range**: starts at the **cutover date** (see §4) — never earlier.

`results_viewed` carries `{ strategy_id, run_id, entry_path }`
(`entry_path ∈ { manual | wizard | nl_wedge }`,
`frontend/src/hooks/useResultViewedTracking.ts`). Breaking the funnel down
by `entry_path` is the seam for the drop-off-by-entry-path cohorts
(ACTIONS #2) — optional on this insight, not required for the north-star
number itself.

## 2. Consenting-user scope

The canonical funnel is **implicitly** scoped to consenting users — no
extra filter is needed, by construction:

- `signup_completed` and `results_viewed` are emitted client-side through
  `trackEvent`, which no-ops unless `getConsent() === "accepted"`
  (`frontend/src/lib/analytics.ts`).
- `posthog.identify(user.id)` is likewise gated on accepted consent
  (`identifyUser`, same file, wired in #546). A user only becomes an
  identified PostHog person — and thus only enters the funnel as a
  distinct, de-duplicated identity — if they accepted analytics consent.

**Sanity check for the reviewer**: every `distinct_id` that appears in this
funnel should resolve to an identified person (has a `$identify` event in
its history). If anonymous-only distinct_ids show up, that is a signal the
gating broke — investigate before trusting the number.

This consent gate is exactly what creates the blind spot the coverage line
in §3 exists to measure: users who decline consent can never appear in the
canonical funnel, no matter how many verdicts they actually see.

## 3. Coverage line (server-side, job-based proxy — NOT canonical)

**Definition**: first server-side completion signal per user, i.e. the
first `backtest_job_completed` event (or equivalently, the moment
`users.has_completed_onboarding` flips to `true`). Both fire from the same
trigger in the worker — first completed backtest run
(`backend/app/worker/jobs.py:331-346`) — so they are interchangeable as a
*signal*; pick whichever is easier to query in the tool at hand:

- **In PostHog** (recommended, keeps it next to the canonical funnel):
  a trend insight on unique users, first occurrence of
  `backtest_job_completed`, same date range and cohort filter
  (`signup_completed` users) as the canonical funnel — or the equivalent
  funnel `signup_completed → backtest_job_completed` (first time, unique
  users) for a side-by-side comparison.
- **In the database** (cross-check / sanity query): point-in-time count of
  `SELECT count(*) FROM users WHERE has_completed_onboarding = true`,
  optionally joined to `created_at` for cohort alignment.

**Labeling rule (mandatory)**: anywhere this number appears — chart legend,
dashboard tile, doc reference — it must be explicitly labeled as
**"Coverage (job-based proxy) — not activation"**. It is a *measurement of
the canonical metric's blind spot*, not an alternative or a backup
activation number, and it must never be summed, averaged, or stacked with
the canonical funnel's output.

Because this signal is server-side and unconditional (no consent gate), it
covers consenting and non-consenting users alike — which is precisely what
makes the gap between it and the canonical funnel a measurable quantity
rather than a silent unknown.

## 4. Cutover + no-backfill rule

**Cutover date: 2026-06-07.**

This is the date `results_viewed` became the single canonical view event,
fired identically (same trigger, same payload shape, same dedup) across
every entry path:

- Manual run path adopted the shared tracker — #547 (`2e018f0`)
- Wizard path preselects the completed run so the verdict renders and the
  tracker fires with `entry_path: "wizard"` — #548 (`1e65183`)
- Per-user identity (`posthog.identify`) wired on auth — #546 (`6aa47de`)

**Rule**: the canonical funnel's date range starts at 2026-06-07 and is
never extended backward.

- **Why**: before cutover, `results_viewed` only fired on the manual
  backtest page, with ad-hoc per-page dedup and no bound identity. Those
  events do not represent "first verdict seen, deduped per identified
  user" — counting them would silently blend two different meanings of the
  event into one series (exactly the drift ADR-0008 exists to end).
- **No backfill, ever**: do not attempt to reconstruct pre-cutover
  activations from old `results_viewed`, `backtest_completed`, or
  `auto_backtest_completed` rows and merge them into the canonical series.
  The canonical line starts clean at cutover and grows from there.
- **Pre-cutover history is visible only through the coverage line** (§3),
  which has fired consistently server-side since the worker existed, and
  which is already explicitly labeled as a proxy — so pre/post-cutover
  comparisons remain honest about which series they're looking at.

## 5. Known proxy semantics (carry into the dashboard's caption/notes)

`results_viewed` fires on "completed run selected + verdict rendered", not
on a viewport/visibility signal — a user who tabs away the instant the
verdict renders is still counted (ADR-0008 → Consequences: a deliberate
proxy, accepted as good enough; viewport gating was rejected as
over-built). A draft the user later rejects
still counts — they witnessed an honest verdict, and activation is recorded
independently of any later keep/reject and survives the NL-wedge
hard-delete (ADR-0006). Both are intended properties of the metric, not
defects — call them out in the dashboard notes so nobody "fixes" them later.

## 6. HITL checklist (PostHog dashboard build)

- [ ] Funnel insight: `signup_completed` → `results_viewed`, unique users,
      first-time conversion, no conversion-window cap
- [ ] Insight date range starts at 2026-06-07 (cutover) — confirm no
      earlier data is included
- [ ] Coverage trend/funnel built on `backtest_job_completed` (or
      `has_completed_onboarding`), placed alongside but visually distinct
      from the canonical funnel, labeled "Coverage (job-based proxy) — not
      activation"
- [ ] Dashboard caption documents: the consenting-user scope (§2), the
      no-backfill/cutover rule (§4), and the proxy semantics (§5)
- [ ] Spot-check: sample a few funnel `distinct_id`s and confirm each has
      an `$identify` event (no anonymous leakage into the canonical count)

## 7. Maintenance

If the activation definition ever needs to change, update **this runbook**,
`CONTEXT.md` (Analytics concepts), and `docs/adr/0008-...` together — they
must never drift apart. A new ADR supersedes 0008; this runbook then points
at the new one and records a new cutover date (never edits the old one in
place).
