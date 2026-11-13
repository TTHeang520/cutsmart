# Release Checklist

Use this checklist for every public CutSmart update. The live database and food
photos are stored outside the Git repository and must be backed up separately.

## 1. Prepare and review

- [ ] Confirm the pull request targets `main` and contains only intended files.
- [ ] Confirm GitHub Actions passes.
- [ ] Review mobile and desktop layouts with no horizontal scrolling.
- [ ] Confirm no database, upload, backup, `.env` or credential was committed.
- [ ] Update `docs/RELEASE_NOTES.md` and remove resolved known limitations.

## 2. Verify locally

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend -p "test_*.py" -v
cd frontend
npm.cmd ci
npm.cmd run lint
npm.cmd run build
```

Smoke-test registration, login, plan creation, food, exercise, weight, calendar,
journey history and logout. Repeat the main logging flow at phone width.

## 3. Protect live data

- [ ] Follow the backup commands in `docs/PYTHONANYWHERE.md`.
- [ ] Download the database and photo backup to private storage.
- [ ] Confirm the backup files are not inside the Git repository.

## 4. Deploy after merge

1. Merge the reviewed pull request into `main`.
2. In the PythonAnywhere Bash console, run `cd ~/cutsmart && git pull`.
3. Install requirements in `cutsmart-venv` if backend dependencies changed.
4. If frontend files changed, build and upload the frontend zip using the exact
   commands in `docs/PYTHONANYWHERE.md`.
5. Reload the web app from the PythonAnywhere Web tab.

## 5. Verify production

- [ ] Open `/api/test` and confirm the backend health response.
- [ ] Open the website in a private window and on a phone.
- [ ] Verify login, one read flow and one create/edit/delete flow.
- [ ] Confirm existing data and private food photos still work after reload.
- [ ] Check the newest PythonAnywhere error-log lines.

## 6. Publish the release

- [ ] Create a version tag only after production verification.
- [ ] Create GitHub release notes from `docs/RELEASE_NOTES.md`.
- [ ] Close resolved issues and record any remaining limitation.
- [ ] Confirm the monthly PythonAnywhere renewal reminder is active.
