# Active Monitoring, Snapshot History, And Batch Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add per-SKU monitoring enablement, persist market snapshot history, and support refreshing all active products in one operation.

**Architecture:** Extend the existing JSON-backed `ProductService` instead of introducing a scheduler or queue layer yet. Keep refresh and manual market import as the only snapshot producers, store snapshots separately from the product object, and expose a small batch-refresh API that only touches products with monitoring enabled.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, local JSON storage

### Task 1: Add active monitoring state to products

**Files:**
- Modify: `src/core/types.ts`
- Modify: `src/lib/fixtures.ts`
- Modify: `src/lib/service.ts`
- Test: `src/lib/service.test.ts`

**Step 1: Write the failing test**

Cover:
- seeded products default to active monitoring enabled
- product active flag can be updated and persists to storage
- batch refresh ignores products where `active === false`

**Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/service.test.ts`
Expected: FAIL because products do not have an active flag and there is no batch refresh filter yet.

**Step 3: Write minimal implementation**

Implement:
- `ProductMonitor.active?: boolean`
- seed fixtures default `active: true`
- `ProductService.updateProductSettings()` or equivalent method for toggling `active`
- `ProductService.refreshActiveProducts()` iterates only active products

**Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/service.test.ts`
Expected: PASS

### Task 2: Persist market snapshot history

**Files:**
- Modify: `src/core/types.ts`
- Modify: `src/lib/store.ts`
- Modify: `src/lib/service.ts`
- Test: `src/lib/service.test.ts`

**Step 1: Write the failing test**

Cover:
- successful product refresh stores a market snapshot entry
- manual market import stores a market snapshot entry
- snapshots are stored in reverse chronological order and tied to the correct product id

**Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/service.test.ts`
Expected: FAIL because store state has no snapshot history and refresh/import do not persist snapshots.

**Step 3: Write minimal implementation**

Implement:
- `MarketSnapshot` type with `id`, `productId`, `productTitle`, `marketProvider`, `offers`, `preview`, `capturedAt`, optional `source`
- `StoreState.marketSnapshots`
- helper inside `ProductService` to prepend snapshots from both `refreshProduct()` and `updateManualMarketSnapshot()`
- read helpers to fetch recent snapshots for a product

**Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/service.test.ts`
Expected: PASS

### Task 3: Expose batch refresh and product settings through API

**Files:**
- Create: `src/app/api/products/refresh-active/route.ts`
- Create or Modify: `src/app/api/products/[id]/settings/route.ts`
- Modify: `src/app/api/products/route.ts`
- Modify: `src/app/api/products/routes.test.ts`

**Step 1: Write the failing route tests**

Cover:
- listing products returns `marketSnapshots`
- patching product settings updates `active`
- posting to `/api/products/refresh-active` refreshes only active products and returns a summary payload

**Step 2: Run test to verify it fails**

Run: `pnpm test src/app/api/products/routes.test.ts`
Expected: FAIL because the new route and response fields do not exist yet.

**Step 3: Write minimal implementation**

Implement:
- product settings route for `active`
- batch refresh route calling `service.refreshActiveProducts()`
- products list route includes `marketSnapshots`

**Step 4: Run test to verify it passes**

Run: `pnpm test src/app/api/products/routes.test.ts`
Expected: PASS

### Task 4: Surface active toggles and recent snapshots in the dashboard

**Files:**
- Modify: `src/components/dashboard.tsx`
- Modify: `src/components/product-card.tsx`
- Modify: `src/components/dashboard.test.tsx`

**Step 1: Write the failing UI test**

Cover:
- product cards show active monitoring status and toggle action
- dashboard exposes batch refresh action
- recent snapshot summary is visible for each product when history exists

**Step 2: Run test to verify it fails**

Run: `pnpm test src/components/dashboard.test.tsx`
Expected: FAIL because the dashboard does not expose active controls or snapshot history.

**Step 3: Write minimal implementation**

Implement:
- dashboard state for `marketSnapshots`
- save product settings flow
- refresh active products flow
- recent snapshot summary in product cards without adding charts yet

**Step 4: Run test to verify it passes**

Run: `pnpm test src/components/dashboard.test.tsx`
Expected: PASS

### Task 5: Update docs and verify end-to-end

**Files:**
- Modify: `README.md`
- Modify: `docs/bmad/ARCHITECTURE.md`

**Step 1: Update docs**

Document:
- active monitoring semantics
- snapshot history behavior
- batch refresh endpoint and current non-scheduled scope
- note that this workspace is not a git repo, so commit steps are intentionally skipped

**Step 2: Run full verification**

Run:
- `pnpm test`
- `pnpm lint`
- `pnpm build`

Expected: PASS
