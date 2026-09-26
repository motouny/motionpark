# Motion Park — Security

Date: 2026-09-26

## Network
- **Firewall (ufw)**: default deny incoming; only `22/tcp` (SSH), `80/tcp`, `443/tcp` open.
- Internal services bind **localhost only** and are NOT publicly reachable:
  - PostgreSQL `127.0.0.1:5432`
  - Redis `127.0.0.1:6379`
  - Motion Park API `127.0.0.1:5000`
  - Odoo `127.0.0.1:8069` / longpolling `127.0.0.1:8072`
- Nginx is the only public gateway. Odoo exposed only via `erp.motion-park.com`.

## Secrets
- Odoo DB + master passwords: `/etc/odoo19.conf` (mode 600, owner odoo19). Not in git.
- App DB password, JWT secret, Odoo login: backend `.env` (git-ignored) + `/root/.motionpark/secrets.env` (mode 700/600).
- `.env.example` documents required keys without values. **No secrets are committed.**
- Generated at install: DB passwords, JWT secret, Odoo admin master. Initial Motion Park super-admin password is generated at first backend run and written to `/root/.motionpark/INITIAL_ADMIN.txt` (mode 600) — no default/committed password.

## Runtime users (non-root)
| Service | User |
|---|---|
| Odoo 19 | `odoo19` |
| Motion Park API | `www-data` |
| Nginx | `www-data` |
| PostgreSQL | `postgres` |
| Redis | `redis` |

## Application security
- Angular never holds Odoo/DB credentials; backend is the only Odoo consumer (XML-RPC, typed client, timeout+retry).
- JWT access (15m) + refresh (30d, stored hashed); password hashing PBKDF2-SHA256.
- RBAC with 8 roles; admin endpoints guarded.
- Rate limiting on login/register/forgot-password/leads/subscriptions (Redis/ASP.NET RateLimiter).
- Idempotency keys on all writes; integration transactions deduped by UUID.
- Customer QR token is opaque + rotating; contains no PII (no national ID / phone / email).
- Integration logs never store passwords/tokens.
- Media upload: content-type + size validation; stored outside webroot, served via authorized `X-Accel-Redirect`.
- Saudi mobile normalization to canonical `+9665xxxxxxxx` before storage/matching.

## Hardening notes
- Monarx host security agent runs (ports 1721/65529) — left untouched.
- Swap added (4 GB) to protect builds/runtime under memory pressure.
- `unattended-upgrades` active for security patches.
- Backups contain full DB dumps — treat `storage/backups/` as sensitive; copy off-server for DR.

## CSP
A restrictive Content-Security-Policy is intentionally not yet enforced globally (it can break Angular inline styles + Odoo without careful tuning). Security headers (nosniff, frame, referrer, permissions-policy) are active. Add a tested CSP as a follow-up hardening step.
