# Agentic Chat frontend

Plan 02 adds Clerk authentication controls to the neutral shell while preserving the real API health connection panel. Chat, uploads and provider execution are not enabled. Product page implementation requires the user's screenshots and approval of a later numbered plan.

## Local setup

Use Node.js 24 and pnpm 10.33.2. Install with `pnpm install --frozen-lockfile`. Copy `.env.example` to `.env.local` if needed. Start the separate backend repository on port 3001, then run `pnpm dev` here on port 3000.

`NEXT_PUBLIC_API_BASE_URL` is the public backend **origin**, for example `http://localhost:3001`, without credentials, path, query or fragment. Development defaults to that local origin. Production requires an explicit value at **build time**; missing or invalid values fail the build. Values are embedded in browser bundles and changing them requires a rebuild. Never put secrets in public environment variables.

Create or select a Clerk application, then replace the `.env.local` placeholders for `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` with its development keys. The publishable key is browser-visible; the secret key is server-only and must never use the `NEXT_PUBLIC_` prefix or be committed. Clerk's hosted modal handles sign-in and sign-up, so this plan adds no custom authentication pages.

## Checks

- `pnpm check` runs generated contract drift checks, ESLint, strict typechecking and Vitest/RTL/MSW tests.
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001 pnpm build` builds production assets.
- For the real-browser test, run the actual backend on port 3001 with `http://localhost:3000` allowed by its origin policy, build the frontend as above, then run `pnpm test:e2e`. Install a Playwright Chromium browser separately if unavailable. The test starts or reuses the production frontend on port 3000 and makes real browser requests to the backend; it does not mock the API.

CI installs the frozen lockfile, checks and builds. Real-backend browser tests run locally because the independent backend repository is not provisioned by this workflow.

## Structure and contracts

App Router pages compose feature modules. The workspace component calls its TanStack Query health hook, which calls the module API service and shared typed HTTP transport. Only that transport performs first-party fetch. It validates backend-owned Zod contracts, handles cancellation and an eight-second timeout, normalizes safe errors and exposes validated request IDs. Transient failures receive at most two automatic retries; configuration, forbidden and malformed responses do not. The health request remains public. Protected module API functions opt into `auth: "session"` on the shared transport, which adds the current Clerk session token as a bearer token while continuing to omit cookies on cross-origin requests.

`src/generated/contracts` is owned by the backend exporter. Do not hand-edit snapshots; use the backend contract export/check scripts. UI primitives follow Shadcn conventions with installed Radix Slot/CVA utilities.

## Future hosting configuration (publication deferred)

Frontend and backend are independent Next.js applications and require two separate Vercel projects. Use each repository as its project's root. Configure the frontend build's `NEXT_PUBLIC_API_BASE_URL` with the exact backend deployment origin. Configure the backend allowed-origin environment with the exact frontend origin according to the backend README. A preview frontend has a distinct origin: explicitly register that exact preview origin, and rebuild the frontend against its intended backend. Never use wildcard preview allowlists or assume shared cookies. The health call omits credentials.

No publication, deployment, account creation, paid services or credentials are part of this plan.
