# CutSmart Project Handoff

This document is the working context for a new developer or a new Codex account.
Last reconciled with source: 2026-10-18, application commit `0b354c9`.
Current checkout: `C:\CUTSMART\cutsmart`. GitHub main was verified at that commit.
The public website has NOT been deployed. The GitHub preview release is a source
download, not a running website or an installer. See sections 9 and 11 for launch work.
It describes what CutSmart is, what is implemented now, how the code is organised,
how to run it locally, and what remains before a public launch.

## 1. Project in One Paragraph

Windows packaging update: backend/desktop.py is a local-only launcher using an
available loopback port, browser auto-open, and %LOCALAPPDATA%/CutSmart for data.
scripts/build-windows.ps1 creates a PyInstaller one-folder ZIP with the React build.
scripts/test-package.py verifies the EXE using temporary records across restart.
The Windows-package workflow can reproduce it manually. See docs/LOCAL_APP.md.
This downloadable application is separate from the still-unprovisioned website.

Hosting-package update: Dockerfile and .dockerignore now package the compiled
frontend with the backend, excluding local data and credentials. See
docs/HOSTING_SETUP.md. No container build has been run locally (Docker absent),
and no hosting service has been created. Account connection and budget are pending.

Deployment-preparation update (2026-10-18): backend/config.py selects a persistent
data directory via CUTSMART_DATA_DIR (required in production). backend/serve.py
uses Waitress to serve compiled React and the API at one origin. Database-backed
IP limits allow 10 login and 5 registration requests per 15 minutes. Hosting is
still unprovisioned; docs/DEPLOYMENT.md is the current deployment guide. Earlier
roadmap references to implementing these controls are completed by this update.

CutSmart is a weight-management web application. A user registers, enters body
statistics and a target, receives a calorie-deficit plan, and records weight,
food, and exercise. The app groups those records into **journeys** so a user can
update a plan without losing their current history, or deliberately start a new
journey while keeping their old journey available as history.

The current implementation is a working local prototype:

- Frontend: React + Vite
- Backend: Python + Flask
- Local database: SQLite
- Local food-photo storage: `backend/uploads/food_photos/`

It is a web app, not a native mobile app. It can be used in a browser while both
the frontend and backend servers are running on the same computer.

## 2. Repository Layout

```text
cutsmart/
|- backend/
|  |- app.py                 Flask routes, validation, photo handling
|  |- database.py            SQLite schema, migrations, database helpers
|  |- planner.py             Calorie-deficit calculation logic
|  |- auth.py                Authentication-related helper code
|  |- requirements.txt       Python dependencies
|  |- cutsmart_database      Local SQLite database file, ignored by Git
|  `- uploads/food_photos/   Locally uploaded food photos, ignored by Git
|- frontend/
|  |- src/App.jsx            React routes
|  |- src/pages/             Screens and API calls
|  |- src/components/        Reusable UI components
|  |- src/data/              Exercise options and plan/journey themes
|  `- package.json           Node dependencies and scripts
|- docs/API_Contract.md      Frontend/backend API documentation
|- README.md                 Original high-level project overview
`- PROJECT_HANDOFF.md        This document
```

`frontend_backup/` is an older backup/reference copy. Treat `frontend/` as the
active application unless the team explicitly decides otherwise.

## 3. Current User Flow

```text
Register / login
    -> create or load a calorie plan
    -> save the plan into a journey
    -> log food, exercise, and weight under the active journey
    -> view dashboard, calendar, history, and journey summaries
