# Motion Park — Odoo 19 Community Installation

Date: 2026-09-26

## Edition & source
- **Odoo 19 Community Edition** (no Enterprise, no proprietary subscription modules).
- Source: official GitHub `odoo/odoo`, branch `19.0`, shallow clone.
- Location: `/opt/odoo19/odoo-src` (owned by user `odoo19`).

## Layout
| Path | Purpose |
|---|---|
| `/opt/odoo19/odoo-src` | Odoo 19.0 CE source |
| `/opt/odoo19/venv` | Python 3.12 virtualenv with official `requirements.txt` |
| `/etc/odoo19.conf` | Odoo configuration (mode 600, owner odoo19) — secrets live here, not in git |
| `/var/www/motionpark/erp/custom-addons` | Motion Park custom modules |
| `/opt/odoo19/.local/share/Odoo` | data_dir / filestore |
| `/var/log/odoo19/odoo.log` | log |
| `/etc/systemd/system/odoo19.service` | systemd unit |

## Runtime
- Runs as dedicated user **`odoo19`** (never root), via systemd, `Restart=always`, starts on boot.
- Binds **`127.0.0.1:8069`** only (gevent longpolling on 8072). Not exposed publicly — reached via `erp.motion-park.com` → Nginx reverse proxy.
- `proxy_mode = True`, `list_db = False`, `dbfilter = ^motionpark_odoo$`.
- workers=2, max_cron_threads=1 (memory profile for 2 vCPU / 7.8 GB host).

## Python environment
- `python3 -m venv /opt/odoo19/venv`
- `pip install -r /opt/odoo19/odoo-src/requirements.txt` (official pins for Python 3.12: lxml 5.2.1, gevent 24.2.1, etc.)

## Database
- PostgreSQL 16 on 127.0.0.1:5432.
- DB: `motionpark_odoo`, dedicated non-superuser role `odoo19`.
- Master/admin password: stored only in `/etc/odoo19.conf` (`admin_passwd`), generated at install.

## Management commands
```bash
# service
systemctl status|restart odoo19

# install/upgrade a module (run as odoo19)
sudo -u odoo19 /opt/odoo19/venv/bin/python /opt/odoo19/odoo-src/odoo-bin \
  -c /etc/odoo19.conf -d motionpark_odoo -i <module> --stop-after-init
sudo -u odoo19 ... -u <module>   # upgrade
```

## Notes
- PostgreSQL 16 satisfies Odoo 19's requirement (PG ≥ 13).
- Community subscription/membership recurring logic is implemented in custom modules (`motionpark_subscription`) — no Enterprise code is used or copied.
