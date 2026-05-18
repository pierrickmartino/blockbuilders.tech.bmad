# FEAT-117 Test Plan: Batch Frontend Dependency Updates

## Test cases

### TC-001 React and React DOM are pinned together
**Acceptance criterion:** AC-001

**Input:** Inspect the frontend dependency manifest after implementation.

**Expected output:** `frontend/package.json` contains `"react": "19.2.6"` and `"react-dom": "19.2.6"`.

**Exact command:** `cd frontend && node -e 'const pkg=require("./package.json"); if (pkg.dependencies.react !== "19.2.6" || pkg.dependencies["react-dom"] !== "19.2.6") process.exit(1)'`

### TC-002 Tailwind remains on v3
**Acceptance criterion:** AC-002

**Input:** Inspect the frontend dependency manifest and Tailwind configuration after implementation.

**Expected output:** `tailwindcss` is set to `3.4.19`, `frontend/tailwind.config.ts` still exists, and no Tailwind v4 dependency or migration artifact is present.

**Exact command:** `cd frontend && node -e 'const pkg=require("./package.json"); if (pkg.devDependencies.tailwindcss !== "3.4.19") process.exit(1)' && test -f tailwind.config.ts && ! rg 'tailwindcss@4|@tailwindcss/postcss|tailwindcss": "\^?4' package.json postcss.config.js tailwind.config.ts`

### TC-003 TypeScript resolves to 5.9
**Acceptance criterion:** AC-003

**Input:** Inspect the frontend dependency manifest and npm lockfile after implementation.

**Expected output:** `frontend/package.json` allows TypeScript 5.9 and `frontend/package-lock.json` resolves `typescript` to a `5.9.x` version.

**Exact command:** `cd frontend && node -e 'const pkg=require("./package.json"); const lock=require("./package-lock.json"); const spec=pkg.devDependencies.typescript || ""; const resolved=lock.packages["node_modules/typescript"].version || ""; if (!/^(\^)?5\.9/.test(spec) || !/^5\.9\./.test(resolved)) process.exit(1)'`

### TC-004 Package lock is consistent with package manifest
**Acceptance criterion:** AC-004

**Input:** Ask npm to validate the dependency graph from the updated frontend manifest and lockfile.

**Expected output:** npm reports the requested versions for React, React DOM, Tailwind CSS, and TypeScript without lockfile consistency errors.

**Exact command:** `cd frontend && npm ls react react-dom tailwindcss typescript --depth=0`

### TC-005 Diff stays maintenance-only
**Acceptance criterion:** AC-005

**Input:** Inspect the implementation diff.

**Expected output:** The diff is limited to `frontend/package.json`, `frontend/package-lock.json`, and any minimal frontend compatibility fixes required by lint or build failures; it does not include backend, migration, auth, billing, backtesting, or unrelated feature changes.

**Exact command:** `git diff --name-only`

**Manual verification steps:** Review every path returned by the command. Confirm any source-code path outside `frontend/package.json` and `frontend/package-lock.json` is directly justified by a frontend lint or build compatibility failure.

### TC-006 Frontend verification passes
**Acceptance criterion:** AC-006

**Input:** Run the executable frontend verification commands available in this repo.

**Expected output:** ESLint and the Next.js production build complete successfully.

**Exact command:** `cd frontend && npm run lint && npm run build`

**Manual verification steps:** Confirm that `frontend/package.json` still has no `test` script. If a test script is added by a separate approved feature before implementation, run `cd frontend && npm test && npm run lint && npm run build` instead and record the result.
