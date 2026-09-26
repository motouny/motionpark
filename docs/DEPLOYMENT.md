# Motion Park — Deployment

Date: 2026-09-26

## Topology
```
Internet → Nginx (443)
  ├─ motion-park.com / www  → Angular static + /api/ → 127.0.0.1:5000 (.NET API)
  │                                              ├→ PostgreSQL motionpark (127.0.0.1:5432)
  │                                              ├→ Redis (127.0.0.1:6379)
  │                                              └→ Odoo XML-RPC (127.0.0.1:8069)
  └─ erp.motion-park.com    → Odoo 19 CE (127.0.0.1:8069) [SSL pending DNS]
```

## systemd services
| Unit | Purpose |
|---|---|
| `motionpark-api` | ASP.NET Core backend (User=www-data, `EnvironmentFile` backend/.env, restart=always) |
| `odoo19` | Odoo 19 CE (User=odoo19, `-c /etc/odoo19.conf`, restart=always) |
| `nginx` | public gateway |
| `postgresql` | databases |
| `redis-server` | cache/locks/queue |
| `certbot.timer` | SSL auto-renewal |

All enabled to start on boot. Check: `systemctl status <unit>`.

## Build & deploy steps (run by automation/agents)
- **Angular**: `npm ci && npm run build` in `frontend/angular` → serve `dist/` via Nginx root.
- **Backend**: `dotnet restore && dotnet build -c Release && dotnet test -c Release && dotnet publish -c Release -o backend/publish`; EF migrations run at startup; restart `motionpark-api`.
- **Odoo addons**: build under `erp/custom-addons`, install/upgrade via `odoo-bin -i/-u <module> -d motionpark_odoo --stop-after-init` as `odoo19`.

## Env / config
- Backend env: `backend/.env` (from `.env.example`).
- Odoo config: `/etc/odoo19.conf`.
- Nginx sites: `/etc/nginx/sites-available/{motionpark,motionpark-erp}`.
- Backup cron: `17 3 * * * deploy/scripts/backup.sh`.

## Logs
| Service | Path |
|---|---|
| Backend | `/var/www/motionpark/logs` |
| Odoo | `/var/log/odoo19/odoo.log` |
| Nginx | `/var/log/nginx/{access,error}.log` |
| Backups | `/var/www/motionpark/logs/backup.log` |

## Operational runbook
1. Deploy backend change → publish → `systemctl restart motionpark-api` → `curl 127.0.0.1:5000/api/health`.
2. Deploy Angular change → build → Nginx serves new `dist/` (no reload needed; just replace files).
3. Odoo addon change → `odoo-bin -u <module>` → restart `odoo19`.
4. Before risky DB change → run `deploy/scripts/backup.sh`.
