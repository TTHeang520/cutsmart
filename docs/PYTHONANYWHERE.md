# Hosting CutSmart on PythonAnywhere (free plan)

One PythonAnywhere web app runs the Flask API and serves the built React site at
`https://<you>.pythonanywhere.com`. The SQLite database and food photos live in
`~/cutsmart-data`, outside the code, so updating the code never touches users' data.

Below, `<you>` means your PythonAnywhere username, which also becomes the website
address (e.g. username `cutsmart` gives `cutsmart.pythonanywhere.com`).

## Free plan limits to remember

Checked 2026-11-05 against PythonAnywhere's help pages. Recheck them, because they changed in January 2026.

| Limit | What it means for CutSmart |
| --- | --- |
| 512 MB disk | Code + libraries use about 100 MB. Photos are shrunk to about 100-300 KB on upload, so roughly 2,000 photos fit |
| 1 web app, 1 worker | Requests are handled one at a time. Fine for a small group of users |
| **Web app expires after 1 month** | Someone must log in and extend it every month (see "Every month") |
| No scheduled tasks or MySQL (accounts made after 2026-01-15) | Backups are manual (see "Backups") |
| 100 CPU-seconds/day | Only counts consoles, not website visits |

## One-time setup

### 1. On your computer: build the website files

From the repository root in PowerShell, on an up-to-date `main`:

```powershell
.\scripts\package-frontend.ps1
```

This creates `release\cutsmart-frontend.zip` (about 5 MB).

### 2. Upload the zip

PythonAnywhere → **Files** tab → you are in `/home/<you>/` → **Upload a file** →
choose `release\cutsmart-frontend.zip`.

### 3. Get the code and libraries (Bash console)

PythonAnywhere → **Consoles** tab → **Bash**. Paste these one at a time:

```bash
git clone https://github.com/TTHeang520/cutsmart.git ~/cutsmart
```

```bash
mkdir -p ~/cutsmart-data ~/cutsmart/frontend/dist
```

```bash
unzip -o ~/cutsmart-frontend.zip -d ~/cutsmart/frontend/dist && rm ~/cutsmart-frontend.zip
```

```bash
mkvirtualenv --python=python3.12 cutsmart-venv
```

If 3.12 is not available, use the newest `python3.1x` that `ls /usr/bin/python3*` shows (3.10 or newer).

```bash
pip install -r ~/cutsmart/backend/requirements.txt
```

### 4. Create the web app (Web tab)

1. **Web** tab → **Add a new web app** → Next.
2. Choose **Manual configuration** (not "Flask"), with the **same Python version** as the virtualenv.
3. On the web app page, fill in:
   - **Source code:** `/home/<you>/cutsmart`
   - **Working directory:** `/home/<you>/cutsmart`
   - **Virtualenv:** `/home/<you>/.virtualenvs/cutsmart-venv`
4. **WSGI configuration file:** click the link (`/var/www/<you>_pythonanywhere_com_wsgi.py`),
   **delete everything** in it, and paste exactly this (with your username):

   ```python
   import sys
   sys.path.insert(0, "/home/<you>/cutsmart/backend")
   from pythonanywhere_wsgi import application
   ```

   Save. The settings (production mode, data folder, proxy) live in
   `backend/pythonanywhere_wsgi.py` in the repository.
5. **Static files** (recommended; it lets PythonAnywhere serve images and scripts directly
   without using the single worker): add
   - URL `/assets/`, Directory `/home/<you>/cutsmart/frontend/dist/assets`
6. **Security** section: turn **Force HTTPS** on. The login cookie only works over HTTPS.
7. Press the big green **Reload** button at the top.

### 5. Check it works

1. Open `https://<you>.pythonanywhere.com/api/test`. It should show `{"message": "Backend is working"}`.
2. Open `https://<you>.pythonanywhere.com`. The login page should appear.
3. Register two accounts (one in a private window) and walk through: plan, food with a
   photo, exercise, weight, calendar, new journey, logout. Account B must never see A's data.
4. Press **Reload** on the Web tab, refresh the site and confirm everything is still there.
5. **Rate limit check:** enter a wrong password 11 times on your laptop (the 11th is blocked).
   Then, on a phone using **mobile data** (not the same Wi-Fi), log in normally. It must work.
   If the phone is also blocked, tell Wei Jien: the proxy setting needs adjusting.

If something fails, check **Web tab → Log files → Error log** (newest lines at the bottom).
A "Something went wrong" page or 502 error usually means a typo in the WSGI file or a
missing library.

## Updating the site after a merge to main

Bash console:

```bash
cd ~/cutsmart && git pull
```

```bash
workon cutsmart-venv && pip install -r backend/requirements.txt
```

Only if the **frontend** changed: run `.\scripts\package-frontend.ps1` on your computer,
upload the zip again, then:

```bash
rm -rf ~/cutsmart/frontend/dist && mkdir -p ~/cutsmart/frontend/dist && unzip -o ~/cutsmart-frontend.zip -d ~/cutsmart/frontend/dist && rm ~/cutsmart-frontend.zip
```

Finally press **Reload** on the Web tab. User data in `~/cutsmart-data` is not affected.

## Every month (free plan)

The free web app stops after one month unless extended. Log in → **Web** tab → press the
button that extends the expiry (e.g. "Run until 1 month from today"). Set a monthly
calendar reminder. If it does stop, nothing is deleted: press the button to start it again.

## Backups

New free accounts have no scheduled tasks, so back up by hand, e.g. weekly and before
every update. In a Bash console:

```bash
python3 -c "import sqlite3, os, datetime; src = sqlite3.connect(os.path.expanduser('~/cutsmart-data/cutsmart_database')); dst = sqlite3.connect(os.path.expanduser(f'~/backup-{datetime.date.today()}.db')); src.backup(dst); dst.close()"
```

```bash
cd ~ && zip -qr photos-backup.zip cutsmart-data/uploads
```

Download both files from the **Files** tab, keep them somewhere private (they contain users'
personal data; never put them on GitHub), then delete them on PythonAnywhere to save space:

```bash
rm ~/backup-*.db ~/photos-backup.zip
```

To restore: stop the site (Web tab → Disable), upload the backup, copy it over
`~/cutsmart-data/cutsmart_database`, unzip the photos into `~/cutsmart-data/`, then enable
and reload.

## Sources

- Free account features: https://help.pythonanywhere.com/pages/FreeAccountsFeatures/
- January 2026 free-plan changes: https://blog.pythonanywhere.com/221/
- CPU seconds (web apps not counted): https://help.pythonanywhere.com/pages/WhatAreCPUSeconds
- Flask on PythonAnywhere: https://help.pythonanywhere.com/pages/Flask/
