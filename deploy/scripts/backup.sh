#!/usr/bin/env bash
# Motion Park — backup script
# Backs up: Motion Park DB, Odoo DB, Odoo filestore, custom addons, media, configs.
# Usage: ./backup.sh            (full backup to storage/backups/<timestamp>/)
set -euo pipefail

ROOT="/var/www/motionpark"
BACKUP_ROOT="$ROOT/storage/backups"
TS="$(date +%Y%m%d_%H%M%S)"
DEST="$BACKUP_ROOT/$TS"
mkdir -p "$DEST"
# postgres OS user cannot write into www-data-owned storage; stage dumps in /tmp
STAGE="$(mktemp -d /tmp/mpbackup.XXXXXX)"
chmod 777 "$STAGE"   # allow postgres OS user to write dumps here
trap 'rm -rf "$STAGE"' EXIT

log(){ echo "[backup] $*"; }

# --- PostgreSQL dumps (run as postgres OS user into staging, then move) ---
log "Dumping Motion Park database (motionpark)..."
sudo -u postgres pg_dump -Fc -f "$STAGE/motionpark_db.dump" motionpark
mv "$STAGE/motionpark_db.dump" "$DEST/motionpark_db.dump"

log "Dumping Odoo database (motionpark_odoo)..."
sudo -u postgres pg_dump -Fc -f "$STAGE/motionpark_odoo_db.dump" motionpark_odoo
mv "$STAGE/motionpark_odoo_db.dump" "$DEST/motionpark_odoo_db.dump"

# --- Odoo filestore (MUST be backed up with the DB for a valid Odoo restore) ---
log "Archiving Odoo filestore..."
tar -czf "$DEST/odoo_filestore.tar.gz" -C /opt/odoo19/.local/share Odoo 2>/dev/null || log "WARN: no Odoo filestore yet (skipped)"

# --- Odoo custom addons (versioned) ---
log "Archiving custom addons + config reference..."
tar -czf "$DEST/motionpark_custom_addons.tar.gz" -C "$ROOT/erp" custom-addons 2>/dev/null || true
cp -a /etc/odoo19.conf "$DEST/odoo19.conf.reference" 2>/dev/null || true
chmod 600 "$DEST/odoo19.conf.reference" 2>/dev/null || true

# --- Media ---
log "Archiving media library..."
tar -czf "$DEST/media.tar.gz" -C "$ROOT/storage" media 2>/dev/null || true

# --- Metadata ---
cat > "$DEST/BACKUP_MANIFEST.txt" <<EOF
Motion Park backup
Created: $(date -Is)
Host: $(hostname)
Contents:
  motionpark_db.dump          - PostgreSQL custom-format dump of app DB
  motionpark_odoo_db.dump     - PostgreSQL custom-format dump of Odoo DB
  odoo_filestore.tar.gz       - Odoo binary filestore (restore WITH the Odoo DB)
  motionpark_custom_addons.tar.gz - Odoo custom addons snapshot
  odoo19.conf.reference       - config reference (contains secrets; keep private)
  media.tar.gz                - CMS media library

Restore: see docs/BACKUP_RESTORE.md
EOF

# --- Retention: keep last 14 backups ---
log "Applying retention (keep 14)..."
cd "$BACKUP_ROOT"
ls -1dt */ 2>/dev/null | tail -n +15 | xargs -r rm -rf

log "Backup complete: $DEST"
du -sh "$DEST" 2>/dev/null || true
