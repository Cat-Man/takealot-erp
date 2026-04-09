# Manual Market Import Provider Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `manual-import` market provider so operators can enter a lowest competitor price manually and still drive the repricing workflow.

**Architecture:** Store one optional manual market snapshot on each product, expose a dedicated `manual-import` market provider, and add a small API/UI flow that saves the snapshot and immediately refreshes pricing preview. Keep seller operations unchanged and reuse the existing repricing engine.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, local JSON storage

### Task 1: Add manual market snapshot data and provider

**Files:**
- Modify: `src/core/types.ts`
- Modify: `src/lib/runtime.ts`
- Create: `src/integrations/manual-import-provider.ts`
- Create: `src/integrations/manual-import-provider.test.ts`

**Step 1: Write the failing test**

Cover:
- `manual-import` provider returns the stored manual competitor offer
- missing manual snapshot returns an empty list

**Step 2: Run test to verify it fails**

Run: `pnpm test src/integrations/manual-import-provider.test.ts`
Expected: FAIL because the provider does not exist yet.

**Step 3: Write minimal implementation**

Implement:
- `ProviderKind` adds `manual-import`
- product model adds optional manual market snapshot fields
- new provider reads those fields and returns `MarketOffer[]`
- runtime registers `manual-import` as a market-only provider

**Step 4: Run test to verify it passes**

Run: `pnpm test src/integrations/manual-import-provider.test.ts`
Expected: PASS

### Task 2: Add service + API flow for saving a manual lowest competitor

**Files:**
- Modify: `src/lib/service.ts`
- Modify: `src/lib/service.test.ts`
- Modify: `src/app/api/products/routes.test.ts`
- Create: `src/app/api/products/[id]/manual-market/route.ts`

**Step 1: Write the failing tests**

Cover:
- saving a manual competitor snapshot persists seller/price/timestamp
- saving the snapshot switches `marketProvider` to `manual-import`
- route returns refreshed preview using the manual competitor price

**Step 2: Run tests to verify they fail**

Run:
- `pnpm test src/lib/service.test.ts`
- `pnpm test src/app/api/products/routes.test.ts`

Expected: FAIL because no manual snapshot save flow exists.

**Step 3: Write minimal implementation**

Implement:
- `updateManualMarketSnapshot()` in service
- dedicated PATCH route
- route calls service and then refreshes the product

**Step 4: Run tests to verify they pass**

Run:
- `pnpm test src/lib/service.test.ts`
- `pnpm test src/app/api/products/routes.test.ts`

Expected: PASS

### Task 3: Add dashboard form for manual lowest price input

**Files:**
- Modify: `src/components/product-card.tsx`
- Modify: `src/components/dashboard.tsx`
- Modify: `src/components/dashboard.test.tsx`

**Step 1: Write the failing UI test**

Cover:
- product card shows manual market input controls
- a product using `manual-import` shows the imported competitor summary

**Step 2: Run test to verify it fails**

Run: `pnpm test src/components/dashboard.test.tsx`
Expected: FAIL because the dashboard has no manual market import controls.

**Step 3: Write minimal implementation**

Implement:
- manual seller/price form
- dashboard save handler calling `/manual-market`
- imported competitor summary copy

**Step 4: Run test to verify it passes**

Run: `pnpm test src/components/dashboard.test.tsx`
Expected: PASS

### Task 4: Full verification and docs

**Files:**
- Modify: `README.md`
- Modify: `docs/bmad/INTEGRATION-PLAN.md`

**Step 1: Update docs**

Document:
- `manual-import` as current fallback for lowest competitor data
- manual snapshot save flow

**Step 2: Run full verification**

Run:
- `pnpm test`
- `pnpm lint`
- `pnpm build`

Expected: PASS
