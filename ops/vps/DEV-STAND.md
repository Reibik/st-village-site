# ST VILLAGE dev stand

The development stand is isolated from production:

- source branch: `dev`;
- public address: `https://dev.stvillage.ru`;
- application root: `/opt/st-village-dev`;
- loopback port: `3001`;
- application service: `st-village-dev-site.service`;
- deployment timer: `st-village-dev-deploy.timer`;
- runtime environment: `/etc/st-village/dev.env`;
- Caddy credentials: `/etc/caddy/st-village-dev.env`.
- Caddy systemd override: `caddy-st-village-dev.conf`.

The timer checks the public GitHub repository once per minute. A new `dev`
commit is built in a release directory and activated only after a successful
build. If the health check fails, the previous release is restored.

Every response is protected with Caddy Basic Auth, marked with
`X-Robots-Tag: noindex`, and returned with `Cache-Control: no-store`.
`robots.txt` additionally disallows every crawler. Credentials and environment
files live only on the VPS and must never be committed.
