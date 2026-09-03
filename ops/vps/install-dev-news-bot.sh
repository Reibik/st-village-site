#!/usr/bin/env bash
set -Eeuo pipefail

release_root="/opt/st-village-dev/current"
environment_file="/etc/st-village/dev.env"

if [[ "${EUID}" -ne 0 ]]; then
  printf 'This installer must run as root.\n' >&2
  exit 1
fi

[[ -d "$release_root" && ! -L "${release_root}/ops/vps/st-village-dev-news-bot.service" ]] || {
  printf 'The current development release is unavailable.\n' >&2
  exit 1
}
[[ -f "$environment_file" && ! -L "$environment_file" ]] || {
  printf 'The development environment file is unavailable.\n' >&2
  exit 1
}

required=(TELEGRAM_NEWS_BOT_TOKEN SITE_BOT_API_TOKEN SITE_BOT_ADMIN_IDS SITE_NEWS_ACTOR_ID)
set -a
source "$environment_file"
set +a
for name in "${required[@]}"; do
  [[ -n "${!name:-}" ]] || {
    printf 'Missing required setting: %s\n' "$name" >&2
    exit 1
  }
done

install -o root -g root -m 644 "${release_root}/ops/vps/st-village-dev-news-bot.service" /etc/systemd/system/st-village-dev-news-bot.service
install -o root -g root -m 700 "${release_root}/ops/vps/deploy-dev.sh" /usr/local/sbin/st-village-dev-deploy
systemctl daemon-reload
systemctl enable --now st-village-dev-news-bot.service
systemctl is-active --quiet st-village-dev-news-bot.service
printf 'ST VILLAGE Telegram news synchronization is active.\n'
