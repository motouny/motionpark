# Motion Park — Nginx

Date: 2026-09-26

## Sites

| File | Server name | Role |
|---|---|---|
| `/etc/nginx/sites-available/motionpark` | `motion-park.com`, `www.motion-park.com` | Angular static + `/api/` reverse proxy |
| `/etc/nginx/sites-available/motionpark-erp` | `erp.motion-park.com` | Odoo 19 CE reverse proxy |

Both symlinked into `sites-enabled/`. Default site removed. `nginx -t` passes.

## Routing (main site)
- `/` → Angular production build (`root …/frontend/angular/dist/<project>/browser`), SPA fallback `try_files $uri $uri/ /index.html;`
- `/api/` → `http://127.0.0.1:5000` (Motion Park ASP.NET Core API, internal only)
- `/media/` → `internal` location, served from `/var/www/motionpark/storage/media/` via backend `X-Accel-Redirect` (authorized media delivery)
- Hashed static assets cached 30d immutable.

## Routing (ERP site)
- `/` → `http://127.0.0.1:8069` (Odoo)
- `/longpolling` → `http://127.0.0.1:8072` (Odoo bus, websocket/upgrade)
- `client_max_body_size 200m` for attachments.

## Security headers (both)
`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`, `Permissions-Policy` (main site). HSTS is added by Certbot's `options-ssl-nginx.conf` after HTTPS is proven.

## Relevant commands
```bash
nginx -t && systemctl reload nginx
```

## Notes
- Certbot manages the SSL blocks (`listen 443 ssl`, cert paths) inside these files — edit carefully around the "managed by Certbot" lines.
- `erp.motion-park.com` vhost is live but its SSL cert is pending the `erp` DNS A record (see `docs/DNS_REQUIRED.md`); until then it serves HTTP only on port 80.
