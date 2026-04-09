# Provider Controls And Dry-Run Safety Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make split providers configurable from the app, and make Seller API dry-run behavior auditable and non-destructive.

**Architecture:** Keep the existing `ProductService` as the orchestration layer, but tighten write semantics so `dry-run` does not mutate persisted prices. Add a small provider-settings API route and surface seller/market provider bindings in the dashboard, without assuming any new real Takealot endpoint details.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, local JSON storage

### Task 1: Make dry-run executions explicit and non-destructive

**Files:**
- Modify: `src/integrations/marketplace.ts`
- Modify: `src/integrations/mock-provider.ts`
- Modify: `src/integrations/takealot-seller-api.ts`
- Modify: `src/core/types.ts`
- Modify: `src/lib/service.ts`
- Test: `src/integrations/takealot-seller-api.test.ts`
- Test: `src/lib/service.test.ts`

**Step 1: Write the failing tests**

Cover:
- Seller API provider returns explicit `dry-run` execution mode
- Product service records `dry_run` execution status
- Product current price stays unchanged when the write provider is in dry-run

**Step 2: Run tests to verify they fail**

Run:
- `pnpm test src/integrations/takealot-seller-api.test.ts`
- `pnpm test src/lib/service.test.ts`

Expected: FAIL because dry-run is still treated like a live write.

**Step 3: Write minimal implementation**

Implement:
- `ApplyPriceResult.mode`
- `PriceExecution.status` adds `dry_run`
- `ProductService.applySuggestedPrice()` keeps current price unchanged for dry-run

**Step 4: Run tests to verify they pass**

Run:
- `pnpm test src/integrations/takealot-seller-api.test.ts`
- `pnpm test src/lib/service.test.ts`

Expected: PASS

### Task 2: Add product provider settings API

**Files:**
- Create: `src/app/api/products/[id]/providers/route.ts`
- Test: `src/app/api/products/routes.test.ts`

**Step 1: Write the failing test**

Cover:
- patching `sellerProvider`
- patching `marketProvider`
- response returns updated product

**Step 2: Run test to verify it fails**

Run: `pnpm test src/app/api/products/routes.test.ts`
Expected: FAIL because the route does not exist yet.

**Step 3: Write minimal implementation**

Implement:
- PATCH route
- call `service.updateProductProviders()`

**Step 4: Run test to verify it passes**

Run: `pnpm test src/app/api/products/routes.test.ts`
Expected: PASS

### Task 3: Surface provider bindings and dry-run state in the dashboard

**Files:**
- Modify: `src/components/dashboard.tsx`
- Modify: `src/components/dashboard.test.tsx`
- Modify: `src/components/product-card.tsx`
- Modify: `src/components/execution-table.tsx`

**Step 1: Write the failing UI test**

Cover:
- product cards show seller provider and market provider
- execution history shows dry-run status text

**Step 2: Run test to verify it fails**

Run: `pnpm test src/components/dashboard.test.tsx`
Expected: FAIL because the UI does not show split providers or dry-run messaging.

**Step 3: Write minimal implementation**

Implement:
- provider labels in product cards
- provider settings save flow in dashboard
- dry-run status label in execution table

**Step 4: Run test to verify it passes**

Run: `pnpm test src/components/dashboard.test.tsx`
Expected: PASS

### Task 4: Full verification

**Files:**
- Modify: `README.md`

**Step 1: Update docs**

Document:
- provider settings endpoint / UI
- dry-run no longer mutates local current price

**Step 2: Run full verification**

Run:
- `pnpm test`
- `pnpm lint`
- `pnpm build`

Expected: PASS
