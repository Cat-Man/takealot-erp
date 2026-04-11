# Marketplace API Alignment Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align the current Takealot seller integration with the published Marketplace API v1 for auth defaults, own-offer reads, and readiness behavior without doing a broad naming refactor yet.

**Architecture:** Keep the existing `takealot-seller-api` module name for now, but make its runtime defaults follow the official Marketplace API: production base URL, `X-API-Key` auth header, and documented `/offers/by_sku/{sku}` style offer access. Normalize official offer payload fields such as `selling_price`, `updated_at`, and `seller_warehouse_stock`, and guard live writes behind documented-by-SKU behavior plus an available seller SKU.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, fetch-based HTTP transport, local JSON settings

### Task 1: Add failing provider tests for Marketplace API defaults and official offer payloads

**Files:**
- Modify: `src/integrations/takealot-seller-api.test.ts`

**Step 1: Write the failing tests**

Cover:
- default config uses official Marketplace API base URL
- default auth header is `X-API-Key` with no bearer prefix
- default own-listing path uses Marketplace `by_sku`
- official offer payload fields normalize correctly, including `selling_price`, `updated_at`, and stock from `seller_warehouse_stock`
- live `applyPrice()` issues a PATCH to the Marketplace `by_sku` endpoint when `dryRun=false`

**Step 2: Run test to verify it fails**

Run: `pnpm test src/integrations/takealot-seller-api.test.ts`
Expected: FAIL because defaults still use placeholder seller API wiring and live writes still require injected transport.

### Task 2: Update readiness and settings defaults to reflect Marketplace API

**Files:**
- Modify: `src/integrations/takealot-seller-api.ts`
- Modify: `src/lib/takealot-seller-api-settings.ts`
- Modify: `src/app/api/products/routes.test.ts`
- Modify: `src/app/api/integrations/takealot-seller-api/settings/route.test.ts`
- Modify: `src/components/dashboard.test.tsx`

**Step 1: Write the failing readiness/settings assertions**

Cover:
- readiness no longer reports a fake placeholder auth mode when official defaults are enough
- GUI/settings report official default base URL and auth header defaults
- gui-saved settings can rely on Marketplace-aligned defaults while still allowing overrides

**Step 2: Run targeted tests to verify they fail**

Run:
- `pnpm test src/app/api/products/routes.test.ts`
- `pnpm test src/app/api/integrations/takealot-seller-api/settings/route.test.ts`
- `pnpm test src/components/dashboard.test.tsx`
Expected: FAIL because existing expectations still assume placeholder seller API defaults.

### Task 3: Implement Marketplace API aligned provider behavior

**Files:**
- Modify: `src/integrations/takealot-seller-api.ts`

**Step 1: Write minimal implementation**

Implement:
- official default base URL `https://marketplace-api.takealot.com/v1`
- default auth header `X-API-Key`
- official default own-listing path template using by-SKU
- path resolution fallback from `sellerSku` to `product.id`
- payload normalization for official offer field names and warehouse stock arrays
- live PATCH write path for documented Marketplace `by_sku` updates when not in dry-run mode

**Step 2: Run provider tests to verify they pass**

Run: `pnpm test src/integrations/takealot-seller-api.test.ts`
Expected: PASS

### Task 4: Implement Marketplace-aligned readiness, settings, and UI defaults

**Files:**
- Modify: `src/lib/takealot-seller-api-settings.ts`
- Modify: `src/app/api/integrations/takealot-seller-api/settings/route.ts`
- Modify: `src/components/seller-api-settings-panel.tsx`
- Modify: `src/components/dashboard.test.tsx`
- Modify: `src/app/api/products/routes.test.ts`
- Modify: `src/app/api/integrations/takealot-seller-api/settings/route.test.ts`

**Step 1: Write minimal implementation**

Implement:
- settings reports official default base URL / auth header / path template when not overridden
- readiness messages refer to Marketplace API rather than a placeholder seller API contract
- UI defaults show `X-API-Key` and Marketplace-aligned path expectations

**Step 2: Run targeted tests to verify they pass**

Run:
- `pnpm test src/app/api/products/routes.test.ts`
- `pnpm test src/app/api/integrations/takealot-seller-api/settings/route.test.ts`
- `pnpm test src/components/dashboard.test.tsx`
Expected: PASS

### Task 5: Update docs and verify end-to-end

**Files:**
- Modify: `README.md`

**Step 1: Update docs**

Document:
- the integration is now aligned to Marketplace API v1 defaults
- `X-API-Key` is the official auth header
- own-offer reads/writes use the Marketplace offers API shape
- market intelligence is still not provided by this API

**Step 2: Run full verification**

Run:
- `pnpm test`
- `pnpm lint`
- `pnpm build`

Expected: PASS
