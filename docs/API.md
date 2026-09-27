# Motion Park — API Contract

Base URL: `/api` (served by ASP.NET Core backend, proxied by Nginx)
Auth: `Authorization: Bearer <jwt>` for customer + admin endpoints.
Idempotency: write endpoints accept `Idempotency-Key: <uuid>` header (server dedupes retries).
All localized string fields come in pairs: `nameAr/nameEn`, `descriptionAr/descriptionEn`, etc.
Currency: `SAR`. Timezone: `Asia/Riyadh`. Errors: `{ "error": { "code": "string", "message": "string" } }`

## Public (no auth)

### GET /api/public/membership-plans
```json
[
  {
    "id": "guid",
    "odooProductId": 12,
    "slug": "motion-plus",
    "nameAr": "موشن بلس", "nameEn": "Motion Plus",
    "descriptionAr": "...", "descriptionEn": "...",
    "price": 499.0, "vat": 15.0, "currency": "SAR",
    "duration": 1, "durationUnit": "month",
    "sessionLimit": 0,
    "branches": [{"id":"guid","nameAr":"...","nameEn":"..."}],
    "activities": [{"id":"guid","nameAr":"...","nameEn":"..."}],
    "featured": true, "sortOrder": 2, "active": true
  }
]
```
> Sourced from the Odoo-synced read model — never calls Odoo at request time.

### GET /api/public/activities  → `[{ id, slug, nameAr, nameEn, descriptionAr, descriptionEn, imageUrl, icon, active }]`
### GET /api/public/activities/{slug} → single + coaches
### GET /api/public/coaches → `[{ id, slug, nameAr, nameEn, bioAr, bioEn, photoUrl, certifications[], activities[], branches[], active }]`
### GET /api/public/coaches/{slug}
### GET /api/public/branches → `[{ id, slug, nameAr, nameEn, city, address, latitude, longitude, phone, whatsapp, operatingHours, active }]`
### GET /api/public/branches/{slug}
### GET /api/public/schedule?branchId=&date= → `[{ id, branchId, activityId, coachId, date, startTime, endTime, capacity, bookedCount, seatsLeft, waitingListCount, ageMin, ageMax, genderScope, membershipPlanIds[] }]`
### GET /api/public/pages/{slug} → `{ slug, titleAr, titleEn, contentAr, contentEn, seo{...} }` (about, privacy, terms, contact…)
### GET /api/public/faqs → `[{ id, questionAr, questionEn, answerAr, answerEn, sortOrder }]`
### GET /api/public/testimonials → `[{ id, name, textAr, textEn, rating, active }]`
### GET /api/public/banners → active banner list
### GET /api/public/homepage → ordered enabled homepage sections (hero, activities, memberships, coaches, schedule, facilities, gallery, about, testimonials, promotions, branches, contact, cta) with CMS content

### POST /api/public/leads   (rate-limited)
```json
{ "name": "...", "phone": "05xxxxxxx", "email": "...", "type": "contact|callback|trial|membership_interest",
  "branchId": "guid?", "activityId": "guid?", "membershipPlanId": "guid?",
  "message": "...", "utmSource": "...", "utmCampaign": "...", "utmMedium": "..." }
```
Creates local lead; syncs to Odoo CRM when available.

## Auth

### POST /api/auth/register `{ name, email?, phone, password, preferredLanguage: "ar"|"en" }`
Phone normalized `05xxxxxxxx` → `+9665xxxxxxxx`. Creates account + Odoo partner (mapped). → `{ accessToken, refreshToken, user }`
### POST /api/auth/login `{ identifier (email|phone), password }` → tokens
### POST /api/auth/refresh `{ refreshToken }` → new tokens
### POST /api/auth/logout (auth) → revoke refresh token
### POST /api/auth/forgot-password `{ identifier }` → always 200 (no enumeration)
### POST /api/auth/reset-password `{ token, newPassword }`

## Account / Customer Portal (auth)

### GET  /api/account/profile ; PUT /api/account/profile
### GET  /api/account/membership → current active `CustomerMembership` + `membership` plan
### GET  /api/account/qr → `{ qrToken }` (opaque rotating token; no PII in QR)
### GET  /api/account/bookings?status= → bookings
### POST /api/account/bookings `{ scheduleId, idempotencyKey }` → booking (validates membership, capacity, duplicates, conflicts; waiting-list when full)
### POST /api/account/bookings/{id}/cancel → cancel (restores sessions per policy; promotes waitlist)
### GET  /api/account/payments ; GET /api/account/invoices → mapped from synced Odoo invoices (number, date, amount, vat, total, status, pdfUrl?)
### GET  /api/account/notifications ; POST /api/account/notifications/{id}/read

## Memberships / Subscriptions (auth)

