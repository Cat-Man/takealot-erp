# Bulk Own Listing Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a batch action that syncs seller-side listing data for all active products.

**Architecture:** Mirror the existing `refreshActiveProducts()` pattern, but keep seller-side sync isolated from market refresh. Add a batch service method and API route that only touches `active !== false` products, then expose a top-level dashboard action that updates product state without generating market snapshots.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, local JSON storage

### Task 1: Add failing service tests for bulk own listing sync

**Files:**
- Modify: `src/lib/service.test.ts`

**Step 1: Write the failing test**

Cover:
- syncing active own listings skips disabled products
- batch sync persists seller-side fields for active products only

**Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/service.test.ts`
Expected: FAIL because no bulk own-listing sync method exists yet.

### Task 2: Implement batch own listing sync in the service layer

**Files:**
- Modify: `src/lib/service.ts`

**Step 1: Write minimal implementation**

Implement:
- `syncActiveOwnListings()`
- result payload including `results` plus `requestedCount / syncedCount / skippedCount`

**Step 2: Run test to verify it passes**

Run: `pnpm test src/lib/service.test.ts`
Expected: PASS

### Task 3: Expose batch own listing sync through API

**Files:**
- Create: `src/app/api/products/sync-own-listings-active/route.ts`
- Modify: `src/app/api/products/routes.test.ts`

**Step 1: Write the failing route test**

Cover:
- posting to `/api/products/sync-own-listings-active` syncs only active products
- response returns batch summary and updated products

**Step 2: Run test to verify it fails**

Run: `pnpm test src/app/api/products/routes.test.ts`
Expected: FAIL because the route does not exist yet.

**Step 3: Write minimal implementation**

Implement:
- batch route calling `service.syncActiveOwnListings()`

**Step 4: Run test to verify it passes**

Run: `pnpm test src/app/api/products/routes.test.ts`
Expected: PASS

### Task 4: Surface batch own listing sync in the dashboard

**Files:**
- Modify: `src/components/dashboard.tsx`
- Modify: `src/components/dashboard.test.tsx`

**Step 1: Write the failing UI test**

Cover:
- dashboard shows a `同步 active 卖家数据` action

**Step 2: Run test to verify it fails**

Run: `pnpm test src/components/dashboard.test.tsx`
Expected: FAIL because the dashboard does not expose the batch own-listing sync action.

**Step 3: Write minimal implementation**

Implement:
- top-level batch own-listing sync button
- product state updates from returned batch results

**Step 4: Run test to verify it passes**

Run: `pnpm test src/components/dashboard.test.tsx`
Expected: PASS

### Task 5: Update docs and verify end-to-end

**Files:**
- Modify: `README.md`

**Step 1: Update docs**

Document:
- batch own-listing sync scope
- it only syncs seller-side fields for active products

**Step 2: Run full verification**

Run:
- `pnpm test`
- `pnpm lint`
- `pnpm build`

Expected: PASS
