#!/usr/bin/env bash
set -Eeuo pipefail

app_root="/opt/st-village-site"
repository="${app_root}/repository"
releases="${app_root}/releases"
data_dir="${app_root}/data"
data_file="${data_dir}/observability.json"
branch="main"
lock_file="/run/lock/st-village-deploy.lock"

exec 9>"$lock_file"
flock -n 9 || exit 0

install -d -m 755 "$app_root" "$releases"
install -d -o stvillage-web -g stvillage-web -m 750 "$data_dir"

if [[ ! -d "${repository}/.git" ]]; then
  git clone --filter=blob:none --no-checkout https://github.com/Reibik/st-village-site.git "$repository"
fi

git -C "$repository" fetch --prune origin "$branch"
target_sha="$(git -C "$repository" rev-parse "origin/${branch}")"
active_sha="$(cat "${app_root}/current-sha" 2>/dev/null || true)"

if [[ "$target_sha" == "$active_sha" ]] && systemctl is-active --quiet st-village-site.service; then
  exit 0
fi

release="${releases}/${target_sha}"
previous=""
if [[ -L "${app_root}/current" || -d "${app_root}/current" ]]; then
  previous="$(readlink -f "${app_root}/current" 2>/dev/null || true)"
fi

if [[ ! -d "$release" ]]; then
  git -C "$repository" worktree add --detach "$release" "$target_sha"
fi

set -a
source /etc/st-village/site.env
set +a
export CI=true
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=512}"

cd "$release"
pnpm install --frozen-lockfile --prefer-offline --child-concurrency=2 --network-concurrency=8
pnpm build

# Preserve legacy data from PrivateTmp before the first durable-storage restart.
if [[ ! -s "$data_file" ]]; then
  service_pid="$(systemctl show -p MainPID --value st-village-site.service 2>/dev/null || true)"
  if [[ "$service_pid" =~ ^[1-9][0-9]*$ ]]; then
    for legacy_file in "/proc/${service_pid}/root/var/tmp"/st-village-observability-*.json; do
      if [[ -f "$legacy_file" && ! -L "$legacy_file" ]]; then
        install -o stvillage-web -g stvillage-web -m 600 "$legacy_file" "$data_file"
        break
      fi
    done
  fi
fi

ln -sfn "$release" "${app_root}/current.next"
mv -Tf "${app_root}/current.next" "${app_root}/current"
chown -h stvillage-web:stvillage-web "${app_root}/current"

if ! systemctl restart st-village-site.service; then
  if [[ -n "$previous" && -d "$previous" ]]; then
    ln -sfn "$previous" "${app_root}/current.next"
    mv -Tf "${app_root}/current.next" "${app_root}/current"
    systemctl restart st-village-site.service || true
  fi
  exit 1
fi

healthy=0
for _ in {1..30}; do
  if curl --fail --silent --show-error --max-time 3 http://127.0.0.1:3000/api/health >/dev/null; then
    healthy=1
    break
  fi
  sleep 1
done

if [[ "$healthy" -ne 1 ]]; then
  if [[ -n "$previous" && -d "$previous" ]]; then
    ln -sfn "$previous" "${app_root}/current.next"
    mv -Tf "${app_root}/current.next" "${app_root}/current"
    systemctl restart st-village-site.service || true
  fi
  exit 1
fi

printf '%s\n' "$target_sha" > "${app_root}/current-sha"
chmod 644 "${app_root}/current-sha"
git -C "$repository" worktree prune
