# Docker environment for Greenroom

This project can be run with Docker Compose using a single container for the Next.js app. PostgreSQL is provided by **Supabase**, and the app connects to it using `DATABASE_URL` (pooler) and `DIRECT_URL` (direct) from your `.env`.

## Prerequisites

- Docker and Docker Compose installed.
- A `.env` file in the project root with:
  - `DATABASE_URL` set to the **Supabase connection pooler** URL.
  - `DIRECT_URL` set to the **Supabase direct** URL.
  - Other required env vars (see the main [README](README.md) or `.env.example`).

You can copy `.env.example` to `.env` and then fill in your Supabase project values.

## How to run

1. **Create `.env`** (if you don’t have one):
   ```bash
   cp .env.example .env
   # then edit .env with your Supabase DATABASE_URL and DIRECT_URL
   ```

2. **Start the app container:**
   ```bash
   docker compose up -d
   ```
   Or without `-d` to stream logs in the foreground.

3. **Run database migrations** (first time, or after schema changes):
   ```bash
   docker compose run --rm app npx prisma migrate deploy
   ```

4. **Optionally seed the database** (e.g. superadmin):
   ```bash
   docker compose run --rm app npm run db:seed
   ```

5. **Open the app:**  
   [http://localhost:3000](http://localhost:3000)

## Stopping

- Stop containers: `docker compose down`

## First-run summary

After `docker compose up -d`, run migrations (and optionally seed) before using the app. The app connects directly to Supabase using the URLs from `.env`; there is no local Postgres container.
