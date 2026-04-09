# Seller API Readiness And Repo Bootstrap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Attach the local workspace to the pushed GitHub repository and add a safe Seller API readiness diagnostic that reports what is configured, what is still blocked, and why.

**Architecture:** Keep the existing `TakealotSellerApiProvider` conservative and add a separate readiness report instead of pretending official API contracts are confirmed. Expose the readiness report through runtime and a small API route so the rest of the app can inspect integration state without enabling unverified reads or writes.

**Tech Stack:** Git, Next.js App Router, TypeScript, Vitest, local JSON storage

### Task 1: Bootstrap the local repository against GitHub

**Files:**
- No code changes required

**Step 1: Verify local files match the pushed remote snapshot**

Run:
- `rsync -ani --delete --exclude '.git' --exclude 'node_modules' --exclude '.next' --exclude '.playwright-cli' --exclude 'data/store.json' <local>/ <remote-clone>/`

Expected: no output

**Step 2: Attach git metadata**

Run:
- copy the verified `.git` metadata into the local workspace
- `git status --short`
- `git remote -v`

Expected:
- clean status
- `origin` points to `https://github.com/Cat-Man/takealot-erp.git`

### Task 2: Add failing tests for Seller API readiness diagnostics

**Files:**
- Modify: `src/integrations/takealot-seller-api.test.ts`

**Step 1: Write the failing tests**

Cover:
- readiness reports `missing_api_key` when no API key exists
- readiness reports `dry_run_only` when API key exists but base URL is placeholder and writes remain guarded
- readiness reports custom base URL source and operator next actions when env is partially configured

**Step 2: Run test to verify it fails**

Run: `pnpm test src/integrations/takealot-seller-api.test.ts`
Expected: FAIL because no readiness function exists yet.

### Task 3: Implement the readiness report

**Files:**
- Modify: `src/integrations/takealot-seller-api.ts`

**Step 1: Write minimal implementation**

Implement:
- readiness status type
- readiness report shape with:
  - `status`
  - `apiKeyPresent`
  - `baseUrl`
  - `baseUrlSource`
  - `dryRun`
  - `canAttemptLiveWrites`
  - `canReadOwnListings`
  - `canReadMarketIntelligence`
  - `checks`
  - `recommendedActions`
- `getTakealotSellerApiReadiness(env)` helper

**Step 2: Run test to verify it passes**

Run: `pnpm test src/integrations/takealot-seller-api.test.ts`
Expected: PASS

### Task 4: Expose readiness through runtime and API

**Files:**
- Modify: `src/lib/runtime.ts`
- Create: `src/app/api/integrations/takealot-seller-api/readiness/route.ts`
- Modify: `src/app/api/products/routes.test.ts`

**Step 1: Write the failing route test**

Cover:
- readiness route returns the computed readiness report
- route marks missing key and placeholder contract state correctly

**Step 2: Run test to verify it fails**

Run: `pnpm test src/app/api/products/routes.test.ts`
Expected: FAIL because the readiness route does not exist yet.

**Step 3: Write minimal implementation**

Implement:
- runtime helper for current process env readiness
- GET readiness route

**Step 4: Run test to verify it passes**

Run: `pnpm test src/app/api/products/routes.test.ts`
Expected: PASS

### Task 5: Update env/docs and verify end-to-end

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `docs/bmad/INTEGRATION-PLAN.md`

**Step 1: Update docs**

Document:
- local workspace is now attached to the GitHub repo
- readiness endpoint purpose
- readiness only reports configuration and safety gaps; it does not claim official endpoint verification

**Step 2: Run full verification**

Run:
- `pnpm test`
- `pnpm lint`
- `pnpm build`

Expected: PASS
