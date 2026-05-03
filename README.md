# Mind Garden

Next.js article workspace with nested articles, TipTap rich editor, per-article permissions, Google/manual login, and Postgres persistence.

## Run with Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

Open http://localhost:3000.

Manual login creates a user automatically. The seeded demo account is:

```text
admin@example.com
admin1234
```

To enable Google login, create OAuth credentials in Google Cloud Console and set:

```env
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

Callback URL:

```text
http://localhost:3000/api/auth/google/callback
```

## Database

The app uses Prisma with Postgres. Docker Compose runs:

- `db`: Postgres 16
- `web`: Next.js dev server

The web container runs `prisma generate` and `prisma db push` before starting Next.js.
