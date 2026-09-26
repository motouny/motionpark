# Motion Park — Backup & Restore

Date: 2026-09-26

## What is backed up

`deploy/scripts/backup.sh` (run manually or via cron at 03:17 daily) produces a timestamped directory under `storage/backups/<timestamp>/`:

| File | Contents |
|---|---|
| `motionpark_db.dump` | PostgreSQL custom-format dump of the Motion Park app DB |
| `motionpark_odoo_db.dump` | PostgreSQL custom-format dump of the Odoo DB |
| `odoo_filestore.tar.gz` | Odoo binary filestore (attachments) — **required** for a valid Odoo restore |
| `motionpark_custom_addons.tar.gz` | Snapshot of `erp/custom-addons` |
| `odoo19.conf.reference` | Config reference (contains secrets — keep private, mode 600) |
| `media.tar.gz` | CMS media library (`storage/media`) |
| `BACKUP_MANIFEST.txt` | Metadata |

Retention: last 14 backups kept (auto-pruned by the script).

> An Odoo backup is **DB + filestore + addons + config**, not just the database. Always restore all parts together.

## Restore procedure

### 1. Motion Park application DB
```bash
# Stop API
systemctl stop motionpark-api
# Restore
sudo -u postgres pg_restore --clean --if-exists -d motionpark \
  /var/www/motionpark/storage/backups/<ts>/motionpark_db.dump
# Restart
systemctl start motionpark-api
```

### 2. Odoo (DB + filestore + addons)
```bash
systemctl stop odoo19
# DB
sudo -u postgres pg_restore --clean --if-exists -d motionpark_odoo \
  /var/www/motionpark/storage/backups/<ts>/motionpark_odoo_db.dump
# Filestore (restore to Odoo data dir)
tar -xzf /var/www/motionpark/storage/backups/<ts>/odoo_filestore.tar.gz \
  -C /opt/odoo19/.local/share/
chown -R odoo19:odoo19 /opt/odoo19/.local/share/Odoo
# Custom addons (if needed)
tar -xzf /var/www/motionpark/storage/backups/<ts>/motionpark_custom_addons.tar.gz \
  -C /var/www/motionpark/erp/
chown -R odoo19:odoo19 /var/www/motionpark/erp/custom-addons
# Config (if needed) — restore then chmod 600 + chown odoo19:odoo19
systemctl start odoo19
```

### 3. Media library
```bash
tar -xzf /var/www/motionpark/storage/backups/<ts>/media.tar.gz -C /var/www/motionpark/storage/
chown -R www-data:www-data /var/www/motionpark/storage/media
```

## Off-server copies

The script keeps backups on-server only. For disaster recovery, copy `storage/backups/` off-server (e.g. `rsync`/`scp` to external storage or object storage). Treat backup dirs as sensitive — they contain full database dumps.
