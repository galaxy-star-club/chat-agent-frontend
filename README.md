# Agentic Chat frontend

Next.js chat UI for authenticated users. It uses Clerk and TanStack Query to render persisted assistant replies while they are generated.

## Run locally

Requires Node.js 24 and pnpm 10. Start the backend first on port `3001`.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

The app runs at `http://localhost:3000`. Configure:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

`NEXT_PUBLIC_API_BASE_URL` is the backend origin only. It is included in the browser build, so change it before building or deploying. Never put server secrets in `NEXT_PUBLIC_*` variables.

Useful commands:

```sh
pnpm check
pnpm build
pnpm test:e2e
```

## Structure

```text
src/app/                  App Router entry points
src/modules/chats/        chat workspace, API module, query hooks
src/modules/workspace/    signed-in/signed-out workspace views
src/components/           shared UI components
src/lib/                  typed HTTP transport and client config
src/generated/contracts/  backend-generated Zod contract snapshot
```

## Data flow

```text
workspace → chat API module → typed HTTP transport → backend
                              ↘ refresh active messages → live assistant message
```

The UI sends a message once and refreshes active messages while the run is in progress. Finished messages are reloaded from the backend, which remains the durable source of truth.
