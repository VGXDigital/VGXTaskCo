# VPS Setup — tasks.vgx.digital

<!-- Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved. -->

## GitHub Actions secrets required

| Secret | Value |
|---|---|
| `DOCKER_USERNAME` | `vgxconsulting` (Docker Hub username) |
| `DOCKER_PASSWORD` | Docker Hub access token |
| `VPS_HOST` | VPS IP or hostname |
| `VPS_USERNAME` | SSH user (e.g. `ubuntu` or `vgx`) |
| `SSH_PRIVATE_KEY` | Private key for SSH access |

## VPS one-time setup

1. Create the deployment directory:

   ```
   mkdir -p /opt/HostedSites/tasks.vgx.digital
   ```

2. Copy `docker-compose.prod.yml` to `/opt/HostedSites/tasks.vgx.digital/`.

3. Create `.env` at `/opt/HostedSites/tasks.vgx.digital/.env` with all production values.
   Copy from `.env.example` and fill in:
   - `DATABASE_URL` — Neon connection string
   - `JWT_SECRET`
   - `API_TOKEN_PEPPER`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ALLOWED_FRONTEND_ORIGINS=https://tasks.vgx.digital`

4. Run Prisma migrations (once, before first deploy):

   ```
   docker run --rm --env-file /opt/HostedSites/tasks.vgx.digital/.env \
     vgxconsulting/taskco-api:latest \
     node -e "const {execSync}=require('child_process'); execSync('npx prisma migrate deploy', {stdio:'inherit'})"
   ```

5. Add to the VPS Caddyfile (see `Caddyfile` at repo root for the exact snippet):

   ```
   tasks.vgx.digital {
       reverse_proxy localhost:4181
   }
   ```

6. Reload Caddy: `sudo systemctl reload caddy`

## How deployments work

Every push to `main` triggers the GitHub Actions workflow:

1. Builds and pushes `vgxconsulting/taskco-api` and `vgxconsulting/taskco-web` to Docker Hub, tagged `latest` and `vX.Y.Z`.
2. SSHs into the VPS, pulls both images, runs `docker compose -f docker-compose.prod.yml up -d --remove-orphans`.
3. Waits up to 60 seconds for `vgxtaskco-web` to report healthy (the web container only starts after the api container passes its own health check).
4. Prunes dangling images.

## Triggering a deploy without code changes

```
git commit --allow-empty -m "trigger deploy" && git push
```

Or use the GitHub UI: Actions → Deploy to VPS → Run workflow.
