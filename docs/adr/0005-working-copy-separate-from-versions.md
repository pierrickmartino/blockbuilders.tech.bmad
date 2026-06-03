# ADR-0005 — Working copy is separate from versions; versions freeze on backtest

- **Status**: Accepted
- **Date**: 2026-06-03
- **Related**: [CONTEXT.md](../../CONTEXT.md) — Working copy, Strategy
  version, Publish, Archive; supersedes the draft/publish/archive
  design of PR #466 (issues #456–#459)

## Context

PR #466 modelled the editable "draft" as a `StrategyVersion` row:
a reserved `version_number = 0` slot carrying a `status` enum
(`draft` / `published` / `archived`). Autosave mutated that row;
**publish consumed it** (flipped `status` to `published`, assigned the
next `version_number`); the canvas loaded the draft first and fell back
to the latest published version on 404.

Three independent consequences of that single fused concept combined
into a data-loss bug — *publish a new strategy, run a backtest, return,
canvas is empty*:

1. **Consume-on-publish** left no draft row after publishing.
2. The loader **preferred the draft**, falling back to a version only
   on 404.
3. Autosave **armed on the empty initial mount** (`scheduleSnapshot([],
   [])`), so it could `PUT` an empty canvas, racing the loader.

The glossary also contradicted itself: a *version* was defined as an
"immutable snapshot," yet the draft *was* a version row that autosave
mutated every few seconds. And "publish" named two unrelated actions —
freezing a version, and `Strategy.is_published` (public-profile
visibility) — while "archive" existed at two levels
(`Strategy.is_archived` and `VersionStatus.ARCHIVED`).

## Decision

**Split the one mutable thing the user edits from the immutable thing a
backtest runs against.**

- **Working copy** — a `strategy_drafts` row, 1:1 with the strategy,
  **eagerly created** at strategy creation (seeded with the default
  definition). Autosave writes here (debounce ~1–2 s, flush on
  navigation/blur, **no validation gate**). The canvas *always* reads
  and writes the working copy — there is no draft-vs-version fallback.
  The frontend guards autosave behind a **hydration flag** so the empty
  initial mount can never be persisted.
- **Strategy version** — an immutable `strategy_versions` row
  `(version_number, definition_json, created_at)`. Frozen
  **automatically when a backtest runs**, never by a user action.
  **Deduplicated by content**: if the working copy is unchanged since
  the latest version, the backtest reuses it, so one version may back
  many backtest runs. There is no `status` column.
- **Publish** means *only* `Strategy.is_published` (public profile).
  There is no publish button and no `/draft/publish` endpoint.
- **Archive** means *only* `Strategy.is_archived`. Version-level archive
  and the `VersionStatus` enum are removed. Archiving a strategy
  preserves its versions and backtest history.
- A version re-enters the working copy only via a deliberate **"restore
  version"** action from a backtest, which overwrites the working copy.

Removed by this decision: the `VersionStatus` enum and `status` column,
the `version_number = 0` reservation, `GET /draft`,
`POST /draft/publish`, `PATCH /versions/{n}/archive`, and the editor
version dropdown.

## Consequences

**Positive:**
- The empty-canvas bug is **structurally impossible**: working copy
  always exists, is the single source of truth, and cannot be clobbered
  by an empty mount. All three root causes are removed by construction,
  not patched.
- `strategy_versions` matches its glossary definition again — genuinely
  immutable, written only by the backtest flow.
- The user-facing surface shrinks: no Publish step, one Archive, one
  source for the canvas.

**Negative:**
- A version is now an *implicit* artifact. A user cannot deliberately
  "save version 3 of my idea" without running a backtest. If a
  named/manual snapshot is ever wanted, this ADR must be reopened.
- The working-copy `definition_json` blob lives in its own table, so
  loading the editor is one extra query/join versus a column on
  `Strategy` (accepted to keep the blob off the hot `list_strategies`
  path).

## Alternatives considered

- **Keep draft as a version row (PR #466), but copy-on-publish instead
  of consume.** Rejected: still two sources for the canvas, still a
  `status` enum spanning two concepts, still needs an explicit publish
  action. Fixes the bug without removing the complexity that caused it.
- **Working copy as a column on `Strategy`** (not a side table).
  Rejected to keep the potentially large definition blob out of the
  already-heavy strategy list query; revisit if the join cost matters
  more than list-query weight.
- **Snapshot a new version on every backtest run (no dedup).** Rejected:
  produces duplicate snapshots and a meaningless version log. Dedup by
  content is one cheap compare per run.

## How to apply

- **Backend authors**: never write `strategy_versions` outside the
  backtest-freeze path; never add a `status`/`is_draft` field to it. The
  working copy is the only mutable definition.
- **Frontend authors**: the canvas reads and writes the working copy
  only. Any code that loads a version onto the canvas must be a
  deliberate "restore" action, not a default load path. Keep autosave
  behind the hydration guard.
- **Reviewers**: a PR that reintroduces a draft-vs-version load
  fallback, a publish-a-version action, or version-level archive is a
  boundary change — require it to reopen this ADR.
