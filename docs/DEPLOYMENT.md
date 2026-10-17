# Deployment Preparation

One Waitress process serves the built React site and Flask API under one origin.
There is no hosted service configured yet. SQLite and private uploads require a
single instance with persistent writable disk; multiple independent disks would
create separate databases. PostgreSQL/object storage can be added later.

## Local Preview

From the repository root:

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
cd frontend
npm.cmd ci
npm.cmd run build
cd ..
.\.venv\Scripts\python.exe backend/serve.py
```

Open http://127.0.0.1:8080. No Vite process is needed. Set PORT to a different
port if occupied. Missing frontend/dist/index.html prevents startup.

## Production Settings

| Variable | Purpose |
| --- | --- |
| CUTSMART_ENV | production enables HTTPS-only session cookies |
| CUTSMART_DATA_DIR | Required in production; persistent writable absolute directory |
| HOST | Defaults to 127.0.0.1; hosted services may require 0.0.0.0 |
| PORT | Defaults to 8080; use the host's assigned port |
| CUTSMART_TRUSTED_PROXY | Optional exact proxy address; wildcard is rejected |

.env.example is documentation; Python does not load it automatically. Set variables
in the hosting environment or shell. The data directory contains cutsmart_database
and uploads/food_photos. A path alone does not make storage durable: mount a persistent
disk there. Existing local data is not automatically moved. An empty directory
creates an empty database. Stop writes before copying a private backup of both the
database and uploads; test restore before launch.

The hosting proxy must provide HTTPS; Waitress itself speaks HTTP. Local HTTP preview
requires CUTSMART_ENV unset. Debug mode cannot be enabled in production.

Only trust a known proxy which overwrites X-Forwarded-For and X-Forwarded-Proto,
and block direct backend access when doing so. One proxy hop is supported by the
provided runner. Without this configuration, users may share the proxy's IP bucket.
Untrusted forwarded headers are ignored by default.

## Rate Limits

Login allows 10 requests per client IP per 15-minute window; registration allows 5.
Successful, failed and malformed requests count. HTTP 429 includes JSON and Retry-After
seconds. Counters are transactionally stored in SQLite and survive server restarts.
Shared networks share limits. Distributed attacks need additional edge controls.

## Before Sharing a Public Link

1. Choose hosting and budget, provision persistent disk and HTTPS.
2. Verify proxy configuration and correct client-IP separation.
3. Test real browser login, journeys, logs, photos, logout and expiry with two accounts.
4. Verify persistence through restart/redeployment and restore a backup to staging.
5. Review client-supplied plan-result validation and incomplete UI screens.

These files do not constitute a public deployment or a completed security review.

References: [Flask Waitress deployment](https://flask.palletsprojects.com/en/stable/deploying/waitress/)
and [Waitress proxy configuration](https://docs.pylonsproject.org/projects/waitress/en/stable/reverse-proxy.html).
