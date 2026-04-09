# Takealot Repricing Platform Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local web platform that monitors a Takealot product's lowest competitor price and computes or applies a new seller price using configurable repricing rules.

**Architecture:** Use a single Next.js TypeScript app with server-side API routes and a lightweight local JSON data store. Keep marketplace access behind an adapter interface so the app runs today with a mock provider and can later use a persistent browser-backed Takealot provider when authenticated seller access is available.

**Tech Stack:** Next.js, React, TypeScript, Vitest, Testing Library, Zod, local JSON storage, Playwright-ready adapter boundary

### Task 1: Project Bootstrap

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`

**Step 1: Create the initial app shell**

Create a minimal Next.js app with TypeScript, app router, a root layout, one dashboard page, and a Vitest config.

**Step 2: Run bootstrap checks**

Run: `pnpm install`
Expected: dependencies install successfully

**Step 3: Run the empty app/test commands**

Run: `pnpm test`
Expected: test runner starts successfully with no failing config errors

Run: `pnpm lint`
Expected: lint command runs successfully

### Task 2: Repricing Engine

**Files:**
- Create: `src/core/repricing.ts`
- Create: `src/core/types.ts`
- Test: `src/core/repricing.test.ts`

**Step 1: Write the failing tests**

Cover:
- undercut the cheapest competitor when margin allows
- clamp to floor price when competitor is too cheap
- ignore own seller when finding lowest external price
- keep current price when no competitor offer exists

**Step 2: Run test to verify it fails**

Run: `pnpm test src/core/repricing.test.ts`
Expected: FAIL because repricing module does not exist yet

**Step 3: Write minimal implementation**

Implement pure functions:
- `findLowestCompetitorOffer`
- `calculateSuggestedPrice`
- `createExecutionPreview`

**Step 4: Run test to verify it passes**

Run: `pnpm test src/core/repricing.test.ts`
Expected: PASS

### Task 3: Storage and Domain Service

**Files:**
- Create: `src/lib/store.ts`
- Create: `src/lib/fixtures.ts`
- Create: `src/lib/service.ts`
- Test: `src/lib/service.test.ts`

**Step 1: Write the failing tests**

Cover:
- loading seeded products when store is empty
- saving repricing rules
- generating a repricing execution record

**Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/service.test.ts`
Expected: FAIL because storage/service modules do not exist yet

**Step 3: Write minimal implementation**

Implement a JSON-backed repository and domain service that:
- reads/writes product monitor records
- stores execution history
- delegates repricing calculations to the engine

**Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/service.test.ts`
Expected: PASS

### Task 4: Marketplace Adapters

**Files:**
- Create: `src/integrations/marketplace.ts`
- Create: `src/integrations/mock-provider.ts`
- Create: `src/integrations/takealot-browser.ts`
- Test: `src/integrations/mock-provider.test.ts`

**Step 1: Write the failing tests**

Cover:
- mock provider returns deterministic offers
- mock provider reports applied price updates

**Step 2: Run test to verify it fails**

Run: `pnpm test src/integrations/mock-provider.test.ts`
Expected: FAIL because provider modules do not exist yet

**Step 3: Write minimal implementation**

Implement:
- shared provider interface
- mock provider for local demo/testing
- Takealot browser provider skeleton with clear config contract for login/profile/selectors

**Step 4: Run test to verify it passes**

Run: `pnpm test src/integrations/mock-provider.test.ts`
Expected: PASS

### Task 5: API Routes

**Files:**
- Create: `src/app/api/products/route.ts`
- Create: `src/app/api/products/[id]/refresh/route.ts`
- Create: `src/app/api/products/[id]/apply/route.ts`
- Create: `src/app/api/products/[id]/rule/route.ts`
- Test: `src/app/api/products/routes.test.ts`

**Step 1: Write the failing tests**

Cover:
- listing products
- updating repricing rules
- refreshing product market data
- applying a suggested price

**Step 2: Run test to verify it fails**

Run: `pnpm test src/app/api/products/routes.test.ts`
Expected: FAIL because routes do not exist yet

**Step 3: Write minimal implementation**

Implement route handlers that use the domain service and selected provider.

**Step 4: Run test to verify it passes**

Run: `pnpm test src/app/api/products/routes.test.ts`
Expected: PASS

### Task 6: Dashboard UI

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/dashboard.tsx`
- Create: `src/components/product-card.tsx`
- Create: `src/components/rule-form.tsx`
- Create: `src/components/execution-table.tsx`

**Step 1: Write the failing UI test**

Create one focused component test that proves the dashboard renders seeded products and suggested repricing actions.

**Step 2: Run test to verify it fails**

Run: `pnpm test src/components/dashboard.test.tsx`
Expected: FAIL because the dashboard components do not exist yet

**Step 3: Write minimal implementation**

Build a concise operator dashboard with:
- product monitor cards
- refresh/apply buttons
- repricing rule editor
- execution history table
- provider status note explaining Takealot authentication limits

**Step 4: Run test to verify it passes**

Run: `pnpm test src/components/dashboard.test.tsx`
Expected: PASS

### Task 7: Verification and Docs

**Files:**
- Create: `README.md`
- Create: `.env.example`

**Step 1: Document runtime configuration**

Include:
- install/run commands
- provider mode selection
- Takealot browser profile path
- manual login requirement due Cloudflare/seller auth

**Step 2: Run full verification**

Run: `pnpm test`
Expected: PASS

Run: `pnpm lint`
Expected: PASS

Run: `pnpm build`
Expected: PASS
