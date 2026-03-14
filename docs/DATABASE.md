# Database and Prisma configuration

## Connection URLs

- **`DATABASE_URL`** – Used by the Next.js app at runtime (via `src/lib/db.ts`). Use the **Supabase connection pooler** URL for production (e.g. port **6543**, `pgbouncer=true`) to avoid exhausting connections.
- **`DIRECT_URL`** – Used by **Prisma CLI only** (migrate, deploy, seed, studio). Use the **Supabase direct** connection (port **5432**). Required for migrations because the pooler can block migration steps.

In `prisma.config.ts`, the CLI uses `DIRECT_URL` when set, otherwise `DATABASE_URL`. So set both for Supabase:

- `DATABASE_URL` = pooler URL (for the app)
- `DIRECT_URL` = direct URL (for `prisma migrate`, `prisma db push`, seed)

If you only have one Supabase URL, set **both** to the **direct** connection string (Settings → Database → Connection string → “Direct connection”, port 5432).

## Where URLs are loaded

- **Prisma CLI** (`migrate`, `generate`, `studio`, etc.): Loads `prisma.config.ts`, which runs `import "dotenv/config"` and reads `process.env`. Ensure `.env` is in the **project root** (same folder as `prisma.config.ts`). The config uses `DIRECT_URL` if set, else `DATABASE_URL`.
- **Next.js app**: Loads `.env` / `.env.local` and uses `DATABASE_URL` in `src/lib/db.ts`.

## Error: P1001 – Can't reach database server

You see something like:

```text
Error: P1001: Can't reach database server at `db.xxxxx.supabase.co:5432`
```
or at runtime (dashboard, pages):

```text
Can't reach database server at aws-1-<region>.pooler.supabase.com
```

### 1. App runtime (Next.js) can't reach the pooler

