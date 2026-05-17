# FEAT-114 Test Plan

## Scope
Validate the PostgreSQL 18 evaluation documentation for issue #334. The test plan verifies that current database versions are identified, benchmark scope is defined, compatibility and rollback risks are documented, and no implementation changes are included.

## AC to test mapping
- AC-001 -> TC-001
- AC-002 -> TC-002
- AC-003 -> TC-003
- AC-004 -> TC-004
- AC-005 -> TC-005
- AC-006 -> TC-006
- AC-007 -> TC-007
- AC-008 -> TC-008

## Test cases

### TC-001 (AC-001): Repository PostgreSQL versions are identified
- **Input:** Repository Docker Compose files and product documentation.
- **Expected output:** Evaluation notes identify PostgreSQL image tags in each Compose file and call out any mismatch with `docs/product/product.md`.
- **Exact command:** `rg -n "image:\\s*postgres:|PostgreSQL|Image: postgres" docker-compose.yml docker-compose.prod.yml docs/product/product.md docs/features/FEAT-114-evaluate-postgresql-18-backtest-workloads.md`
- **Verification steps:**
  1. Run the command from the repository root.
  2. Confirm `docker-compose.yml` and `docker-compose.prod.yml` PostgreSQL image tags are visible.
  3. Confirm the evaluation notes explicitly identify the current repository tags.
  4. Confirm any product documentation mismatch is recorded without editing `docs/product/product.md`.

### TC-002 (AC-002): Production PostgreSQL version is confirmed or blocked explicitly
- **Input:** Maintainer-provided production database version evidence or documented lack of access.
- **Expected output:** Evaluation notes record the production PostgreSQL version or state that confirmation is blocked pending maintainer access.
- **Exact command:** `rg -n "production PostgreSQL|deployed PostgreSQL|blocked pending maintainer|confirmed production version" docs/features/FEAT-114-evaluate-postgresql-18-backtest-workloads.md`
- **Manual verification steps:**
  1. Check the evaluation notes after the research step is performed.
  2. Confirm they do not infer production version solely from local Compose files.
  3. If production access was unavailable, confirm the blocker is explicit and actionable.

### TC-003 (AC-003): Representative backtest workloads are defined
- **Input:** Evaluation notes for selected benchmark scenarios.
- **Expected output:** At least three benchmark scenarios are documented: candle range reads, existing candle lookup plus gap detection, and backtest run/history queries.
- **Exact command:** `rg -n "candle range|gap detection|backtest run|history queries|benchmark scenario|representative workload" docs/features/FEAT-114-evaluate-postgresql-18-backtest-workloads.md`
- **Verification steps:**
  1. Run the command from the repository root.
  2. Confirm all three required workload categories are present.
  3. Confirm the scenarios describe behavior to measure, not implementation changes.

### TC-004 (AC-004): PostgreSQL 18 benchmark comparison is recorded
- **Input:** Benchmark evidence comparing PostgreSQL 18 with the current PostgreSQL line.
- **Expected output:** Evaluation notes include same-dataset, same-query-shape benchmark results with latency or throughput measurements for each representative workload.
- **Exact command:** `rg -n "PostgreSQL 18|same dataset|same query|latency|throughput|query plan|benchmark result" docs/features/FEAT-114-evaluate-postgresql-18-backtest-workloads.md`
- **Manual verification steps:**
  1. Review the benchmark evidence after the evaluation is completed.
  2. Confirm PostgreSQL 18 and the current PostgreSQL line were compared under comparable conditions.
  3. Confirm results include numeric measurements, not only qualitative claims.
  4. Confirm benchmark limitations such as cache state, dataset size, and hardware class are noted.

### TC-005 (AC-005): PostgreSQL 18 feature review stays out of implementation scope
- **Input:** Evaluation notes discussing PostgreSQL 18 features.
- **Expected output:** Notes review `uuidv7()`, virtual generated columns, and native OAuth 2.0 support as future considerations only.
- **Exact command:** `rg -n "uuidv7|virtual generated columns|OAuth 2\\.0|future|out of scope|Non-goals" docs/features/FEAT-114-evaluate-postgresql-18-backtest-workloads.md`
- **Verification steps:**
  1. Run the command from the repository root.
  2. Confirm each PostgreSQL 18 feature from the issue is mentioned.
  3. Confirm the spec keeps adoption of those features outside this feature.

### TC-006 (AC-006): Compatibility review covers the required stack
- **Input:** Evaluation compatibility notes.
- **Expected output:** Compatibility status is documented for Docker images, extensions, SQLModel, SQLAlchemy, Alembic, database drivers, CI, backups, restore procedures, and Docker Compose workflows.
- **Exact command:** `rg -n "Docker image|extension|SQLModel|SQLAlchemy|Alembic|psycopg|driver|CI|backup|restore|Docker Compose" docs/features/FEAT-114-evaluate-postgresql-18-backtest-workloads.md`
- **Verification steps:**
  1. Run the command from the repository root.
  2. Confirm every required compatibility area appears in the evaluation notes.
  3. Confirm incompatible or unknown areas are documented as risks or blockers.

### TC-007 (AC-007): Recommendation includes risk, rollback, and approval gates
- **Input:** Final evaluation recommendation.
- **Expected output:** Recommendation states defer, continue benchmarking, or create a separate implementation feature, and includes migration risk, rollback approach, and explicit human approval requirements.
- **Exact command:** `rg -n "defer|more benchmarks|separate .*implementation|migration risk|rollback|human approval|approval gate|risk-high" docs/features/FEAT-114-evaluate-postgresql-18-backtest-workloads.md`
- **Verification steps:**
  1. Run the command from the repository root.
  2. Confirm the recommendation does not authorize an autonomous database upgrade.
  3. Confirm rollback and approval requirements are documented before any future implementation.

### TC-008 (AC-008): Change set remains documentation-only
- **Input:** Git working tree after this feature spec step.
- **Expected output:** Only the FEAT-114 feature spec and FEAT-114 test plan are added or changed; no source, migration, dependency, Docker Compose, or production configuration files are modified.
- **Exact command:** `git diff --name-only`
- **Verification steps:**
  1. Run the command from the repository root.
  2. Confirm the diff contains only `docs/features/FEAT-114-evaluate-postgresql-18-backtest-workloads.md` and `docs/testing/FEAT-114-test-plan.md`.
  3. If other files appear, inspect them and remove unrelated changes unless they were explicitly requested separately.
