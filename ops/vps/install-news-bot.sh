#!/usr/bin/env bash
set -Eeuo pipefail

release_root="/opt/st-village-site/current"
environment_file="/etc/st-village/site.env"
development_environment_file="/etc/st-village/dev.env"
production_data="/opt/st-village-site/data/observability.json"
development_data="/opt/st-village-dev/data/observability.json"
production_offset="/opt/st-village-site/data/telegram-news-offset.json"
development_offset="/opt/st-village-dev/data/telegram-news-offset.json"
development_was_active=0

if [[ "${EUID}" -ne 0 ]]; then
  printf 'This installer must run as root.\n' >&2
  exit 1
fi

[[ -d "$release_root" && ! -L "${release_root}/ops/vps/st-village-news-bot.service" ]] || {
  printf 'The current production release is unavailable.\n' >&2
  exit 1
}
[[ -f "$environment_file" && ! -L "$environment_file" ]] || {
  printf 'The production environment file is unavailable.\n' >&2
  exit 1
}

if [[ -f "$development_environment_file" && ! -L "$development_environment_file" ]]; then
  cp -a "$environment_file" "${environment_file}.backup-$(date +%Y%m%d-%H%M%S)"
  /usr/local/bin/node --input-type=module - "$development_environment_file" "$environment_file" <<'NODE'
import { readFile, writeFile } from "node:fs/promises";

const [developmentPath, productionPath] = process.argv.slice(2);
const development = await readFile(developmentPath, "utf8");
let production = await readFile(productionPath, "utf8");
function valueOf(source, name) {
  return source.match(new RegExp(`^${name}=(.*)$`, "m"))?.[1]?.trim() ?? "";
}
for (const name of ["TELEGRAM_NEWS_BOT_TOKEN", "TELEGRAM_NEWS_CHANNEL", "SITE_BOT_API_TOKEN", "SITE_BOT_ADMIN_IDS", "SITE_NEWS_ACTOR_ID"]) {
  if (valueOf(production, name)) continue;
  const value = valueOf(development, name);
  if (!value) continue;
  const line = `${name}=${value}`;
  const expression = new RegExp(`^${name}=.*$`, "m");
  production = expression.test(production) ? production.replace(expression, line) : `${production.trimEnd()}\n${line}\n`;
}
const disabled = "STATUS_TELEGRAM_NOTIFICATIONS_DISABLED=1";
production = /^STATUS_TELEGRAM_NOTIFICATIONS_DISABLED=.*$/m.test(production)
  ? production.replace(/^STATUS_TELEGRAM_NOTIFICATIONS_DISABLED=.*$/m, disabled)
  : `${production.trimEnd()}\n${disabled}\n`;
await writeFile(productionPath, production, { mode: 0o640 });
NODE
  chown root:stvillage-web "$environment_file"
  chmod 640 "$environment_file"
fi

required=(TELEGRAM_NEWS_BOT_TOKEN SITE_BOT_API_TOKEN SITE_BOT_ADMIN_IDS)
set -a
source "$environment_file"
set +a
for name in "${required[@]}"; do
  [[ -n "${!name:-}" ]] || {
    printf 'Missing required setting: %s\n' "$name" >&2
    exit 1
  }
done

if systemctl is-active --quiet st-village-dev-news-bot.service; then
  development_was_active=1
  systemctl stop st-village-dev-news-bot.service
fi

rollback() {
  systemctl stop st-village-news-bot.service >/dev/null 2>&1 || true
  systemctl start st-village-site.service >/dev/null 2>&1 || true
  if [[ "$development_was_active" -eq 1 ]]; then
    systemctl start st-village-dev-news-bot.service >/dev/null 2>&1 || true
  fi
}
trap rollback ERR

systemctl stop st-village-site.service
install -d -o stvillage-web -g stvillage-web -m 750 /opt/st-village-site/data

if [[ -s "$development_data" ]]; then
  if [[ -s "$production_data" ]]; then
    cp -a "$production_data" "${production_data}.backup-$(date +%Y%m%d-%H%M%S)"
  fi
  /usr/local/bin/node --input-type=module - "$development_data" "$production_data" <<'NODE'
import { readFile, rename, writeFile } from "node:fs/promises";

const [developmentPath, productionPath] = process.argv.slice(2);
async function readState(path) {
  try { return JSON.parse(await readFile(path, "utf8")); } catch { return {}; }
}
const development = await readState(developmentPath);
const production = await readState(productionPath);
const news = new Map((production.telegramNews ?? []).map((post) => [String(post.id), post]));
for (const post of development.telegramNews ?? []) news.set(String(post.id), post);
production.telegramNews = [...news.values()]
  .sort((left, right) => Number(right.id) - Number(left.id))
  .slice(0, 1000);
const temporary = `${productionPath}.${process.pid}.tmp`;
await writeFile(temporary, JSON.stringify(production), { mode: 0o600 });
await rename(temporary, productionPath);
NODE
  chown stvillage-web:stvillage-web "$production_data"
  chmod 600 "$production_data"
fi

if [[ -s "$development_offset" ]]; then
  install -o stvillage-web -g stvillage-web -m 600 "$development_offset" "$production_offset"
fi

install -o root -g root -m 644 "${release_root}/ops/vps/st-village-news-bot.service" /etc/systemd/system/st-village-news-bot.service
install -o root -g root -m 700 "${release_root}/ops/vps/deploy.sh" /usr/local/sbin/st-village-deploy
systemctl daemon-reload
systemctl start st-village-site.service

healthy=0
for _ in {1..30}; do
  if curl --fail --silent --show-error --max-time 3 http://127.0.0.1:3000/api/health >/dev/null; then
    healthy=1
    break
  fi
  sleep 1
done
[[ "$healthy" -eq 1 ]]

systemctl enable --now st-village-news-bot.service
systemctl is-active --quiet st-village-news-bot.service
systemctl disable st-village-dev-news-bot.service >/dev/null 2>&1 || true
trap - ERR
printf 'ST VILLAGE production news synchronization is active.\n'
