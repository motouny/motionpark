# SERVER AUDIT — Motion Park Production Server

Date: 2026-09-26
Audited by: Motion Park deployment agent (automated Phase 0 audit)

## 1. System

| Item | Value |
|---|---|
| Hostname | srv2012598 |
| Kernel | Linux 6.8.0-142-generic #142-Ubuntu SMP PREEMPT_DYNAMIC x86_64 |
| OS | Ubuntu 24.04.5 LTS (Noble Numbat) |
| Virtualization | KVM (QEMU) |
| CPU | 2 vCPU — AMD EPYC 9354P |
| RAM | 7.8 GiB total, ~7.1 GiB available, **no swap** |
| Disk | 96 GB root (`/dev/sda1`), 1.8 GB used, 95 GB free |
| User | root (uid 0) |

## 2. Installed Tooling

| Tool | Version | Notes |
|---|---|---|
| git | 2.43.0 | OK |
| node | v22.23.3 | OK for Angular 18/19 |
| npm | 10.9.9 | OK |
| pnpm | — | not installed (npm is sufficient) |
| python3 | 3.12.3 | OK for Odoo 19 |
| pip3 | — | **MISSING — install python3-pip + python3-venv** |
| dotnet | — | **MISSING — install .NET 8 SDK** |
| psql | — | **MISSING — install PostgreSQL** |
| redis-server | — | **MISSING — install** |
| nginx | — | **MISSING — install** |
| docker | — | not installed, not required |
| certbot | — | **MISSING — install with python3-certbot-nginx** |

## 3. Listening Ports (pre-deployment)

| Port | Process |
|---|---|
| 22 | sshd |
| 53 | systemd-resolved (local resolver) |
| 1721/65529 | monarx-agent (host security scanner — **do not touch**) |

No web server, database, or application ports are in use. **No existing applications to preserve.**

## 4. Running Services

cron, dbus, monarx-agent, qemu-guest-agent, rsyslog, ssh, systemd-* , unattended-upgrades.
No PostgreSQL / Odoo / Nginx / Node services exist.

## 5. Network / DNS

| Record | Resolves to | Status |
|---|---|---|
| motion-park.com | 186.241.26.190 | **MATCHES server IPv4** ✔ |
| www.motion-park.com | 186.241.26.190 | **MATCHES server IPv4** ✔ |
| erp.motion-park.com | — | **NO DNS RECORD — required** |

- Server IPv4: `186.241.26.190` (eth0)
- Server IPv6: `2a02:4780:79:d1a6::1/48`
- Firewall (ufw): **inactive** — will enable with only 22/80/443 open at deployment end.
- iptables: default ACCEPT, empty chains.

## 6. Existing State Conclusions

- **No prior Odoo installation.** Clean install of Odoo 19 CE required.
- **No prior PostgreSQL.** Will install PostgreSQL 16 (Ubuntu 24.04 default; satisfies Odoo 19 requirement of PG ≥ 13).
- **No prior Nginx.** Full freedom to configure sites without breaking existing apps.
- **No existing SSL certificates.**
- Monarx security agent runs on ports 1721/65529 — must not be disrupted.

## 7. Resource Plan

- 2 vCPU / 7.8 GB RAM is adequate for: Nginx + PostgreSQL + Redis + .NET API + Odoo 19 (workers=2, max_cron_threads=1).
- No swap configured; builds (Angular/.NET) will run with memory care. A 4 GB swapfile will be added to protect builds and Odoo.
- 95 GB free disk is ample (Odoo source ~1.5 GB, .NET/Node tooling ~3 GB, media/backups growth headroom).

## 8. Risks / Notes

1. `pip3` missing → install `python3-pip python3-venv python3-dev`.
2. No swap → add `/swapfile` before heavy builds.
3. ufw inactive → configure at the end (22, 80, 443 only; never disrupt SSH).
4. erp.motion-park.com has no DNS record → documented in `docs/DNS_REQUIRED.md`; server will be fully configured so it works the moment DNS is added.