```

### Journey model

There are two different actions, and they must remain different:

| User action | What backend does | What happens to logs |
| --- | --- | --- |
| Update existing plan | Saves another plan row under the current active journey | Weight, food, exercise, and calendar history stay in the same journey |
| Create new plan / restart | Archives the old active journey and creates a new journey with a new ID and first plan | New journey starts with a new initial-weight entry; old journey logs remain preserved as history |

This is why logs contain `journey_id`: a food, exercise, or weight entry belongs
to one particular attempt/journey, rather than being mixed with all of the
user's lifetime activity.

## 4. What Is Implemented

### Authentication

- Register user with username, email, and hashed password.
- Login validates email and password, then the frontend stores the returned user
  object in browser `localStorage`.
- Login also creates an opaque eight-hour server-side session. Only a SHA-256
  hash of its random token is stored in `auth_sessions`; the browser receives
  the token in the HttpOnly `cutsmart_session` cookie with SameSite=Lax.
- Every private API request checks that session and rejects mismatched user IDs.
- Authenticated writes require a session-specific CSRF token. All writes,
  including login/register, require `X-CutSmart-Request: 1`.
- Logout revokes the session in the database. Replaying its old cookie fails.
- Production requires `CUTSMART_ENV=production` for Secure cookies and HTTPS.
- Rate limiting, password recovery and comprehensive security review remain.

### Personalised plan calculation

- Inputs include age, gender, height, current and target weight, daily activity
  level, preferred strategy, and optional desired timeline.
- `backend/planner.py` calculates BMI, BMR, maintenance calories, calorie target,
  deficit split, macronutrients, expected weekly loss, timeline and warning.
- Strategies supported: `diet`, `exercise`, and `balanced`.

### Plans and journeys

- Save a plan to the active journey or start a new journey by passing the plan
  save mode expected by the API contract.
- Each plan row stores its full calculated result, so historical plans remain
  inspectable even after a later update.
- Journey history and plans for one selected journey are available to the frontend.
- Old journeys are archived instead of deleted when a new journey begins.

### Weight logging

- Create weight entries with a date.
- One initial weight record per journey is protected with `is_initial`.
- One ordinary weight entry per date is allowed for the same journey.
- Current/latest weight and history endpoints exist.
- Weight input accepts two decimal places (`step="0.01"` in the frontend).

### Food logging and photos

- Create, update, delete, and view food entries by date/history.
- Entries support name, calories, meal type, macros, notes, date and time.
- Each food record may have one optional image.
- The database stores a relative text path such as `food_photos/<uuid>.jpg`, not
  the actual image file.
- Flask saves image files locally in `backend/uploads/food_photos/`.
- Uploads allow JPG/JPEG, PNG and WebP only, verify image content using Pillow,
  reject files larger than 5 MB, and delete the previous physical image when a
  replacement is uploaded.

### Exercise logging

- Create, update, delete, and view exercise entries by date/history.
- Fields include exercise name, category, duration, calories burned, notes, date
  and time.
- `category` is fully connected: React form -> JSON request -> Flask validation
  -> SQLite `exercise_logs.category` -> returned history data.
- Existing local databases are migrated with `ALTER TABLE` if the category column
  is absent.

### Calendar and history

- Calendar requests food, exercise and weight records for the selected date from
  the Flask backend rather than treating browser storage as the source of truth.
- Journey History lists journeys.
- Journey Overview accesses one specific journey's plans, weights, foods and
  exercises, including archived journeys.

## 5. Database Design

SQLite file location:

```text
backend/cutsmart_database
```

This file is ignored by Git. Each developer currently has their own local copy.

Main tables:

| Table | Purpose |
| --- | --- |
| `users` | Username, unique email and password hash |
| `plan_journeys` | One weight-management journey: user, initial/target weights, status, start/end timestamps |
| `user_plans` | Full generated-plan snapshots, linked to user and journey |
| `weight_logs` | Weight records linked to user and journey; includes `is_initial` |
| `food_logs` | Food records linked to user and journey; includes `photo_path` |
| `exercise_logs` | Exercise records linked to user and journey; includes `category` |
| `auth_sessions` | Hashed session tokens, user ID, CSRF token and expiry; created by auth.py |

`database.py:init_db()` both creates new tables and runs small migrations for
older local databases. This matters: do not remove those migration blocks just
because a fresh database works. They preserve existing development data after a
schema change.

## 6. Important API Routes

The authoritative request/response shapes are in [docs/API_Contract.md](docs/API_Contract.md).

High-level route groups:

| Area | Routes |
| --- | --- |
| Auth | `POST /api/register`, `POST /api/login`, `GET /api/session`, `POST /api/logout` |
| Plan calculation | `POST /api/plan` |
| Saved plans | `POST /api/plans/save`, `GET /api/plans/latest/<user_id>` |
| Journeys | `GET /api/journeys/history/<user_id>`, `GET /api/users/<user_id>/journeys/<journey_id>/plans` |
| Weight | `POST /api/weights`, `GET /api/weights/history/<user_id>`, `GET /api/weights/latest/<user_id>`, `GET /api/weights/<user_id>?date=YYYY-MM-DD` |
| Food | `POST /api/foods`, `GET /api/foods/<user_id>?date=YYYY-MM-DD`, `PUT/DELETE /api/foods/<food_id>` |
| Food photos | `POST/DELETE /api/foods/<food_id>/photo`, `GET /api/uploads/<path:photo_path>` |
| Exercise | `POST /api/exercises`, `GET /api/exercises/<user_id>?date=YYYY-MM-DD`, `PUT/DELETE /api/exercises/<exercise_id>` |
| Archived journey data | `GET /api/users/<user_id>/journeys/<journey_id>/weights`, `/foods`, `/exercises` |

Ownership pattern: write/update/delete requests include `user_id`; database
queries also filter by `journey_id` for logs. This prevents a user action from
changing a record outside the supplied user/journey combination. The auth.py
request hook first verifies the session and rejects supplied IDs belonging to
another user. Photo serving checks the file path against that user's food rows.

## 7. Running Locally

Open two terminals.

### Backend terminal

```powershell
cd C:\CUTSMART\cutsmart
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
.\.venv\Scripts\python.exe backend/app.py
```

The Flask backend runs at `http://127.0.0.1:5000` and creates the database and
upload folder automatically when it starts.

