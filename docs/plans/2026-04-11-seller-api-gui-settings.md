# Seller API GUI Settings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a graphical settings panel so operators can configure Takealot Seller API read access from the local admin UI instead of editing env vars by hand.

**Architecture:** Keep the app local-first. Persist Seller API integration settings in a dedicated local JSON file, merge those settings with process env at runtime, and expose a small settings API for the dashboard. Do not write `.env` from the browser. After saving settings, reset the runtime singleton so readiness and provider wiring reflect the new config immediately.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, local JSON persistence

### Task 1: Add failing tests for Seller API settings persistence and route behavior

**Files:**
- Create: `src/app/api/integrations/takealot-seller-api/settings/route.test.ts`
- Modify: `src/app/api/products/routes.test.ts`

**Step 1: Write the failing tests**

Cover:
- settings route returns masked current Seller API settings plus readiness
- patching settings persists them and makes readiness report `canReadOwnListings=true`

**Step 2: Run tests to verify they fail**

Run:
- `pnpm test src/app/api/integrations/takealot-seller-api/settings/route.test.ts`
- `pnpm test src/app/api/products/routes.test.ts`

Expected: FAIL because no settings route or persisted GUI settings layer exists yet.

### Task 2: Implement Seller API settings persistence and runtime merge

**Files:**
- Create: `src/lib/takealot-seller-api-settings.ts`
- Modify: `src/lib/runtime.ts`
- Modify: `src/lib/store.ts` only if strictly needed
- Create: `src/app/api/integrations/takealot-seller-api/settings/route.ts`

**Step 1: Write minimal implementation**

Implement:
- dedicated local settings file for Seller API GUI config
- masked settings summary for UI
- merged env view for runtime provider creation and readiness
- runtime reset hook after settings save
- GET/PATCH settings route

**Step 2: Run tests to verify they pass**

Run:
- `pnpm test src/app/api/integrations/takealot-seller-api/settings/route.test.ts`
- `pnpm test src/app/api/products/routes.test.ts`

Expected: PASS

### Task 3: Add failing UI test for the settings panel

**Files:**
- Modify: `src/components/dashboard.test.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Write the failing test**

Cover:
- dashboard shows a Seller API settings panel
- panel shows readiness context and a save action

**Step 2: Run test to verify it fails**

Run: `pnpm test src/components/dashboard.test.tsx`
Expected: FAIL because the dashboard does not yet render the settings panel.

### Task 4: Implement the graphical Seller API settings panel

**Files:**
- Create: `src/components/seller-api-settings-panel.tsx`
- Modify: `src/components/dashboard.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

**Step 1: Write minimal implementation**

Implement:
- panel with fields for API key replacement, base URL, dry-run, auth header name/prefix, own-listing path template
- readiness summary inside the panel
- save flow calling the new settings route
- local message updates after save

**Step 2: Run test to verify it passes**

Run: `pnpm test src/components/dashboard.test.tsx`
Expected: PASS

### Task 5: Update docs and verify end-to-end

**Files:**
- Modify: `README.md`

**Step 1: Update docs**

Document:
- GUI settings now exist
- settings are persisted locally, not written into `.env`
- save triggers immediate runtime refresh

**Step 2: Run full verification**

Run:
- `pnpm test`
- `pnpm lint`
- `pnpm build`

Expected: PASS
