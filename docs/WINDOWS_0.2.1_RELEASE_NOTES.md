# CutSmart v0.2.1 Preview - Weight Track Icon Fix

## Changes

- Replaced five corrupted text symbols on Weight Track with Lucide vector icons.
- Dashboard, Average, Change, Lowest and Highest now display proper icons.
- No backend, database schema or account changes.

## Download and Update

Download `CutSmart-Windows-x64.zip` from this release, not GitHub's source archives.
Close the old app, extract the entire new ZIP to a separate folder, and run
`CutSmart/CutSmart.exe`. Keep the `_internal` folder alongside the executable.

Existing packaged-app accounts, logs and photos remain in
`%LOCALAPPDATA%\CutSmart`. Updating the extracted application does not remove
that data, and you do not need to register again. Development databases are
separate and are not automatically imported.

This is an unsigned Windows x64 local preview, not a hosted public website.
The executable starts the local backend and opens the interface in your browser.
Keep its console open while using the app.

## Verification

- Frontend lint and production build passed.
- Weight Track empty-state icons checked in Chrome at desktop and mobile sizes.
- Rebuilt executable passed startup, asset delivery, login, plan/weight/photo
  persistence and logout smoke tests, including restart persistence.

ZIP SHA256:
`51AA378C748006E1892CD69FA338099C0C266D3C6C128556BA2EE58395BE2886`
