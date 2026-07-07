# Free Deployment Guide

Deploy vgx-taskco for free using services that match the existing stack:

| Layer | Service | Free tier |
|---|---|---|
| Database | [Neon](https://neon.tech) | Already set up — 0.5GB, unlimited branches |
| Auth | [Supabase](https://supabase.com) | Already set up — 50k MAU free |
| Backend | [Fly.io](https://fly.io) | 3 shared VMs, 256MB RAM each — no sleep |
| Frontend | [Vercel](https://vercel.com) | Unlimited hobby deploys, global CDN |

---

## Backend → Fly.io

### 1. Install Fly CLI

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

### 2. Create the app

```bash
# From repo root
fly launch --name vgxtaskco-api --no-deploy
```

Choose region closest to your Neon DB (e.g. `sin` for Singapore if Neon is ap-southeast-1).

### 3. Set secrets (equivalent of .env on VPS)

```bash
fly secrets set \
  DATABASE_URL="postgresql://neondb_owner:...@ep-...neon.tech/neondb?sslmode=require" \
  JWT_SECRET="your-secret-min-32-chars" \
  API_TOKEN_PEPPER="your-pepper-min-32-chars" \
  SUPABASE_URL="https://your-project.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
  ALLOWED_FRONTEND_ORIGINS="https://vgxtaskco.vercel.app" \
  NODE_ENV="production"
```

### 4. Create `fly.toml` at repo root

```toml
app = "vgxtaskco-api"
primary_region = "sin"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 4000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

[[vm]]
  memory = "256mb"
  cpu_kind = "shared"
  cpus = 1

[checks]
  [checks.health]
    grace_period = "15s"
    interval = "30s"
    method = "GET"
    path = "/"
    port = 4000
    timeout = "5s"
    type = "http"
```

### 5. Run migrations then deploy

```bash
# One-time migration (run from local with DATABASE_URL in .env)
pnpm prisma migrate deploy

# Deploy
fly deploy
```

### 6. Add to GitHub Actions (optional)

Add to `.github/workflows/deploy.yml` alongside or instead of the VPS job:

```yaml
  deploy-fly:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: fly deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

Add `FLY_API_TOKEN` to GitHub secrets: `fly tokens create deploy -x 999999h`.

---

## Frontend → Vercel

### 1. Install Vercel CLI (or use the dashboard)

```bash
npm i -g vercel
cd web && vercel
```

Follow the prompts. Set root to `web/`, build command `pnpm build`, output `dist`.

### 2. Set environment variables in Vercel dashboard

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://vgxtaskco-api.fly.dev
```

### 3. Update Supabase redirect URL

In Supabase Dashboard → Auth → URL Configuration:
- Add `https://vgxtaskco.vercel.app/auth/callback` to Redirect URLs

### 4. Update ALLOWED_FRONTEND_ORIGINS on Fly

```bash
fly secrets set ALLOWED_FRONTEND_ORIGINS="https://vgxtaskco.vercel.app"
```

### 5. Automatic deploys

Connect Vercel to your GitHub repo → set `web/` as the root directory. Every push to `main` auto-deploys the frontend.

---

## Result

- Frontend: `https://vgxtaskco.vercel.app` (or custom domain)
- Backend: `https://vgxtaskco-api.fly.dev`
- Cost: $0/month for low-traffic demo usage

## Updating the Supabase OAuth callback URLs

When you have a real domain, update both:
1. Google Cloud Console → OAuth → Authorised redirect URIs
2. GitHub → OAuth Apps → callback URL
3. Supabase Dashboard → Auth → Redirect URLs

All three need `https://your-domain.com/auth/callback`.
