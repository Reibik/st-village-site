#!/usr/bin/env bash
set -Eeuo pipefail

app_root="/opt/st-village-site"
repository="${app_root}/repository"
releases="${app_root}/releases"
branch="main"
lock_file="/run/lock/st-village-deploy.lock"

exec 9>"$lock_file"
flock -n 9 || exit 0

install -d -m 755 "$app_root" "$releases"

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
previous="$(readlink -f "${app_root}/current" 2>/dev/null || true)"

if [[ ! -d "$release" ]]; then
  git -C "$repository" worktree add --detach "$release" "$target_sha"
fi

set -a
source /etc/st-village/site.env
set +a

cd "$release"
pnpm install --frozen-lockfile --prefer-offline
pnpm build

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
