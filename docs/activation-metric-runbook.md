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

`signup_completed` fires for **every** new account on first authentication —
email/password sign-ups *and* first-time OAuth sign-ups (the OAuth callback
returns `is_new_user`, and `frontend/src/context/auth.tsx` emits
`signup_completed` for new OAuth users, `login_completed` for returning ones).
OAuth signups therefore enter step 1 of this funnel like any other new user.

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

`results_viewed` carries `{ strategy_id, run_id, entry_path, authoring_mode }`
(`entry_path ∈ { wizard | blank_canvas | template_clone | nl_wedge }`,
`authoring_mode ∈ { nl | manual }`,
`frontend/src/hooks/useResultViewedTracking.ts`). Breaking the funnel down
by `entry_path` is the seam for the drop-off cohorts (ACTIONS #2) — optional
on this insight, not required for the north-star number itself. The cohort
dimensions, the diagnostic funnel, and their own cutover are specified in
§8 below and in [ADR-0009](./adr/0009-activation-drop-off-cohorts.md).

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
  `backtest_job_completed`, same date range as the canonical funnel but
  **with no `signup_completed` cohort filter**. The filter must be omitted on
  purpose: `signup_completed` is a consent-gated client event, so scoping the
  coverage line to `signup_completed` users would re-impose the very consent
  gate this line exists to measure around — shrinking (or erasing) the blind
  spot instead of revealing it. `backtest_job_completed` is emitted
  server-side for every completed run regardless of consent
  (`backend/app/services/analytics.py`, `backend/app/worker/jobs.py`), so it
  already spans consenting and non-consenting users; keep it that way. Do
  **not** build this as a `signup_completed → backtest_job_completed` funnel —
  that funnel inherits the same consent gate at step 1.
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

## 7. Drop-off cohorts & time-to-activation (diagnostic layer — ACTIONS #2)

This layer refines *where* and *for whom* activation stalls. It is a
**diagnostic**, never a replacement for the canonical north-star in §1. Full
rationale: [ADR-0009](./adr/0009-activation-drop-off-cohorts.md).

### 7.1 Cohort dimensions

Two **orthogonal** properties, carried on every event from `strategy_created`
onward (and on `results_viewed`):

- **`entry_path`** — launch surface: `wizard | blank_canvas |
  template_clone | nl_wedge`. **Persisted on the `strategies` row**, stamped
  once at creation, so it is stable across reloads/sessions and the manual
  backtest page reports the *true* origin (it no longer hard-codes
  `"manual"`). The old catch-all `manual` is **retired**.
- **`authoring_mode`** — `nl | manual`. **Derived** from `entry_path`
  (`nl_wedge → nl`, else `manual`); not stored (ADR-0006 ⇒ NL only drafts
  new strategies).

### 7.2 Diagnostic funnel (4 semantic milestones)

Build a **second** funnel insight, "Activation drop-off by step", path-agnostic
via "any-of" event mapping:

| Step | Milestone | Event(s) |
|------|-----------|----------|
| 1 | Signed up | `signup_completed` |
| 2 | Strategy authored | `strategy_created` (any source) |
| 3 | Backtest enqueued | `backtest_started` **or** `auto_backtest_started` |
| 4 | Verdict viewed | `results_viewed` |

- **Label it a diagnostic.** Its overall conversion is *stricter* than the §1
  canonical rate (it requires steps 2–3) and must **never** be quoted as "the
  activation rate". The "biggest drop-off step" is simply the largest
  step-to-step fall in this viz.
- **Breakdown** by `entry_path` (and/or `authoring_mode`) with **attribution
  at step 2 ("Strategy authored")**, the first step where the path is known.
- **First-touch, per-user.** A user is attributed to their *first* authored
  strategy's `entry_path`. Users who bounce **between step 1 and step 2** have
  no path → name that bucket "(no path — bounced before authoring)" rather
  than hide it.

### 7.3 Time to activation

`time_to_activation` = elapsed time from `signup_completed` to first
`results_viewed`. Read it as the funnel's **PostHog-native time-to-convert**
(median / p90 / distribution), sliceable by `entry_path`. **No new event or
numeric property** — do not compute a client-side number; it would drift from
the funnel. Do **not** call this `time_to_first_backtest` (implies the
job/run; see ADR-0008).

### 7.4 Cohort cutover (separate from §4)

The cohort breakdown is trustworthy only from the date `entry_path` ships and
all four creation paths stamp it — a **later** date than the 2026-06-07
activation cutover. Add its **own annotation** on that deploy date; entry-path
breakdowns start there. The §1 canonical 2-step series keeps running unbroken
from 2026-06-07. **No backfill:** strategies created before the column exists
have `entry_path = null` and appear as an explicit `unknown` cohort — never
retro-guessed.

### 7.5 HITL checklist (diagnostic layer)

- [ ] Diagnostic funnel built (4 steps above), labelled "diagnostic — not the
      activation rate", placed on the existing "Activation north-star" dashboard
- [ ] Breakdown by `entry_path`, attribution at step 2; pre-authoring bounce
      bucket named, `unknown` cohort visible
- [ ] `time_to_activation` tile = funnel time-to-convert (no client number)
- [ ] Cohort cutover annotation added on the `entry_path` deploy date; no
      backfill of pre-column strategies

## 8. Maintenance

If the activation definition ever needs to change, update **this runbook**,
`CONTEXT.md` (Analytics concepts), and `docs/adr/0008-...` together — they
must never drift apart. A new ADR supersedes 0008; this runbook then points
at the new one and records a new cutover date (never edits the old one in
place). Cohort-layer (§7) changes track `docs/adr/0009-...` the same way.
