# CutSmart v0.2.0 - Windows Local Preview

Download **CutSmart-Windows-x64.zip** from Assets, extract the whole ZIP, and
double-click **CutSmart.exe**. Do not choose GitHub's Source code archive if you
want the ready-to-run application.

Python, Node.js and Docker are not required. The app starts its backend and opens
your default browser. Keep the CutSmart window open while using it; close it to
stop. Windows x64 only. This is a preview, not a hosted website.

Records and photos are stored in `%LOCALAPPDATA%\CutSmart`. They persist across
updates and restarts. No records are sent to the project authors. Existing source
checkout data is not imported automatically. Back up this directory privately
while the application is stopped.

Includes journeys, plan updates/history, weight, food/photos and exercise logs,
session authentication and login limits. Profile, activity history, reports and
settings remain incomplete. This executable is unsigned; Windows may show an
unknown-publisher warning. Verify the download and SHA-256 checksum.

See START_HERE.md inside the ZIP for help. Public website hosting remains separate.

## Verification

The packaged executable was tested over HTTP for startup, frontend assets,
registration/login, plan saving, decimal weight logging, photo upload/retrieval,
logout and data persistence after restart. Eleven backend tests, frontend lint
and production build passed. Dependency audit reported zero known vulnerabilities
at build time. This is not certification across all Windows versions.

SHA-256 for CutSmart-Windows-x64.zip:

```text
A551CEC91B11147F9727BAF4DD600A6D86A0912B3D54D44973BC48C236221790
```
