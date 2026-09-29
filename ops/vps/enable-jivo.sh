#!/usr/bin/env bash
# Apply only the reviewed CSP header; leave domains, authentication and routes intact.
set -Eeuo pipefail

[[ "$EUID" -eq 0 ]] || { echo "Run this script with sudo." >&2; exit 1; }
config=/etc/caddy/Caddyfile
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
source_config="${script_dir}/Caddyfile"
pattern='^[[:space:]]*Content-Security-Policy "'

[[ -f "$config" && ! -L "$config" ]] || { echo "Unexpected Caddy configuration path." >&2; exit 1; }
[[ "$(grep -c "$pattern" "$config")" == 1 && "$(grep -c "$pattern" "$source_config")" == 1 ]] || {
  echo "Expected exactly one shared CSP header. Manual review required." >&2
  exit 1
}

policy="$(grep "$pattern" "$source_config")"
if [[ "$(grep "$pattern" "$config")" == "$policy" ]]; then
  echo "Jivo security policy is already configured."
  exit 0
fi

backup="${config}.before-jivo-$(date +%Y%m%d-%H%M%S)-$$"
cp -a -- "$config" "$backup"
staging="$(mktemp /etc/caddy/.jivo-policy.XXXXXX)"
trap 'rm -f -- "$staging"' EXIT
# The committed policy contains no sed replacement metacharacters.
[[ "$policy" != *'&'* && "$policy" != *'|'* && "$policy" != *'\'* ]] || exit 1
sed "s|${pattern}.*|${policy}|" "$config" > "$staging"
chown --reference="$config" "$staging"
chmod --reference="$config" "$staging"
mv -- "$staging" "$config"

# Caddy validates a reload before switching; a failed reload keeps the old server running.
if ! systemctl reload caddy; then
  cp -a -- "$backup" "$config"
  echo "Reload failed. Original configuration restored: $backup" >&2
  exit 1
fi
echo "Jivo security policy enabled. Backup: $backup"
