# Seller API Own Listing Field Mapping Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Takealot Seller API own-listing field extraction configurable so real account responses can be normalized without changing code.

**Architecture:** Extend the local Seller API settings model with optional response-path mappings for seller name, price, currency, captured time, SKU, stock quantity, and listing status. Runtime merges these mappings with env/default behavior, the provider prefers configured paths before built-in heuristics, and the dashboard exposes the mapping fields in the existing Seller API settings panel.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, local JSON persistence

### Task 1: Add failing provider tests for configurable own-listing field mappings

**Files:**
- Modify: `src/integrations/takealot-seller-api.test.ts`

**Step 1: Write the failing tests**

Cover:
- `fetchOwnListing()` prefers configured response paths when the payload uses non-default field names
- configured price extraction works for nested paths like `pricing.current.amount`
- configured status / quantity extraction works for wrapped payloads

**Step 2: Run test to verify it fails**

Run: `pnpm test src/integrations/takealot-seller-api.test.ts`
Expected: FAIL because the provider does not yet accept configurable response paths.

### Task 2: Persist and merge response-path mappings through Seller API settings

**Files:**
- Modify: `src/lib/takealot-seller-api-settings.ts`
- Modify: `src/lib/runtime.ts`
- Modify: `src/app/api/integrations/takealot-seller-api/settings/route.test.ts`

**Step 1: Write the failing settings-route assertions**

Cover:
- PATCH accepts response mapping fields
- GET returns the saved mapping fields
- persisted JSON stores the mapping fields

**Step 2: Run test to verify it fails**

Run: `pnpm test src/app/api/integrations/takealot-seller-api/settings/route.test.ts`
Expected: FAIL because mappings are not yet part of the settings contract.

**Step 3: Write minimal implementation**

Implement:
- new settings fields for response-path mappings
- merged env/settings view carrying those fields into runtime
- settings report exposing the fields back to the UI

**Step 4: Run tests to verify they pass**

Run:
- `pnpm test src/integrations/takealot-seller-api.test.ts`
- `pnpm test src/app/api/integrations/takealot-seller-api/settings/route.test.ts`
Expected: PASS

### Task 3: Implement provider-side configurable payload normalization

**Files:**
- Modify: `src/integrations/takealot-seller-api.ts`

**Step 1: Write minimal implementation**

Implement:
- config fields for each optional response path
- payload normalization that checks configured paths first, then falls back to current heuristics
- keep the provider conservative: only field extraction becomes configurable; endpoint/auth behavior stays unchanged

**Step 2: Run tests to verify it passes**

Run: `pnpm test src/integrations/takealot-seller-api.test.ts`
Expected: PASS

### Task 4: Surface the mapping fields in the existing GUI settings panel

**Files:**
- Modify: `src/components/dashboard.test.tsx`
- Modify: `src/components/seller-api-settings-panel.tsx`

**Step 1: Write the failing UI test**

Cover:
- dashboard panel shows response mapping inputs
- initial values render from `initialSellerApiSettings`

**Step 2: Run test to verify it fails**

Run: `pnpm test src/components/dashboard.test.tsx`
Expected: FAIL because the panel does not yet render the mapping inputs.

**Step 3: Write minimal implementation**

Implement:
- inputs for all response mapping fields
- save flow includes those fields in the PATCH payload
- keep existing masked-key behavior unchanged

**Step 4: Run test to verify it passes**

Run: `pnpm test src/components/dashboard.test.tsx`
Expected: PASS

### Task 5: Update docs and verify end-to-end

**Files:**
- Modify: `README.md`

**Step 1: Update docs**

Document:
- response-path mappings are now configurable in the GUI
- the mappings only affect own-listing normalization
- market intelligence and live writes remain separate and guarded

**Step 2: Run full verification**

Run:
- `pnpm test`
- `pnpm lint`
- `pnpm build`

Expected: PASS
