# Next.js Full-Stack Starter (the boring, reliable one)

A proven, widely used, up-to-date full stack. Nothing exotic — just the things
most teams reach for in 2026 and the fewest surprises possible.

| Layer        | Choice                                             |
| ------------ | -------------------------------------------------- |
| Framework    | **Next.js 16** (App Router) on **React 19**        |
| Language     | **TypeScript** (strict)                            |
| Database     | **PostgreSQL 17**                                  |
| ORM          | **Prisma 7**                                       |
| Styling      | **Tailwind CSS v4** + shadcn/ui-style components   |
| Validation   | **Zod**                                            |
| Auth (opt.)  | **Auth.js / NextAuth v5** (disabled until you set it up) |
| Testing      | **Vitest** + Testing Library                       |

The frontend and backend live in one codebase: React components render the UI,
and Server Actions + Route Handlers are your backend. There's a working
**Notes** CRUD example (`/notes`) that exercises the whole stack.

---

## Quick start (WSL2 on Windows)

These steps assume you've unpacked this folder inside your WSL2 home directory
(e.g. `~/projects/nextjs-fullstack-starter`), **not** under `/mnt/c/...`.
Keeping the project on the Linux filesystem makes file watching and installs
dramatically faster.

### 1. Install Node 22 (via nvm)

If you don't already have Node 22 in your WSL2 distro:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# restart your shell, then:
nvm install    # picks up the version in .nvmrc (22)
nvm use
node -v        # should print v22.x
```

### 2. Start PostgreSQL

**Option A — Docker (recommended, easiest):**

```bash
docker compose up -d
```

This starts Postgres 17 with the exact credentials the default `.env` expects.
(If you're on Docker Desktop for Windows, make sure WSL integration is enabled;
otherwise install Docker directly in your distro.)

**Option B — Postgres installed in WSL2 directly:**

```bash
sudo apt update && sudo apt install -y postgresql
sudo service postgresql start
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
sudo -u postgres createdb app_dev
```

Either way, the connection string in `.env` is:

```
postgresql://postgres:postgres@localhost:5432/app_dev?schema=public
```

Adjust it if your setup differs.

### 3. Install dependencies

```bash
npm install
```

(`postinstall` runs `prisma generate` automatically.)

### 4. Create the database schema

```bash
npm run db:migrate       # creates tables from prisma/schema.prisma
npm run db:seed          # optional: inserts a few example notes
```

### 5. Run the dev server

```bash
npm run dev
```

Open <http://localhost:3000>. Visit **/notes** to try the CRUD demo.

> In WSL2, `localhost` forwarding to Windows usually works out of the box on
> recent Windows 11 builds. If the browser can't reach it, grab the WSL IP with
> `hostname -I` and use that instead.

---

## Project layout

```
app/
  layout.tsx            Root layout + nav
  page.tsx              Landing page
  notes/
    page.tsx            Server Component: lists notes
    note-form.tsx       Client Component: create form (useActionState)
    actions.ts          Server Actions (create/toggle/delete) + Zod validation
  dashboard/page.tsx    Protected page example (needs Auth.js enabled)
  api/auth/[...nextauth]/route.ts   Auth.js route handler (opt-in)
components/ui/          Button, Input (shadcn/ui conventions)
lib/
  prisma.ts            PrismaClient singleton (hot-reload safe)
  utils.ts             cn() class-merge helper
prisma/
  schema.prisma        Note model
  seed.ts              Example seed data
tests/                 Vitest unit tests
```

## Common commands

```bash
npm run dev          # start dev server
npm run build        # prisma generate + production build
npm run start        # run the production build
npm run lint         # eslint
npm run format       # prettier --write .
npm run test         # run unit tests once
npm run db:migrate   # create/apply a migration
npm run db:studio    # open Prisma Studio (visual DB browser)
npm run db:seed      # seed example data
```

## Adding UI components

This project follows shadcn/ui conventions and includes `components.json`, so
you can pull in more prebuilt, accessible components any time:

```bash
npx shadcn@latest add dialog dropdown-menu table
```

---

## Optional: Authentication

Auth.js (NextAuth v5) is wired up but **inactive** so the app runs immediately.
To turn it on:

1. Generate a session secret:

   ```bash
   npx auth secret        # writes AUTH_SECRET into .env
   ```

2. Create a GitHub OAuth app at
   <https://github.com/settings/developers> with callback URL
   `http://localhost:3000/api/auth/callback/github`, then set `AUTH_GITHUB_ID`
   and `AUTH_GITHUB_SECRET` in `.env`.

3. Visit **/dashboard** — it's a protected page that will prompt you to sign in.

Swap in any other provider (Google, credentials, email) by editing `auth.ts`.
For database-backed sessions, add the Prisma adapter — see
<https://authjs.dev/getting-started/adapters/prisma>.

---

## Deploying

The zero-config path is **Vercel** (`vercel` CLI or connect the Git repo) —
just add your `DATABASE_URL` and any auth env vars. For a portable deploy,
`npm run build` produces a standard Next.js server you can run in any Node 22
container behind your own Postgres.
