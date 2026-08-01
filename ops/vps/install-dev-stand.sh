#!/usr/bin/env bash
set -Eeuo pipefail

stage="/tmp/st-village-dev-stage"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
caddy_backup="/etc/caddy/Caddyfile.pre-dev-${timestamp}"

if [[ "${EUID}" -ne 0 ]]; then
  printf 'This installer must run as root.\n' >&2
  exit 1
fi

install_log="/tmp/st-village-dev-install.log"
: > "$install_log"
chown root:stvadmin "$install_log"
chmod 640 "$install_log"
exec >>"$install_log" 2>&1
report_exit() {
  local status="$?"
  printf 'installer-exit=%s\n' "$status"
}
trap report_exit EXIT

printf 'step=preflight\n'

if [[ ! -d "$stage" || -L "$stage" || "$(readlink -f "$stage")" != "$stage" ]]; then
  printf 'Invalid staging directory: %s\n' "$stage" >&2
  exit 1
fi

required=(
  Caddyfile
  caddy-st-village-dev.conf
  deploy-dev.sh
  st-village-dev-site.service
  st-village-dev-deploy.service
  st-village-dev-deploy.timer
)

for file in "${required[@]}"; do
  [[ -f "${stage}/${file}" && ! -L "${stage}/${file}" ]] || {
    printf 'Missing staged file: %s\n' "$file" >&2
    exit 1
  }
done

getent passwd stvillage-web >/dev/null
getent group stvillage-web >/dev/null
getent passwd stvadmin >/dev/null
getent group stvadmin >/dev/null
[[ -f /etc/st-village/site.env ]]

printf 'step=credentials\n'
dev_auth_user="st-village-dev"
dev_auth_password="$(openssl rand -hex 16)"
dev_auth_hash="$(printf '%s\n' "$dev_auth_password" | caddy hash-password --algorithm bcrypt)"

umask 077
printf "ST_VILLAGE_DEV_AUTH_USER='%s'\nST_VILLAGE_DEV_AUTH_HASH='%s'\n" \
  "$dev_auth_user" "$dev_auth_hash" > "${stage}/caddy.env"
printf 'URL=https://dev.stvillage.ru\nUSER=%s\nPASSWORD=%s\n' \
  "$dev_auth_user" "$dev_auth_password" > "${stage}/credentials"
install -o stvadmin -g stvadmin -m 600 "${stage}/credentials" /home/stvadmin/.st-village-dev-credentials
unset dev_auth_password

printf 'step=runtime-env\n'
install -d -o root -g stvillage-web -m 750 /etc/st-village
grep -v '^NEXT_PUBLIC_SITE_URL=' /etc/st-village/site.env > "${stage}/dev.env"
install -o root -g stvillage-web -m 640 "${stage}/dev.env" /etc/st-village/dev.env

printf 'step=units\n'
install -o root -g root -m 700 "${stage}/deploy-dev.sh" /usr/local/sbin/st-village-dev-deploy
install -o root -g root -m 644 "${stage}/st-village-dev-site.service" /etc/systemd/system/st-village-dev-site.service
install -o root -g root -m 644 "${stage}/st-village-dev-deploy.service" /etc/systemd/system/st-village-dev-deploy.service
install -o root -g root -m 644 "${stage}/st-village-dev-deploy.timer" /etc/systemd/system/st-village-dev-deploy.timer

printf 'step=caddy-environment\n'
install -d -o root -g root -m 755 /etc/systemd/system/caddy.service.d
install -o root -g root -m 600 "${stage}/caddy.env" /etc/caddy/st-village-dev.env
install -o root -g root -m 644 "${stage}/caddy-st-village-dev.conf" /etc/systemd/system/caddy.service.d/st-village-dev.conf
install -d -o caddy -g caddy -m 755 /var/log/caddy
touch /var/log/caddy/st-village-dev.log
chown caddy:caddy /var/log/caddy/st-village-dev.log
chmod 600 /var/log/caddy/st-village-dev.log

set -a
source /etc/caddy/st-village-dev.env
set +a
printf 'step=caddy-adapt\n'
caddy adapt --config "${stage}/Caddyfile" --adapter caddyfile >/dev/null

printf 'step=caddy-install\n'
cp -a /etc/caddy/Caddyfile "$caddy_backup"
install -o root -g root -m 644 "${stage}/Caddyfile" /etc/caddy/Caddyfile

printf 'step=daemon-reload\n'
systemctl daemon-reload
printf 'step=caddy-reload\n'
if ! systemctl reload caddy; then
  caddy_journal="$(journalctl -u caddy.service --since '-1 minute' --no-pager -o cat 2>/dev/null || true)"
  caddy_error_code="unknown"
  if grep -Eqi 'permission denied' <<<"$caddy_journal"; then
    caddy_error_code="permissions"
  elif grep -Eqi 'environment|ST_VILLAGE_DEV_AUTH|placeholder' <<<"$caddy_journal"; then
    caddy_error_code="environment"
  elif grep -Eqi 'basic_auth|bcrypt|password hash|authentication' <<<"$caddy_journal"; then
    caddy_error_code="authentication"
  elif grep -Eqi 'certificate|acme|tls' <<<"$caddy_journal"; then
    caddy_error_code="tls"
  elif grep -Eqi 'address already in use|bind:' <<<"$caddy_journal"; then
    caddy_error_code="port-conflict"
  elif grep -Eqi 'log writer|logging' <<<"$caddy_journal"; then
    caddy_error_code="logging"
  elif grep -Eqi 'parsing|adapting config|loading config|invalid' <<<"$caddy_journal"; then
    caddy_error_code="configuration"
  fi
  printf 'caddy-error-code=%s\n' "$caddy_error_code"
  unset caddy_journal
  cp -a "$caddy_backup" /etc/caddy/Caddyfile
  systemctl reload caddy || true
  exit 1
fi

printf 'step=enable-services\n'
systemctl enable st-village-dev-site.service
systemctl enable --now st-village-dev-deploy.timer
systemctl start --no-block st-village-dev-deploy.service

printf 'step=cleanup\n'
fail2ban-client set sshd delignoreip 62.183.21.227 >/dev/null 2>&1 || true
rm -rf -- "$stage"

printf 'ST VILLAGE dev stand installation started.\n'
trap - EXIT
rm -f -- "$install_log"