### Frontend terminal

```powershell
cd C:\CUTSMART\cutsmart\frontend
npm.cmd ci
npm.cmd run dev
```

Use `npm.cmd` in PowerShell if `npm run dev` is blocked by the machine's script
execution policy. Vite normally prints a URL such as `http://localhost:5173`.

### Local checks used recently

```powershell
cd C:\CUTSMART\cutsmart
.\.venv\Scripts\python.exe -m unittest discover -s backend -p "test_*.py" -v

cd frontend
npm.cmd run lint
npm.cmd run build
```

Six backend tests, frontend lint and build passed for the authentication changes
in `0b354c9`. These are limited automated checks, not full end-to-end certification.

## 8. What Local Storage Means Here

There are two different kinds of local data:

| Storage | Current use | Shared between users/computers? |
| --- | --- | --- |
| Browser `localStorage` | Logged-in user object and some cached/fallback plan UI data | No. It belongs to one browser profile on one computer. |
| SQLite database file | Actual backend user, journey, plan, food, exercise and weight records | No. It belongs to the computer running Flask. |

The main logs now save to SQLite through Flask. `localStorage` still exists for
display identity and fallback/cache behaviour. It grants no backend permissions;
the cookie and server session determine access. Old cached data should be reviewed
for stale-account display and cleared appropriately before public release.

## 9. Current Limitations / Not Yet Production Ready

The local app works, but it is not yet a shared public app. Important remaining
work:

1. **Shared database:** provision persistent server-side storage. Hosted PostgreSQL
   is an option; SQLite can also serve multiple users through a hosted backend
   with suitable persistent disk and concurrency limits. Current independent
   developer database files are not shared automatically.
2. **Photo persistence:** choose durable disk or private object storage. Ephemeral
   hosting filesystems lose uploads. Preserve authorization if storage changes;
   a permanently public photo URL would bypass the new ownership checks.
3. **Deployment configuration:** frontend requests now use same-origin /api via
   utils/api.js. Vite proxies it locally. Production needs an equivalent reverse
   proxy plus SPA route fallback; a static frontend upload alone is insufficient.
4. **Authentication hardening:** sessions and CSRF are implemented. Add login and
   registration abuse controls and verify proxy/cookie behavior over HTTPS.
5. **Environment variables:** configure CUTSMART_ENV=production and storage/host
   credentials securely. Current sessions are opaque database tokens, not signed
   Flask session cookies; do not invent a required signing secret for this design.
6. **Frontend placeholders:** `/profile` and `/activity-history` are explicitly
   "Coming Soon" screens. Reports and settings are also placeholder screens.
7. **Automated tests:** test_smoke.py covers the journey/weight flow and test_auth.py
   covers authentication boundaries. Broader API and browser coverage remains.
8. **Deployment security:** debug now defaults off (FLASK_DEBUG=1 enables it locally);
   Flask development server
   must be replaced by a production WSGI server such as Gunicorn on the hosting
   platform.

