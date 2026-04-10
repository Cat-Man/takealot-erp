# Real Seller API Own Listing Read Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the `takealot-seller-api` provider from test-only transport injection to a real, env-configured HTTP read path for seller-side own-listing data.

**Architecture:** Keep the provider conservative: do not hardcode unverified Takealot endpoint paths or auth headers. Instead, load explicit env configuration for auth header and own-listing path template, build a real fetch-based read request when that configuration is present, and normalize common response shapes into `OwnListingSnapshot`. Readiness should only report `canReadOwnListings=true` when the required read config exists.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, fetch-based HTTP transport, env-driven config

### Task 1: Add failing Seller API provider tests for real HTTP own-listing reads

**Files:**
- Modify: `src/integrations/takealot-seller-api.test.ts`

**Step 1: Write the failing tests**

Cover:
- `loadTakealotSellerApiConfig()` loads real-read settings from env
- `fetchOwnListing()` can issue a real HTTP request through `fetch` when read config is present
- response normalization handles a wrapped/common payload shape
- readiness reports `canReadOwnListings=true` only when auth header and own-listing path template are configured

**Step 2: Run test to verify it fails**

Run: `pnpm test src/integrations/takealot-seller-api.test.ts`
Expected: FAIL because the provider still only supports injected transport and readiness still reports reads as unavailable.

### Task 2: Implement env-configured real HTTP own-listing reads

**Files:**
- Modify: `src/integrations/takealot-seller-api.ts`
- Modify: `src/lib/runtime.ts`

**Step 1: Write minimal implementation**

Implement:
- env-driven auth header name / optional prefix loading
- env-driven own-listing path template loading
- fetch-based own-listing request path when no injected transport is provided
- normalized payload extraction from common direct / wrapped JSON shapes
- readiness updates for read capability

**Step 2: Run test to verify it passes**

Run: `pnpm test src/integrations/takealot-seller-api.test.ts`
Expected: PASS

### Task 3: Expose the new read capability through readiness coverage

**Files:**
- Modify: `src/app/api/products/routes.test.ts`

**Step 1: Write the failing route-level readiness test**

Cover:
- readiness route reports `canReadOwnListings=true` when the required read env vars are set

**Step 2: Run test to verify it fails**

Run: `pnpm test src/app/api/products/routes.test.ts`
Expected: FAIL because the readiness route still reports seller-side reads as unavailable even when read config is present.

**Step 3: Write minimal implementation**

Implement:
- no new route required
- only adjust readiness behavior if needed to satisfy the route-level assertion

**Step 4: Run test to verify it passes**

Run: `pnpm test src/app/api/products/routes.test.ts`
Expected: PASS

### Task 4: Update docs for verified operator wiring only

**Files:**
- Modify: `README.md`

**Step 1: Update docs**

Document:
- required env vars for real own-listing reads
- the feature is still contract-driven by verified operator config
- market intelligence and live price writes remain separate and guarded

**Step 2: Run full verification**

Run:
- `pnpm test`
- `pnpm lint`
- `pnpm build`

Expected: PASS
