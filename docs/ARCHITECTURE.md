# Motion Park — Architecture

Date: 2026-09-26
Status: Production architecture (implemented)

## 1. Overview

Motion Park is a women & girls sports/wellness platform in Riyadh, Saudi Arabia. It is **two applications**:

1. **Motion Park Platform** — Angular (public site + customer portal + admin/CMS) + ASP.NET Core backend + PostgreSQL + Redis.
2. **Odoo 19 Community ERP** — CRM, Sales, Invoicing, Products, and the commercial membership/subscription system of record.

The Angular app is **never** a replacement for Odoo and **never** talks to Odoo directly. All Odoo traffic flows through the Motion Park backend integration services.

```
                        INTERNET
                            |
                     motion-park.com  (Nginx :443)
                       /          \
              Angular static     /api/  →  Motion Park API (:5000, 127.0.0.1)
              (browser)                    |
                                    ASP.NET Core (Clean Architecture)
                                       |        |        |
                                    PostgreSQL Redis  Odoo XML-RPC/JSON client
                                    (motionpark)  |        |
                                            (motionpark_odoo :8069, 127.0.0.1)
                                                       |
                                            Odoo 19 Community ERP
                                            (CRM/Sales/Invoices/Membership/Subscription)

erp.motion-park.com (Nginx :443) → 127.0.0.1:8069  (admin/staff ERP only)
```

## 2. Component Decisions

| Layer | Technology | Why |
|---|---|---|
| Public frontend | Angular 19 (standalone, Signals, SCSS, strict TS) | Approved production frontend, i18n RTL/LTR, lazy routes |
| Design reference | React/Vite preserved under `reference-design/react-vite` | Approved visual identity source only |
| Backend | ASP.NET Core 8 (LTS), Clean Architecture, EF Core, FluentValidation | LTS, strongly typed, robust integration layer |
| App database | PostgreSQL 16 (`motionpark`) | Production RDBMS, separate user `motionpark_app` |
| ERP | Odoo 19 **Community Edition** source install at `/opt/odoo19` | CRM/Sales/Invoicing + custom membership/subscription engine |
| ERP database | PostgreSQL 16 (`motionpark_odoo`, user `odoo19`) | Separate DB + user, no superuser apps |
| Cache/queue | Redis 7 | Cache, distributed locks (booking race protection), rate-limit state |
| Web server | Nginx 1.24 | TLS termination, static hosting, reverse proxy |
| OS services | systemd (`motionpark-api`, `odoo19`, `nginx`, `postgresql`, `redis-server`) | Auto start, restart-on-failure |

## 3. Backend Layering (Clean Architecture)

```
MotionPark.Domain          — entities, enums, value objects (no dependencies)
MotionPark.Application     — CQRS handlers, DTOs, interfaces, FluentValidation
MotionPark.Infrastructure  — EF Core, PostgreSQL, Redis, Odoo client, SMTP, payment stubs
MotionPark.Api             — controllers, auth, middleware, health checks, Swagger
```

- **CQRS** via MediatR-style handlers (custom lightweight dispatcher to keep dependency surface small).
- **Odoo integration** lives in Infrastructure as a typed `IOdooClient` (XML-RPC). Credentials only in backend env.
- **Membership read model**: Odoo is the source of truth for plans/prices; a sync job denormalizes into `MembershipPlanReadModels` so public pages never call Odoo per-request.
- **Idempotency**: every write carries a client-generated `IdempotencyKey`/UUID; integration records keep `MotionParkTransactionId` to prevent duplicates across retries.
- **Failure mode**: Odoo down → integration status `Degraded`, public site serves cached read models, jobs queue for retry. Nothing silently lost.

## 4. Data Ownership

| Data | System of record | Notes |
|---|---|---|
| Membership products, prices, VAT, validity | **Odoo** `product.template` (Motion Park fields) | Synced to read model |
| Subscriptions/invoices/orders/payments | **Odoo** | `motionpark.subscription` custom engine |
| Customers (commercial) | **Odoo** `res.partner` | Mapped via `OdooMappings` |
| Platform users/accounts, CMS, bookings, schedules, coaches, branches, media | **Motion Park DB** | Angular/admin managed |
| Odoo↔platform link | `OdooMappings` + `IntegrationLogs` | never trust display name; match normalized mobile/email/UUID |

## 5. Security Model

- Angular never holds Odoo or DB credentials. JWT (short-lived access + refresh) for platform auth.
- RBAC roles: Super Admin, Content Manager, Marketing, Membership Manager, Schedule Manager, Branch Manager, Customer Service, Finance Viewer.
- Odoo reachable only via `erp.motion-park.com` through Nginx (`proxy_mode=True`), bound to `127.0.0.1:8069`.
- PostgreSQL/Redis/API bind localhost only. Secrets in `/etc/odoo19.conf` + backend `.env` (both outside git, `600`).
- Rate limiting on login/register/forgot-password/leads/payments.

## 6. Scaling Path

Current: 1 VM (2 vCPU / 7.8 GB). Odoo `workers=2`, `max_cron_threads=1`. Redis-backed locks make the booking engine safe to scale horizontally later. Media on disk (`storage/media`) with Nginx `X-Accel-Redirect` authorization. Backups via `deploy/scripts/backup.sh`.