If the error mentions **pooler.supabase.com** (and you're loading the dashboard or any page that uses the DB), the app is using `DATABASE_URL` and cannot connect to the Supabase **connection pooler**.

- **Add SSL to the pooler URL.** In `.env`, ensure `DATABASE_URL` includes `sslmode=require`. For example:
  ```text
  DATABASE_URL="postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
  ```
  If you already have a query string (e.g. `?pgbouncer=true`), append `&sslmode=require`.
- **Supabase project paused:** In [Supabase Dashboard](https://supabase.com/dashboard) → your project, click **Restore** if you see "Project paused".
- **Network:** Port **6543** must be reachable from your machine. Try another network or disable VPN if it blocks outbound connections.
- **Correct pooler string:** In Supabase go to **Project Settings → Database**. Use the **Connection string** for **Transaction** (or **Session**) mode, and ensure the host (e.g. `aws-0-ap-south-1.pooler.supabase.com`) and port **6543** match. Add `?pgbouncer=true` for Transaction mode; include `sslmode=require` in the URL.

Restart the Next.js dev server after changing `.env`.

**If you see "self-signed certificate in certificate chain"** when using the pooler, the app's DB client must allow that certificate. This repo sets `ssl: { rejectUnauthorized: false }` in `src/lib/db.ts` for the pool so the connection still uses TLS but does not verify the server cert. For production you can restrict this via env if your deployment uses a different certificate store.

### 2. Supabase project is paused (very common)

Free-tier Supabase projects **pause** after inactivity.

- Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
- If you see “Project paused”, click **Restore** and wait a minute.
- Run the migration again.

### 3. Wrong URL or missing env

- **Prisma CLI** uses the URL from `prisma.config.ts`, which prefers `DIRECT_URL` then `DATABASE_URL`. Both must point to the same Supabase project.
- Get the URLs from Supabase: **Project Settings → Database**:
  - **Direct connection**: host like `db.<ref>.supabase.co`, port **5432**.
  - **Connection pooler**: host like `aws-0-<region>.pooler.supabase.com`, port **6543**.
- In the project root, ensure `.env` exists and contains at least:
  - `DATABASE_URL="postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"`
  - `DIRECT_URL="postgresql://postgres.[ref]:[PASSWORD]@db.[ref].supabase.co:5432/postgres?sslmode=require"`
  (Supabase requires SSL for the direct connection; without `sslmode=require` you may get P1001 even when the project is healthy.)
- No quotes issues or spaces; password with special characters should be URL-encoded.

### 4. Run CLI from project root

So that `dotenv/config` finds `.env`:

```bash
cd /path/to/greenroom
npx prisma migrate dev
```

### 5. Special characters in password

If the DB password contains `#`, `@`, `%`, etc., either:

- Reset the database password in Supabase (Settings → Database → Reset database password) and use the new one in both URLs, or
- URL-encode the password in `DATABASE_URL` and `DIRECT_URL`.

### 6. Network / firewall / VPN

- Port **5432** (direct) or **6543** (pooler) must be reachable from your machine.
- Try turning off VPN or switching network.
- Some corporate firewalls block non-HTTPS ports; use a different network or VPN that allows PostgreSQL.

### 7. Timeout (optional)

You can add a connection timeout to the URL, e.g.:

```text
DIRECT_URL="postgresql://user:pass@host:5432/postgres?connect_timeout=30"
```

Then run the migration again.

### 8. SSL (Supabase requires it)

Supabase expects **SSL** for the direct connection. If the project is **Healthy** but you still get P1001, add `sslmode=require` to your direct URL.

- In `.env`, ensure `DIRECT_URL` includes SSL. For example:

```text
DIRECT_URL="postgresql://postgres.[ref]:[PASSWORD]@db.[ref].supabase.co:5432/postgres?sslmode=require"
```

- If you already have a query string, append: `&sslmode=require` (e.g. `...postgres?connect_timeout=30&sslmode=require`).

Then run `npx prisma migrate deploy` again from the project root.

### 9. Port 5432 blocked (firewall / ISP / VPN)

If your network blocks outbound **port 5432** (common on corporate or restricted networks), the direct connection will never work from that machine.

- Try from another network (e.g. mobile hotspot or home) with the same `DIRECT_URL` (and `?sslmode=require`).
- Or use **Supabase Session mode pooler** for migrations as a fallback: in Supabase go to **Project Settings → Database**, copy the **Connection string** for **Session mode** (port **6543**, host like `aws-0-<region>.pooler.supabase.com`). Set that as `DIRECT_URL` (and keep SSL in the URL). Then run `npx prisma migrate deploy`. Session mode allows full PostgreSQL features, so migrations can work.

## Summary

| What                    | Uses          | Recommended URL   |
|-------------------------|---------------|-------------------|
| Next.js app (runtime)   | `DATABASE_URL`| Pooler (6543)    |
| Prisma migrate / deploy | `DIRECT_URL` then `DATABASE_URL` | Direct (5432) |
| Prisma seed             | `DIRECT_URL` or `DATABASE_URL` (see seed script) | Direct (5432) |

Ensure the Supabase project is **not paused**, `.env` is in the project root with correct `DATABASE_URL` and `DIRECT_URL`, and run Prisma commands from the project root.

---

## Migration order / P3006 / P1014 (shadow database)

If you see:

```text
Error: P3006 - Migration `20250302120000_add_max_result_score` failed to apply cleanly to the shadow database.
P1014 - The underlying table for model `festival` does not exist.
```

the migration that alters `festival` was originally dated **before** the migration that creates `festival`. That breaks the shadow database when Prisma replays all migrations in order.

**Fix applied in this repo:** The `add_max_result_score` change lives in migration `20251223120000_add_max_result_score` (so it runs after `init_fresh`, which creates `festival`). The old migration `20250302120000_add_max_result_score` was removed from the migrations directory.

**If your database already had `20250302120000_add_max_result_score` applied:**

`prisma migrate resolve --rolled-back` only works for **failed** migrations. For one that **succeeded** but was removed from the repo, remove its row from the migration history, then run `migrate dev` so the new migration (same change, correct order) is applied.

1. Connect to your database and delete the old migration record (Supabase: SQL Editor, or `psql`, or Prisma Studio + raw SQL):
   ```sql
   DELETE FROM "_prisma_migrations"
   WHERE migration_name = '20250302120000_add_max_result_score';
   ```
2. Run:
   ```bash
   npx prisma migrate dev
   ```
   Prisma will apply `20251223120000_add_max_result_score`. That migration uses `ADD COLUMN IF NOT EXISTS`, so it is safe even though the column may already exist.

**If you are on a fresh database** (or after a reset), `migrate dev` will apply all migrations in the correct order and the shadow database will work.
