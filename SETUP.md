# Vertex — Setup

One-time commands to run on a fresh machine after cloning the repo.

## 1. Install dependencies

```cmd
npm install
```

This also runs `prisma generate` automatically (postinstall hook).

## 2. Configure environment

Copy `.env.example` to `.env.local` and fill in your `DATABASE_URL`. (For the maintainer's machine this file is already present and gitignored.)

## 3. Apply database schema to Neon

```cmd
npx prisma migrate dev --name init
```

This creates `prisma/migrations/<timestamp>_init/migration.sql` and applies it to the Neon database referenced by `DATABASE_URL`. Commit the generated migration folder.

## 4. Run locally

```cmd
npm run dev
```

Open http://localhost:3000

## 5. Useful scripts

| Script | What it does |
|---|---|
| `npm run dev` | Local dev server with hot reload |
| `npm run build` | Production build (runs `prisma generate && prisma migrate deploy && next build`) |
| `npm run db:studio` | Open Prisma Studio to browse the database |
| `npm run db:migrate` | Create + apply a new migration after editing `schema.prisma` |
