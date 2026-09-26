# DNS REQUIRED — Motion Park

Date: 2026-09-26
Server public IPv4: **186.241.26.190**

## Current Resolution Status

| Hostname | Status | Resolves to |
|---|---|---|
| `motion-park.com` | ✅ OK | 186.241.26.190 (matches server) |
| `www.motion-park.com` | ✅ OK | 186.241.26.190 (matches server) |
| `erp.motion-park.com` | ❌ **NO RECORD** | — |

## Required DNS Records

Add the following **A record** at the domain registrar/DNS provider for `motion-park.com`:

```
Type:  A
Name:  erp
Value: 186.241.26.190
TTL:   3600
```

Existing records (verify they remain):

```
Type:  A
Name:  @
Value: 186.241.26.190

Type:  A
Name:  www
Value: 186.241.26.190
```

Optional IPv6 records (the server has IPv6 `2a02:4780:79:d1a6::1` — AAAA records may be added for `@`, `www`, `erp`):

```
Type:  AAAA
Name:  @
Value: 2a02:4780:79:d1a6::1

Type:  AAAA
Name:  www
Value: 2a02:4780:79:d1a6::1

Type:  AAAA
Name:  erp
Value: 2a02:4780:79:d1a6::1
```

## Server-Side Readiness

The server is fully configured to serve all three hostnames the moment DNS resolves:

- `motion-park.com` / `www.motion-park.com` → Nginx → Angular static build + `/api/` → Motion Park API
- `erp.motion-park.com` → Nginx → Odoo 19 CE (reverse proxy to `127.0.0.1:8069`)

SSL certificates will be issued via Certbot once the `erp` record resolves (the motion-park.com and www records already resolve and can be certified immediately).

## Verification Commands

```bash
dig +short motion-park.com       # expect: 186.241.26.190
dig +short www.motion-park.com   # expect: 186.241.26.190
dig +short erp.motion-park.com   # expect: 186.241.26.190 (after record added)
```
