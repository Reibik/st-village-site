#!/usr/bin/env bash
set -Eeuo pipefail

base_url="${1:-https://stvillage.ru}"
expected_release="${2:-0.9.5}"

check_url() {
  local path="$1"
  curl --fail --silent --show-error --location --max-time 15 "${base_url}${path}" >/dev/null
}

for path in / /pricing /connect /status /news /support /robots.txt /sitemap.xml /manifest.webmanifest /api/health; do
  check_url "$path"
done

version_payload="$(curl --fail --silent --show-error --max-time 15 "${base_url}/api/version")"
grep -Fq "\"release\":\"${expected_release}\"" <<<"$version_payload"

home_html="$(curl --fail --silent --show-error --max-time 15 "${base_url}/")"
grep -Fq 'https://stvillage.ru/og-social-v2.png' <<<"$home_html"
grep -Fq 'application/ld+json' <<<"$home_html"

headers="$(curl --fail --silent --show-error --head --max-time 15 "${base_url}/")"
grep -Eiq '^strict-transport-security:' <<<"$headers"
grep -Eiq '^content-security-policy:' <<<"$headers"
grep -Eiq '^x-content-type-options:[[:space:]]*nosniff' <<<"$headers"

printf 'ST VILLAGE v%s verification passed for %s\n' "$expected_release" "$base_url"
