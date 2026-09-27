# Motion Park — Odoo Integration

Date: 2026-09-27

## Architecture
Angular never talks to Odoo. The ASP.NET Core backend is the only Odoo consumer via **XML-RPC** (`object.execute_kw`) against `http://127.0.0.1:8069` (internal). Credentials live only in `backend/.env` (`ODOO_*`) and `/etc/odoo19.conf`.

```
Angular → /api → Motion Park API → IOdooClient (XML-RPC, typed, timeout 30s, retry 3)
                                          ↓
        ┌─────────────────────────────────────────────────┐
        │  Odoo: motionpark.api (get_membership_products,  │
        │        create_subscription, create_lead, ping)    │
        │  motionpark.customer.sync (find_or_create_partner)│
        │  motionpark.lead.sync (create_lead)               │
        └─────────────────────────────────────────────────┘
```

## Integration surfaces (Odoo custom API models)
| Model | Method | Purpose |
|---|---|---|
| `motionpark.api` | `ping()` | health |
| `motionpark.api` | `get_membership_products()` | membership read-model sync |
| `motionpark.api` | `create_subscription(vals)` | idempotent subscription create (external_reference) |
| `motionpark.api` | `create_lead(vals)` | idempotent CRM lead create |
| `motionpark.customer.sync` | `find_or_create_partner(vals)` | idempotent partner: external_uuid → normalized mobile → email |
| `motionpark.lead.sync` | `create_lead(vals)` | idempotent CRM lead (external_reference) |

## Idempotency & duplicate prevention
- Every write carries an idempotency key (`Idempotency-Key` header → stored as `MotionParkTransactionId` / Odoo `external_reference` / `external_uuid`).
- Retries never create duplicates (verified: repeated `create_subscription`/`find_or_create_partner` return the same record).
- Duplicate prevention order: external platform UUID → normalized mobile (`+9665…`) → email. Never name-only.
- Integration logs (`integration_logs`) record direction/entity/operation/local+Odoo id/status/attempt/error/timestamp (no secrets).

## Failure mode
If Odoo is down: public site stays online (cached read model), jobs queue in `odoo_sync_job` with backoff, integration status shows **Degraded** (`/api/admin/integrations/odoo`), nothing is silently lost.

## Field-mapping notes (Odoo 19)
- `res.partner` / `crm.lead` have **no `mobile` field** → mapped to `phone`.
- Phone normalization `05xxxxxxxx` → `+9665xxxxxxxx` (Saudi canonical).
- Product membership fields: `motionpark_name_ar`, `website_featured`, `website_sort_order`, `list_price`, `taxes`, `motionpark_activity_ids` (renamed to avoid clobbering the `mail.activity` o2m).
- Valid Arabic lang code is `ar_SY` (no `ar_SA` in Odoo 19).

## Verification (see IMPLEMENTATION_STATUS.md)
Membership sync, customer sync, subscription lifecycle, CRM sync, idempotency — all runtime-tested end-to-end.
