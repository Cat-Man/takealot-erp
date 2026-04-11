# Marketplace Offer Table And Competition Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Sync the seller account's Marketplace API offers into the app, render them in a table-first repricing page, and support on-demand front-end competition refresh using generated public product URLs.

**Architecture:** Reuse the existing `ProductMonitor` store instead of introducing a parallel catalog model. Add Marketplace offer metadata to `ProductMonitor`, add a seller-offer sync method that maps `GET /offers` responses into stored products, then render a dedicated table component for `takealot-seller-api` products. Keep competition refresh separate from the seller API contract: generate a public product URL from `title + productline_id`, cache the lowest competitor result back onto the product, and only refresh it when the user explicitly requests per-row or batch refresh.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, local JSON store, Takealot Marketplace API, Playwright-backed public-page extraction

### Task 1: Add failing tests for Marketplace offer sync into stored products

**Files:**
- Modify: `src/integrations/takealot-seller-api.test.ts`
- Modify: `src/lib/service.test.ts`
- Modify: `src/app/api/products/routes.test.ts`

**Step 1: Write the failing tests**

Cover:
- `TakealotSellerApiProvider.listOwnOffers()` calls `GET /offers` with Marketplace defaults and pagination-safe response parsing
- provider normalizes offer fields into app-facing values: `offer_id`, `tsin_id`, `sku`, `title`, `selling_price`, `status`, `image_url`, `productline_id`, `benchmark_price`, `listing_quality`, `seller_warehouse_stock`
- `ProductService.syncSellerCatalog()` upserts Marketplace offers into `products`
- synced products generate public product URLs from `title + productline_id`
- synced products default to `sellerProvider=takealot-seller-api` and preserve repricing rules when the same SKU already exists

**Step 2: Run tests to verify they fail**

Run:
- `pnpm test src/integrations/takealot-seller-api.test.ts`
- `pnpm test src/lib/service.test.ts`
- `pnpm test src/app/api/products/routes.test.ts`

Expected: FAIL because the provider does not yet list offers and the service has no catalog sync method.

### Task 2: Implement Marketplace offer sync and API surface

**Files:**
- Modify: `src/core/types.ts`
- Modify: `src/integrations/marketplace.ts`
- Modify: `src/integrations/takealot-seller-api.ts`
- Modify: `src/lib/service.ts`
- Modify: `src/app/api/products/route.ts`
- Create: `src/app/api/products/sync-seller-catalog/route.ts`

**Step 1: Write minimal implementation**

Implement:
- seller-catalog metadata on `ProductMonitor`
- `listOwnOffers()` on the Takealot provider using `GET /offers`
- service-level `syncSellerCatalog()` that maps Marketplace offers into stored products
- public product URL generation from title slug + `PLID`
- route to trigger seller-catalog sync and return summary
- `GET /api/products` response extended with the synced products data already stored in `products`

**Step 2: Run tests to verify they pass**

Run:
- `pnpm test src/integrations/takealot-seller-api.test.ts`
- `pnpm test src/lib/service.test.ts`
- `pnpm test src/app/api/products/routes.test.ts`

Expected: PASS

### Task 3: Add failing tests for table-first seller offer UI

**Files:**
- Modify: `src/components/dashboard.test.tsx`
- Create: `src/components/seller-offer-table.test.tsx`

**Step 1: Write the failing tests**

Cover:
- seller-api products render in a table-style section instead of card-only view
- columns include image, title, SKU, TSIN, PLID, current price, lowest competitor, suggested price, listing status, stock, and actions
- table exposes sync catalog, refresh competition, and apply price actions
- non-seller-api mock seed products still render in the existing card layout

**Step 2: Run tests to verify they fail**

Run:
- `pnpm test src/components/dashboard.test.tsx src/components/seller-offer-table.test.tsx`

Expected: FAIL because the dashboard does not yet render a seller-offer table.

### Task 4: Implement seller-offer table UI and catalog sync actions

**Files:**
- Modify: `src/components/dashboard.tsx`
- Create: `src/components/seller-offer-table.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Write minimal implementation**

Implement:
- split rendering between seller-api table products and legacy card products
- table actions for seller-catalog sync and per-row apply/sync operations
- message/state wiring for the new sync route
- keep existing card workflow intact for mock/manual products

**Step 2: Run tests to verify they pass**

Run:
- `pnpm test src/components/dashboard.test.tsx src/components/seller-offer-table.test.tsx`

Expected: PASS

### Task 5: Add failing tests for explicit competition refresh and cached lowest-price data

**Files:**
- Modify: `src/lib/service.test.ts`
- Modify: `src/app/api/products/routes.test.ts`

**Step 1: Write the failing tests**

Cover:
- refresh-market on one synced seller product stores lowest competitor price and seller
- the suggestion preview updates from cached competition data
- batch refresh only processes active seller-api products
- generated public product URL is used unless a manual override exists

**Step 2: Run tests to verify they fail**

Run:
- `pnpm test src/lib/service.test.ts`
- `pnpm test src/app/api/products/routes.test.ts`

Expected: FAIL because the app has no competition refresh workflow yet.

### Task 6: Implement explicit competition refresh with Playwright-backed extraction seam

**Files:**
- Create: `src/lib/takealot-public-product.ts`
- Modify: `src/lib/runtime.ts`
- Modify: `src/lib/service.ts`
- Create: `src/app/api/products/[id]/refresh-competition/route.ts`
- Create: `src/app/api/products/refresh-competition-active/route.ts`

**Step 1: Write minimal implementation**

Implement:
- public product URL builder and manual override support
- extraction seam returning `lowest competitor / other offers / capturedAt`
- service methods for single-item and active-only competition refresh
- route handlers for single and batch competition refresh
- cache result back onto the product so the page loads fast after refresh

**Step 2: Run tests to verify they pass**

Run:
- `pnpm test src/lib/service.test.ts`
- `pnpm test src/app/api/products/routes.test.ts`

Expected: PASS

### Task 7: Update docs and verify end-to-end

**Files:**
- Modify: `README.md`

**Step 1: Update docs**

Document:
- seller catalog sync now uses `GET /offers`
- public competition refresh is separate from Marketplace API
- lowest competitor refresh is explicit per-row / batch, not page-load automatic
- Playwright profile requirement for logged-in front-end extraction

**Step 2: Run full verification**

Run:
- `pnpm test`
- `pnpm lint`
- `pnpm build`

Expected: PASS
