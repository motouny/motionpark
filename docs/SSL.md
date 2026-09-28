# Motion Park — SSL / HTTPS

Date: 2026-09-26

## Certificates (Let's Encrypt via Certbot)

| Domains | Status |
|---|---|
| `motion-park.com`, `www.motion-park.com` | **ISSUED** (cert `/etc/letsencrypt/live/motion-park.com/`), HTTPS + HTTP→HTTPS redirect active |
| `erp.motion-park.com` | **PENDING DNS** — no `erp` A record yet; vhost ready, cert to be issued once DNS resolves |

## Issued
```bash
certbot --nginx -d motion-park.com -d www.motion-park.com --redirect
```
- Cert valid: issued 2026-09-26 → expires 2026-12-25.
- Certbot `--nginx` plugin deployed the cert into the Nginx site and added the redirect.

## Auto-renewal
- `certbot.timer` active (runs twice daily); renewals deploy automatically.
- Verify: `systemctl status certbot.timer`, `certbot renew --dry-run`.

## Security
- TLS 1.2/1.3 via `/etc/letsencrypt/options-ssl-nginx.conf`; HSTS enabled there once stable.
- HTTP (80) remains open only for the redirect + renewal challenges.

## Pending
Issue the ERP certificate after adding the DNS A record (`docs/DNS_REQUIRED.md`):
```bash
certbot --nginx -d erp.motion-park.com --redirect
```