## 10. Recommended Public-Launch Stack

These providers were discussed as options, not selected, provisioned or price-checked.
Verify current service terms before choosing. Hosting accounts/budget remain undecided.

| Layer | Suggested service | Why |
| --- | --- | --- |
| React frontend | Vercel or Netlify | Easy Vite deployment |
| Flask backend | Render or Railway | Simple Python web-service deployment |
| Shared database | Render PostgreSQL, Neon, or Supabase PostgreSQL | Accessible to all users, not tied to one computer |
| Photos | Cloudinary or Supabase Storage | Persistent shared image files |

The public request flow becomes:

```text
User browser
  -> hosted React site
  -> hosted Flask API
  -> hosted PostgreSQL database
  -> cloud photo storage
```

No calorie/food dataset is required for this deployment. A dataset would be a
separate feature for food search, suggested calories, default exercises or photo
recognition. The current app already works with user-entered food and exercise
data.

## 11. Suggested Implementation Order After This Handoff

1. Add abuse controls for login/register, then review API validation and stored
   plan integrity: save_plan currently accepts plan_result supplied by the client.
2. Choose hosting and persistence based on budget. Keep one frontend/API origin.
3. Configure database/upload locations, backups, production server and HTTPS.
   If using PostgreSQL, migrate SQL, constraints and initialization explicitly;
   changing only the connection string will not work for current sqlite3 code.
4. Preserve private-photo access with durable disk or authenticated object storage.
5. Add regression coverage for food/exercise edits/deletes, photo lifecycle,
   malformed requests, cross-account resource IDs and old database migrations.
6. Test real browser login, expiry, logout, photos and cached state with two accounts.
7. Deploy a staging instance, verify persistence through restart/redeployment and
   a backup restore, then publish its validated production URL.
8. Only after that describe the app as publicly launched. Keep the GitHub preview
   release distinct from the deployed version.

## 12. Git Notes

- Remote branch used: `main`.
- Recent commits include journey support, food-photo support, backend calendar
  connections, exercise category support, and React hook dependency fixes.
- Before editing shared files, run `git pull --rebase` only when the working tree
  is clean or your work has been committed/stashed. Rebase does not delete work,
  but conflicts must be resolved when both people changed overlapping lines.
- Do not commit `backend/cutsmart_database` or `backend/uploads/`; both are
  intentionally ignored and contain local/private data.

## 13. Guidance for the Next Codex

Please read this file first, then inspect:

1. `docs/API_Contract.md` for exact API requests and responses.
2. `backend/app.py` for route-level validation and coordination.
3. `backend/database.py` for schema and migration behaviour.
4. `backend/planner.py` for the calorie calculation rules.
5. `frontend/src/App.jsx` and the relevant `frontend/src/pages/` file for a UI
   feature.

When changing database schema, update all four layers together:

```text
database table/migration
-> database helper function
-> Flask route validation/response
-> API_Contract.md and React request/display
```

For the journey rules, preserve this invariant:

```text
Updating a plan keeps the same journey and its logs.
Starting a new journey archives the old one and begins fresh logs under a new journey ID.
Historical journeys and their logs must remain readable.
```

## 14. Product Ideas and Decisions

The original motivation was to explain calorie deficit and balance diet with
exercise instead of offering only fixed workouts. Users enter their own food
and activity data; a food dataset or image-recognition model is not required for
the implemented workflow.

The team's central decision was to separate plan revisions from new attempts:

1. A user starts at 70 kg. Saving their first plan creates journey A, a plan row,
   and a special initial-weight row at 70 kg.
2. They later record 67 kg. This is an ordinary weight entry. The baseline stays 70.
3. They update their plan using 67 kg. A new plan snapshot belongs to journey A;
   the baseline and existing logs are not reset or rewritten by plan saving.
4. They explicitly choose a new journey. Journey A is archived and journey B gets
   a new first plan and baseline. Old data remains available through history APIs.

A journey is a grouping record, not the complete calculated plan. Several
user_plans rows can reference the same journey. Calendar history is derived from
dated logs; there is no calendar table. Do not implement restart by deleting
all of a user's food, exercise and weight records.

