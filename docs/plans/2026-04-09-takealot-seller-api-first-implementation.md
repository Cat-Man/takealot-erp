# Takealot Seller API First Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Pivot the project from browser-first Takealot integration assumptions to a Seller API-first architecture while preserving the working mock demo.

**Architecture:** Keep the current Next.js app and repricing engine, but split integration responsibilities into seller operations and market intelligence. Add a new `takealot-seller-api` provider as the primary real integration path and demote browser automation to fallback status.

**Tech Stack:** Next.js, React, TypeScript, Vitest, local JSON storage, API-key based provider abstraction

### Task 1: Reframe the integration contracts

**Files:**
- Modify: `src/integrations/marketplace.ts`
- Modify: `src/core/types.ts`
- Test: `src/integrations/marketplace.contracts.test.ts`

**Step 1: Write the failing test**

Describe separate contracts for:
- seller operations
- market intelligence

**Step 2: Run test to verify it fails**

Run: `pnpm test src/integrations/marketplace.contracts.test.ts`
Expected: FAIL because the contracts do not exist yet

**Step 3: Write minimal implementation**

Create distinct interfaces for:
- reading and updating own seller data
- refreshing market snapshots

**Step 4: Run test to verify it passes**

Run: `pnpm test src/integrations/marketplace.contracts.test.ts`
Expected: PASS

### Task 2: Add Seller API provider skeleton

**Files:**
- Create: `src/integrations/takealot-seller-api.ts`
- Create: `src/integrations/takealot-seller-api.test.ts`
- Modify: `src/lib/runtime.ts`

**Step 1: Write the failing test**

Cover:
- missing API key throws clear error
- dry-run mode blocks real writes

**Step 2: Run test to verify it fails**

Run: `pnpm test src/integrations/takealot-seller-api.test.ts`
Expected: FAIL because provider does not exist yet

**Step 3: Write minimal implementation**

Implement:
- env loading
- auth header construction
- dry-run write guard
- placeholder endpoint methods

**Step 4: Run test to verify it passes**

Run: `pnpm test src/integrations/takealot-seller-api.test.ts`
Expected: PASS

### Task 3: Update product service to accept split providers

**Files:**
- Modify: `src/lib/service.ts`
- Modify: `src/lib/service.test.ts`

**Step 1: Write the failing test**

Add one case where:
- own price update comes from seller provider
- lowest price snapshot comes from market provider

**Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/service.test.ts`
Expected: FAIL because service still assumes one provider

**Step 3: Write minimal implementation**

Split refresh/apply responsibilities inside the service layer.

**Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/service.test.ts`
Expected: PASS

### Task 4: Update UI and README to reflect API-first path

**Files:**
- Modify: `README.md`
- Modify: `src/app/page.tsx`
- Modify: `src/components/dashboard.tsx`

**Step 1: Write the failing UI expectation**

Add one test asserting the UI labels Seller API as the preferred real integration path.

**Step 2: Run test to verify it fails**

Run: `pnpm test src/components/dashboard.test.tsx`
Expected: FAIL because the UI still frames browser automation as the main route

**Step 3: Write minimal implementation**

Update copy and docs to reflect:
- current mock state
- Seller API-first next step
- browser fallback status

**Step 4: Run test to verify it passes**

Run: `pnpm test src/components/dashboard.test.tsx`
Expected: PASS

### Task 5: Verify the pivot

**Files:**
- Modify: `docs/bmad/INTEGRATION-PLAN.md`

**Step 1: Run full verification**

Run: `pnpm test`
Expected: PASS

Run: `pnpm lint`
Expected: PASS

Run: `pnpm build`
Expected: PASS
