#!/bin/bash
# Production backup for yophon-life.
#
# Server status:
# - yophon-life runs from /root/yophon-life via yophon-life.service.
# - /root/yophon-life is a git checkout of yophon/yophon-life.
# - No yophon-life backup GitHub repo was found.
#
# Recommended server install after creating/cloning a backup repo:
#   install -m 755 deploy/backup.sh /root/yophon-life-backup/backup.sh
#   57 */6 * * * /root/yophon-life-backup/backup.sh >> /var/log/yophon-life-backup.log 2>&1
set -euo pipefail

PATH=/root/.bun/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

DATA_DIR=${DATA_DIR:-/root/yophon-life/data}
BACKUP_DIR=${BACKUP_DIR:-/root/yophon-life-backup}
DB_SRC="$DATA_DIR/life.db"
DB_DST="$BACKUP_DIR/life.db"

log() {
  echo "[$(date '+%Y-%m-%dT%H:%M:%S%z')] $*"
}

log "Backup started"

if [ ! -f "$DB_SRC" ]; then
  log "Database not found: $DB_SRC"
  exit 0
fi

mkdir -p "$BACKUP_DIR"

log "Snapshotting via VACUUM INTO"
TMP_DST="$DB_DST.tmp"
rm -f "$TMP_DST"
DB_SRC_ENV="$DB_SRC" DB_DST_ENV="$TMP_DST" bun -e '
  import { Database } from "bun:sqlite";
  const src = new Database(process.env.DB_SRC_ENV, { readonly: true });
  const dst = process.env.DB_DST_ENV.replace(/'\''/g, "''");
  src.exec(`VACUUM INTO '\''${dst}'\''`);
  src.close();
'
mv -f "$TMP_DST" "$DB_DST"
log "Snapshot ready"

if [ ! -d "$BACKUP_DIR/.git" ]; then
  log "Backup directory is not a git repo; leaving snapshot at $DB_DST"
  exit 0
fi

cd "$BACKUP_DIR"
git add -A
if git diff --cached --quiet; then
  log "No changes to backup"
  exit 0
fi

git commit -m "backup: $(date +%Y-%m-%d_%H:%M)"

TOTAL=$(git rev-list --count HEAD)
if [ "$TOTAL" -gt 30 ]; then
  git checkout --orphan temp
  git add -A
  git commit -m "backup: squashed to latest 30"
  git branch -D main 2>/dev/null || true
  git branch -m main
fi

if git remote get-url origin >/dev/null 2>&1; then
  git push origin main --force
  log "Backup pushed"
else
  log "No origin remote configured; committed local backup only"
fi
