# CutSmart for Windows - Local Preview

Download CutSmart-Windows-x64.zip from GitHub release Assets. Extract All, then
double-click CutSmart.exe. Keep the entire folder, including _internal. The browser
opens automatically. Keep the CutSmart window open; close it to stop the app.
No Python, Node.js, Docker or separate backend setup is needed.

Windows x64 only. The executable is unsigned and Windows may show an unknown
publisher warning. Verify the source and checksum; do not disable antivirus.

## Data and Updates

Your records and uploaded photos are in %LOCALAPPDATA%\CutSmart, separate from
the app folder. They remain across restarts and updates. Nothing is synced to
other computers or uploaded to the developers. A first launch creates an empty
database; records from a development checkout are not imported automatically.

To back up or restore, stop CutSmart and copy the whole data directory privately.
It contains personal information and is not encrypted. Do not upload it to GitHub.
Deleting the application folder does not delete your data.

## Troubleshooting

- Browser did not open: use the local URL printed in the CutSmart window.
- The port is chosen automatically and can change on restart.
- Missing files: extract the complete ZIP, not only the EXE.
- Login limited: wait 15 minutes rather than repeatedly retrying.
- The address only works on this computer; this is not the hosted website.
- Profile, activity history, reports and settings remain preview placeholders.

## Maintainer Build

Use Windows x64, Python 3.12 with backend/requirements.txt and PyInstaller 6.22.0,
and Node.js 22.12 or newer. Run scripts/build-windows.ps1. Test the executable
before publishing. Never package a development database or user uploads.
