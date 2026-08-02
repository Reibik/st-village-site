#!/usr/bin/env bash
set -Eeuo pipefail

base_url="${1:-https://dev.stvillage.ru}"
: "${ST_VILLAGE_DEV_AUTH_USER:?Set ST_VILLAGE_DEV_AUTH_USER}"
: "${ST_VILLAGE_DEV_AUTH_PASSWORD:?Set ST_VILLAGE_DEV_AUTH_PASSWORD}"

unauthorized_status="$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 15 "${base_url}/")"
[[ "$unauthorized_status" == "401" ]]

curl_auth=(--user "${ST_VILLAGE_DEV_AUTH_USER}:${ST_VILLAGE_DEV_AUTH_PASSWORD}")

for path in / /pricing /connect /status /news /reviews /support /release /robots.txt /api/health /api/observability; do
  curl --fail --silent --show-error --location --max-time 15 "${curl_auth[@]}" "${base_url}${path}" >/dev/null
done

headers="$(curl --fail --silent --show-error --head --max-time 15 "${curl_auth[@]}" "${base_url}/")"
grep -Eiq '^x-robots-tag:.*noindex' <<<"$headers"
grep -Eiq '^x-st-village-environment:[[:space:]]*development' <<<"$headers"
grep -Eiq '^cache-control:[[:space:]]*no-store' <<<"$headers"

robots="$(curl --fail --silent --show-error --max-time 15 "${curl_auth[@]}" "${base_url}/robots.txt")"
grep -Fq 'Disallow: /' <<<"$robots"

printf 'Protected ST VILLAGE dev stand verification passed for %s\n' "$base_url"
