# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Prisma 7 + PostgreSQL 17 · Tailwind CSS v4 · Zod · Auth.js/NextAuth v5 (opt-in) · Vitest. `package.json` uses `"type": "module"`; config files are `.mjs`/`.ts` ESM. Node 22 (see `.nvmrc`). Path alias `@/*` maps to the repo root (configured in both `tsconfig.json` and `vitest.config.ts`).

## Commands

```bash
npm run dev          # dev server (localhost:3000)
npm run build        # prisma generate + next build
npm run lint         # eslint (eslint-config-next)
npm run format       # prettier --write .
npm run test         # vitest run (once)
npm run test:watch   # vitest watch
npx vitest run tests/utils.test.ts   # run a single test file
npm run db:migrate   # prisma migrate dev — apply/create migration after editing schema.prisma
npm run db:studio    # visual DB browser
npm run db:seed      # seed example notes (tsx prisma/seed.ts)
```

`postinstall` and `build` both run `prisma generate`. Local Postgres comes from `docker compose up -d` (Postgres 17 matching the default `DATABASE_URL`).

## Architecture

The frontend and backend live in one codebase. There is no separate API layer for most work — **Server Actions are the backend**. Route Handlers exist only for Auth.js.

**Data flow (the `/notes` CRUD demo is the canonical pattern):**
- `app/notes/page.tsx` — async Server Component reads directly from `prisma` and renders. Mutations are invoked from `<form action={serverAction}>`; use `.bind(null, id)` to pass an id to an action.
- `app/notes/actions.ts` — `"use server"` module. Every mutation validates input with a Zod schema (`safeParse`), performs the Prisma write, then calls `revalidatePath()` to refresh the cache. Form actions return an `ActionState` (`{ error?: string } | undefined`) for `useActionState`.
- `app/notes/note-form.tsx` — `"use client"` component using `useActionState(action, undefined)` for pending state and error display.

When adding a feature, follow this shape: Zod schema → Server Action with `revalidatePath` → Server Component reads from Prisma → thin Client Component only where interactivity is needed.

**Prisma:** always import the singleton from `@/lib/prisma` (`lib/prisma.ts` guards against multiple clients on hot-reload). After editing `prisma/schema.prisma`, run `npm run db:migrate` and regenerate the client. The only model is `Note` — replace it with real domain models.

**Auth (opt-in, currently inactive):** `auth.ts` exports `{ handlers, auth, signIn, signOut }` from NextAuth with the GitHub provider and JWT sessions (no DB adapter). `app/api/auth/[...nextauth]/route.ts` wires the handlers. `app/dashboard/page.tsx` is the protected-page example — it calls `await auth()` and gates on `session?.user`. Auth stays dormant until `AUTH_SECRET` and provider credentials are set in `.env`; the base app runs without it.

**UI:** shadcn/ui conventions. `components/ui/` holds primitives (`button.tsx`, `input.tsx`) built with `class-variance-authority`; compose classes with `cn()` from `@/lib/utils`. Add more with `npx shadcn@latest add <component>` (`components.json` is configured).

**Tests:** Vitest + Testing Library in `tests/`, jsdom environment, globals enabled, `tests/setup.ts` as setup file. Only files matching `tests/**/*.{test,spec}.{ts,tsx}` are picked up.