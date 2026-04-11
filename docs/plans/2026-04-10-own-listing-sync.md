# Own Listing Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dedicated own-listing sync flow so the app can fetch and persist seller-side product data separately from market price refresh.

**Architecture:** Keep market refresh and seller listing sync as separate service actions. Extend the seller-side snapshot model with optional seller-specific fields such as stock and listing status, add a dedicated sync API route, and surface the synced seller data in the dashboard without claiming any unverified Takealot market-data API support.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, local JSON storage

### Task 1: Add failing service tests for own listing sync

**Files:**
- Modify: `src/lib/service.test.ts`
- Modify: `src/integrations/takealot-seller-api.test.ts`

**Step 1: Write the failing tests**

Cover:
- syncing own listing updates local product seller-side fields
- seller sync does not create market snapshots
- Seller API provider can fetch a normalized own listing through injected transport without hardcoding an endpoint

**Step 2: Run tests to verify they fail**

Run:
- `pnpm test src/lib/service.test.ts`
- `pnpm test src/integrations/takealot-seller-api.test.ts`

Expected: FAIL because no own-listing sync method or transport-backed read path exists yet.

### Task 2: Implement seller-side own listing sync

**Files:**
- Modify: `src/core/types.ts`
- Modify: `src/integrations/marketplace.ts`
- Modify: `src/integrations/mock-provider.ts`
- Modify: `src/integrations/takealot-seller-api.ts`
- Modify: `src/lib/service.ts`

**Step 1: Write minimal implementation**

Implement:
- optional seller-side fields on `ProductMonitor`
- extended `OwnListingSnapshot` with optional `sellerSku`, `stockQuantity`, `listingStatus`
- `ProductService.syncOwnListing()`
- mock provider returns normalized own listing metadata
- Seller API provider supports `fetchOwnListing()` only when a transport is injected, while still avoiding hardcoded protocol details

**Step 2: Run tests to verify they pass**

Run:
- `pnpm test src/lib/service.test.ts`
- `pnpm test src/integrations/takealot-seller-api.test.ts`

Expected: PASS

### Task 3: Expose own listing sync through API

**Files:**
- Create: `src/app/api/products/[id]/sync-own-listing/route.ts`
- Modify: `src/app/api/products/routes.test.ts`

**Step 1: Write the failing route test**

Cover:
- posting to `/api/products/:id/sync-own-listing` returns updated seller-side product data

**Step 2: Run test to verify it fails**

Run: `pnpm test src/app/api/products/routes.test.ts`
Expected: FAIL because the route does not exist yet.

**Step 3: Write minimal implementation**

Implement:
- dedicated route calling `service.syncOwnListing()`

**Step 4: Run test to verify it passes**

Run: `pnpm test src/app/api/products/routes.test.ts`
Expected: PASS

### Task 4: Surface own listing sync in the dashboard

**Files:**
- Modify: `src/components/dashboard.tsx`
- Modify: `src/components/product-card.tsx`
- Modify: `src/components/dashboard.test.tsx`
- Modify: `src/app/globals.css`

**Step 1: Write the failing UI test**

Cover:
- product card shows seller-side status fields after sync
- product card exposes a sync own listing button

**Step 2: Run test to verify it fails**

Run: `pnpm test src/components/dashboard.test.tsx`
Expected: FAIL because the UI does not yet display seller-side sync data or action.

**Step 3: Write minimal implementation**

Implement:
- dashboard fetch flow for own listing sync
- product card rendering for stock, listing status, and last seller sync time
- sync button in product card

**Step 4: Run test to verify it passes**

Run: `pnpm test src/components/dashboard.test.tsx`
Expected: PASS

### Task 5: Update docs and verify end-to-end

**Files:**
- Modify: `README.md`
- Modify: `docs/bmad/ARCHITECTURE.md`

**Step 1: Update docs**

Document:
- own listing sync scope
- it reads seller-side data only
- market intelligence still remains a separate concern

**Step 2: Run full verification**

Run:
- `pnpm test`
- `pnpm lint`
- `pnpm build`

Expected: PASS
