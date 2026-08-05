#!/usr/bin/env bash
set -Eeuo pipefail

backup_root="${ST_VILLAGE_BACKUP_ROOT:-/var/backups/st-village}"
retention_days="${ST_VILLAGE_BACKUP_RETENTION_DAYS:-30}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive="${backup_root}/st-village-${timestamp}.tar.gz"
temporary="${archive}.tmp"
verification_dir=""

[[ "$backup_root" == /var/backups/st-village || "$backup_root" == /var/backups/st-village/* ]] || {
  printf 'Unsafe backup root: %s\n' "$backup_root" >&2
  exit 1
}
[[ "$retention_days" =~ ^[1-9][0-9]*$ ]] || { printf 'Invalid retention period\n' >&2; exit 1; }

install -d -o root -g root -m 700 "$backup_root"
umask 077

sources=()
for path in \
  etc/st-village \
  etc/caddy/Caddyfile \
  etc/caddy/st-village-dev.env \
  etc/caddy/st-village-admin.env \
  opt/st-village-site/data \
  opt/st-village-dev/data; do
  [[ -e "/${path}" ]] && sources+=("$path")
done
[[ "${#sources[@]}" -gt 0 ]] || { printf 'No backup sources found\n' >&2; exit 1; }

tar --create --gzip --file "$temporary" --directory / --numeric-owner -- "${sources[@]}"
tar --test-label --file "$temporary" >/dev/null 2>&1 || tar --list --gzip --file "$temporary" >/dev/null
mv -- "$temporary" "$archive"
chmod 600 "$archive"
sha256sum "$archive" > "${archive}.sha256"
chmod 600 "${archive}.sha256"

verification_dir="$(mktemp -d "${backup_root}/.verify-${timestamp}-XXXXXX")"
trap '[[ -n "${verification_dir:-}" ]] && rm -rf -- "$verification_dir"; rm -f -- "$temporary"' EXIT
tar --extract --gzip --file "$archive" --directory "$verification_dir"
[[ -d "${verification_dir}/etc/st-village" ]] || { printf 'Backup verification failed\n' >&2; exit 1; }

find "$backup_root" -maxdepth 1 -type f -name 'st-village-*.tar.gz' -mtime "+${retention_days}" -delete
find "$backup_root" -maxdepth 1 -type f -name 'st-village-*.tar.gz.sha256' -mtime "+${retention_days}" -delete

if [[ -n "${RESTIC_REPOSITORY:-}" && -n "${RESTIC_PASSWORD_FILE:-}" ]]; then
  command -v restic >/dev/null || { printf 'restic is configured but not installed\n' >&2; exit 1; }
  restic backup "$archive" "${archive}.sha256"
  restic forget --keep-daily 14 --keep-weekly 8 --keep-monthly 12 --prune
fi

printf 'backup=%s status=verified\n' "$archive"