### GET  /api/memberships → alias of public plans (auth-aware)
### POST /api/subscriptions `{ membershipPlanId, branchId?, paymentMethodId?, idempotencyKey }`
→ creates Odoo sale order + `motionpark.subscription` (status `pending_payment`). If payment provider not configured → `402` `{ code: "PAYMENT_CREDENTIALS_REQUIRED" }`.
### GET  /api/account/subscription → `{ id, plan, status, startDate, endDate, nextBillingDate, billingCycle, remainingSessions, autoRenew, paymentStatus }`
### POST /api/subscriptions/{id}/cancel `{ reason? }`
### POST /api/subscriptions/{id}/renew

## Admin (RBAC-guarded)

### GET /api/admin/dashboard → counts + health snapshot
### CMS
- GET/PUT /api/admin/homepage/sections → edit/enable/disable/reorder/publish
- GET/PUT /api/admin/brand → logo(primary/dark/light), favicon, colors, gradients, typography, contact, socials
- CRUD /api/admin/pages, /api/admin/banners, /api/admin/faqs, /api/admin/testimonials
### Content
- CRUD /api/admin/activities, /api/admin/coaches, /api/admin/branches, /api/admin/schedules
### Media Library
- GET /api/admin/media?search=&category=
- POST /api/admin/media (multipart, multiple) → stored in `/var/www/motionpark/storage/media` (NOT git)
- PUT /api/admin/media/{id} (altAr, altEn, title, category), DELETE /api/admin/media/{id}
- GET /api/media/{id}/file → authorized file serving
### Membership display: GET/PUT /api/admin/membership-plans (display/sort/featured overrides; price stays Odoo-owned)
### Customers: GET /api/admin/customers, GET/PUT /api/admin/customers/{id}
### Leads: GET /api/admin/leads, PUT /api/admin/leads/{id} (status)
### Integrations
- GET /api/admin/integrations/odoo → `{ connected, lastSuccessAt, lastPlanSyncAt, lastCustomerSyncAt, failedJobs, pendingQueue }`
- POST /api/admin/integrations/odoo/test
- POST /api/admin/integrations/odoo/sync-plans
- POST /api/admin/integrations/odoo/retry-failed
- GET /api/admin/integrations/odoo/logs
### System
- GET /api/admin/health → API/DB/Redis/Odoo + last sync + failed jobs
- GET /api/admin/audit-logs?entity=&entityId=
- GET/PUT /api/admin/settings ; GET/PUT /api/admin/roles/{id}

## Health (no auth)

- GET /api/health → `{ status: "Healthy|Degraded|Unhealthy", checks: {...} }`
- GET /api/health/database → PostgreSQL
- GET /api/health/redis → Redis
- GET /api/health/odoo → Odoo reachability (degraded, not fatal)

## Payments
`IPaymentProvider` implementations: `moyasar` (production), `mock` (dev only). Production without credentials → endpoints return `402 PAYMENT_CREDENTIALS_REQUIRED` (never fake success).

### Moyasar (mada, Visa/Mastercard, Apple Pay)
Set `PAYMENT_PROVIDER=moyasar`, `PAYMENT_SECRET=sk_...`, `PAYMENT_KEY=pk_...`, `PAYMENT_CALLBACK_URL`.

`paymentMethodId` on `POST /api/subscriptions` and `POST /api/subscriptions/{id}/renew` is one of:
- **Moyasar payment id** — the browser pays with the Moyasar payment form (publishable key, `methods: ['creditcard','applepay']`, `metadata.customer_id` optional), which runs 3-D Secure for mada. The API fetches the payment with the secret key and accepts it only when it is `paid` (or `authorized`, which it captures) for the plan's exact amount and currency.
- **`applepay:<Apple Pay payment token JSON>`** — native Apple Pay sheet; the API creates the payment server-side (`given_id` derived from the idempotency key).

### POST /api/payments/checkout `{ membershipPlanId }` (auth)
→ `{ provider, publishableKey, amount (halalas), currency, description, callbackUrl, idempotencyKey, metadata }` for the Moyasar form; `402` when payments are off. The Angular plan page renders the form with it, and Moyasar returns the customer to `/account/payments/callback?id=…&status=…`, which calls `POST /api/subscriptions` with the payment id and the same idempotency key.

### POST /api/payments/moyasar/webhook (Moyasar → API)
Register it in the Moyasar dashboard for `payment_paid` with secret `PAYMENT_WEBHOOK_SECRET`. It completes the subscription from the payment's metadata when the customer paid but never came back; it is a no-op when the callback already did. Returns `404` while `PAYMENT_WEBHOOK_SECRET` is unset, `401` on a wrong secret.

A payment id can pay for one order only (`409 PAYMENT_ALREADY_USED`). Failures return `409 PAYMENT_FAILED` with the reason; `PaymentTransaction.FailureCode` keeps the detailed code (`PAYMENT_AMOUNT_MISMATCH`, `PAYMENT_NOT_COMPLETED`, `PAYMENT_DECLINED`, `PAYMENT_PROVIDER_UNAVAILABLE`, ...).
