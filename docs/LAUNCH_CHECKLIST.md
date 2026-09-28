# Motion Park — Launch Checklist

Date: 2026-09-26

## Server
- [x] Ubuntu 24.04, 2 vCPU, 7.8 GB RAM, 4 GB swap added
- [x] Disk 95 GB free
- [x] Only SSH/HTTP/HTTPS open (ufw); internal services localhost-only

## Source
- [x] Git repo cloned → `/var/www/motionpark`
- [x] Branch `feature/angular-odoo-production`
- [x] React/Vite design preserved under `reference-design/react-vite`
- [x] Secrets excluded from git (.env, /etc/odoo19.conf, /root/.motionpark)

## Angular
- [x] production build succeeds
- [ ] routes (public + portal + admin)
- [x] Arabic RTL default
- [x] English LTR toggle

## API
- [x] `dotnet build -c Release` clean
- [x] `dotnet test` passing (34/34)
- [ ] `dotnet publish` → systemd `motionpark-api` active
- [x] `/api/health` responds (Healthy)

## Database
- [ ] EF migration applied (motionpark DB)
- [ ] Backup taken (deploy/scripts/backup.sh)

## Odoo
- [x] Odoo 19 CE running (systemd odoo19)
- [ ] DB motionpark_odoo initialized
- [x] Custom addons installed (9)
- [ ] Membership products configured
- [ ] Subscription engine installed
- [ ] CRM / Sales / Invoicing installed

## Integration
- [x] Membership plan sync (Odoo → read model)
- [x] Customer create/sync (idempotent) with duplicate protection
- [ ] Subscription create idempotent

## Domain
- [x] DNS motion-park.com → server
- [x] DNS www → server
- [ ] DNS erp → server (external — see DNS_REQUIRED.md)

## SSL
- [x] motion-park.com + www certificate
- [ ] erp.motion-park.com certificate (pending erp DNS)

## Security
- [x] Ports locked (22/80/443)
- [x] Secrets out of git
- [x] Non-root runtime users
- [x] Odoo admin default password changed
- [ ] Motion Park super-admin password secured (INITIAL_ADMIN.txt)

## Backup
- [x] Backup script + daily cron
- [x] Restore doc (DB + filestore + addons + media)
