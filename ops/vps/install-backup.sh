#!/usr/bin/env bash
set -Eeuo pipefail

stage="/tmp/st-village-backup-stage"
[[ "${EUID}" -eq 0 ]] || { printf 'Run as root\n' >&2; exit 1; }
[[ -d "$stage" && ! -L "$stage" && "$(readlink -f "$stage")" == "$stage" ]] || {
  printf 'Invalid staging directory: %s\n' "$stage" >&2
  exit 1
}
for file in backup.sh st-village-backup.service st-village-backup.timer; do
  [[ -f "${stage}/${file}" && ! -L "${stage}/${file}" ]] || { printf 'Missing %s\n' "$file" >&2; exit 1; }
done

install -d -o root -g root -m 700 /var/backups/st-village
install -o root -g root -m 700 "${stage}/backup.sh" /usr/local/sbin/st-village-backup
install -o root -g root -m 644 "${stage}/st-village-backup.service" /etc/systemd/system/st-village-backup.service
install -o root -g root -m 644 "${stage}/st-village-backup.timer" /etc/systemd/system/st-village-backup.timer
if [[ ! -f /etc/st-village/backup.env ]]; then
  install -o root -g root -m 600 /dev/null /etc/st-village/backup.env
fi
systemctl daemon-reload
systemctl enable --now st-village-backup.timer
systemctl start st-village-backup.service
systemctl is-active --quiet st-village-backup.timer
journalctl -u st-village-backup.service -n 5 --no-pager -o cat
rm -rf -- "$stage"