Earlier discussion considered changing the baseline when a start-date weight
was edited. The later teammate change introduced is_initial to distinguish the
baseline from ordinary daily measurements. Do not restore the earlier date-only
baseline update behavior. Review database.py before modifying this relationship.

The user also proposed periodic plan reminders, detecting unusually fast/slow
progress, and deleting unwanted historical plans. These are ideas, not completed
features. Automatic plan regeneration and history deletion must be designed
explicitly; do not infer them from existing new/update save modes.

Profile and activity history were explicitly deferred. Other original ideas such
as social challenges, family/friend monitoring and trainer guidance remain ideas.
The current priority is a working public website, not a JAR or desktop installer.

## 15. Development History

This is a milestone summary from code, Git history and project discussion, not
a verbatim transcript of every past conversation.

| Milestone | Outcome / reference |
| --- | --- |
| Foundation | Flask calculator, registration/login, SQLite users and saved plans |
| Daily logging | Weight, food and exercise create/read/update flows and API documentation |
| Journeys | Links between logs/plans and journeys, legacy migrations, archived history APIs |
| Save modes | Explicit new versus update behavior via plans/save; `0952428` |
| Journey UI | History and overview pages; `e16c227` |
| Baseline correction | Separate initial-weight tracking; `d6ce5cf` |
| Food photos | Upload/retrieve/delete/replace, UUID filenames, Pillow validation and size limits |
| Merge reconciliation | Teammate backend changes retained with photo work; `d2d8caa` |
| Backend integration | Food/exercise/calendar persistence, exercise category, decimal weight input; `a8a3d8a` |
| Frontend cleanup | Hook dependency fixes; `8c4a8bd` |
| Local preview | Setup guide, handoff, smoke test and GitHub CI; `ec31a2a` |
| Authentication | Revocable sessions, CSRF, ownership checks, private photos and same-origin API calls; `0b354c9` |

GitHub repository: https://github.com/TTHeang520/cutsmart

Preview release: https://github.com/TTHeang520/cutsmart/releases/tag/v0.1.0-preview

The preview tag points to the earlier local-preview commit. Later commits on main
include authentication. Downloading that older release does not include the new
authentication work. Release notes describe their tagged snapshot, not latest main.

## 16. Verification Ledger

Last application checks reported at 0b354c9:

- Frontend ESLint: passed.
- Vite production build: passed.
- Six unittest cases: passed using temporary SQLite databases.
- Cross-site login form without custom header: rejected.
- Missing session, expiry, wrong CSRF, forged user ID: rejected in tested cases.
- Another user's private photo: rejected; owner path allowed with file serving mocked.
- Copied cookie after logout: rejected.
- New/update journey flow: baseline/history preserved; repeat init checked.

Important limits: the photo test mocks file delivery, not a real browser download.
No completed post-authentication full browser walkthrough or hosted deployment
test is recorded. Tests do not establish every endpoint, migration, upload failure
path, or calculation is correct. Do not report the entire product as fully tested.

CI configuration is .github/workflows/checks.yml. It installs Python dependencies,
runs unittest, installs frontend dependencies, runs lint and builds on pushes/PRs.
Inspect the actual GitHub Actions run before claiming a particular remote run passed.

## 17. Next Developer Checklist and Transfer Notes

- Start by checking git status and remote main; this document is a dated snapshot.
- Read auth.py, app.py and frontend/src/utils/api.js together before changing auth.
- Keep all private API calls on the same origin, including image URLs. Vite's
  development proxy does not automatically exist in a deployed frontend build.
- auth_sessions is created by init_auth, after init_db. Preserve that startup order.
- Never store passwords, session cookies, real user records or uploaded photos in
  documentation or Git. Back up the database and uploads privately.
- Moving to another account on the same machine does not move the project folder.
  A Git clone on another machine includes source, not ignored data, dependencies,
  running processes, local caches, or the previous chat history.
- Source-of-truth reading order: this handoff, README, API contract, then code/tests.
- Explain the intended edits and their purpose to the user, who is learning the
  backend and prefers clear step-by-step explanations. Keep teammate work intact.
- There is no public website URL or provisioned hosting account recorded here.
  Hosting setup, budget decisions and credentials are still external prerequisites.
- The next milestone is a tested hosted staging instance. Profile, activity
  history, datasets and optional social features should not block that milestone.
