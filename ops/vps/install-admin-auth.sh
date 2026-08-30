#!/usr/bin/env bash
set -Eeuo pipefail

stage="/tmp/st-village-admin-stage"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
[[ "${EUID}" -eq 0 ]] || { printf 'Run as root\n' >&2; exit 1; }
[[ -d "$stage" && ! -L "$stage" && "$(readlink -f "$stage")" == "$stage" ]] || {
  printf 'Invalid staging directory: %s\n' "$stage" >&2
  exit 1
}
for file in Caddyfile caddy-st-village-admin.conf; do
  [[ -f "${stage}/${file}" && ! -L "${stage}/${file}" ]] || { printf 'Missing %s\n' "$file" >&2; exit 1; }
done

admin_user="st-village-admin"
admin_password="$(openssl rand -hex 18)"
admin_hash="$(printf '%s\n' "$admin_password" | caddy hash-password --algorithm bcrypt)"
umask 077
printf "ST_VILLAGE_ADMIN_AUTH_USER='%s'\nST_VILLAGE_ADMIN_AUTH_HASH='%s'\n" \
  "$admin_user" "$admin_hash" > "${stage}/admin.env"
printf 'URL=https://stvillage.top/reviews/moderation\nUSER=%s\nPASSWORD=%s\n' \
  "$admin_user" "$admin_password" > "${stage}/credentials"

install -o root -g root -m 600 "${stage}/admin.env" /etc/caddy/st-village-admin.env
install -o stvadmin -g stvadmin -m 600 "${stage}/credentials" /home/stvadmin/.st-village-admin-credentials
install -d -o root -g root -m 755 /etc/systemd/system/caddy.service.d
install -o root -g root -m 644 "${stage}/caddy-st-village-admin.conf" /etc/systemd/system/caddy.service.d/st-village-admin.conf
cp -a /etc/caddy/Caddyfile "/etc/caddy/Caddyfile.pre-admin-${timestamp}"
install -o root -g root -m 644 "${stage}/Caddyfile" /etc/caddy/Caddyfile
systemctl daemon-reload
set -a
source /etc/caddy/st-village-admin.env
source /etc/caddy/st-village-dev.env
set +a
caddy adapt --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null
systemctl reload caddy
unset admin_password
rm -rf -- "$stage"
printf 'Production admin authentication installed. Credentials: /home/stvadmin/.st-village-admin-credentials\n'
