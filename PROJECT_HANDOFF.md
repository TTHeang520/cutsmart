# CutSmart Project Handoff

This document is the working context for a new developer or a new AI assistant.
Last reconciled with source: 2026-11-14, `main` at the v1.0.0 launch (PRs #1-#8).
Check `git log` and open GitHub issues first: this is a dated snapshot.

## 1. Project in One Paragraph

CutSmart is a weight-management web application. A user registers, enters body
statistics and a target, receives a calorie-deficit plan, and records weight,
food, and exercise. The app groups those records into **journeys** so a user can
update a plan without losing their current history, or deliberately start a new
journey while keeping their old journey available as history.

**Status: launched (v1.0.0, 2026-11-13)** at https://cutsmart.pythonanywhere.com on
PythonAnywhere's free plan. Hosting, updates and backups: `docs/PYTHONANYWHERE.md`.

- Frontend: React + Vite (built locally and uploaded; `dist/` is not in Git)
- Backend: Python + Flask, started by `backend/pythonanywhere_wsgi.py` when hosted
- Database: SQLite in `~/cutsmart-data/cutsmart_database` on the server
- Food photos: `~/cutsmart-data/uploads/food_photos/` (resized WebP)

Locally, the same code runs with `python backend/app.py` + `npm run dev`, using a
separate local database. A Windows packaging path also exists (`backend/desktop.py`,
`docs/LOCAL_APP.md`) but has no v1.0.0 download.

## 2. Repository Layout

```text
cutsmart/
|- backend/
|  |- app.py                 Flask routes, validation, photo handling
|  |- database.py            SQLite schema, migrations, database helpers
|  |- planner.py             Calorie-deficit calculation logic
|  |- auth.py                Sessions, CSRF, ownership checks, login rate limits
|  |- config.py              Data directory and production settings
|  |- pythonanywhere_wsgi.py Hosted entry point (production mode, data dir, proxy)
|  |- serve.py / desktop.py  Waitress runner / Windows app launcher
|  |- test_*.py              Backend tests (79 at launch)
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
|- docs/PYTHONANYWHERE.md    Hosting setup, updating, renewal and backups
|- scripts/                  package-frontend.ps1 (hosting zip), Windows build
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
- Login/registration are rate limited per visitor IP. Password recovery and a
  full security review remain.

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

SQLite file location: `backend/cutsmart_database` locally (ignored by Git; each
developer has their own), and `~/cutsmart-data/cutsmart_database` on PythonAnywhere
(the live data).

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
| `auth_limits` | Login/registration attempt counters per hashed IP, 15-minute windows; created by auth.py |

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
| Weight | `POST /api/weights`, `PUT/DELETE /api/weights/<weight_id>`, `GET /api/weights/history/<user_id>`, `GET /api/weights/latest/<user_id>`, `GET /api/weights/<user_id>?date=YYYY-MM-DD` |
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

At launch: 79 backend tests, frontend lint and build pass, also in GitHub Actions.

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

## 9. Current Limitations

1. **Free hosting:** 512 MB disk, one web worker, and the web app must be renewed
   monthly on the PythonAnywhere Web tab. New free accounts have no scheduled tasks,
   so backups are manual (`docs/PYTHONANYWHERE.md`).
2. **Accounts:** no password reset and no self-service account deletion; both need
   manual database work for now.
3. **Frontend:** long pages on phones (#7), error messages shown off-screen (#6);
   profile, reports and settings pages are not built.
4. **Windows app:** packaging exists but was not re-tested for v1.0.0; no download.
5. **Scale:** SQLite and local-disk photos suit a small user base. Growing beyond the
   free plan means a paid PythonAnywhere plan, or Render/PostgreSQL/object storage
   (`docs/HOSTING_SETUP.md`), which would need data migration.

## 10. Production Setup (as launched)

| Layer | Choice |
| --- | --- |
| Hosting | PythonAnywhere free plan, username `cutsmart`, Python 3.12 virtualenv `cutsmart-venv` |
| Entry point | `/var/www/cutsmart_pythonanywhere_com_wsgi.py` imports `backend/pythonanywhere_wsgi.py` |
| Settings | `CUTSMART_ENV=production`, `CUTSMART_DATA_DIR=~/cutsmart-data`, `CUTSMART_PROXY_HOPS=1` (verified: per-visitor rate limits) |
| Frontend | Built locally with `scripts/package-frontend.ps1`, unzipped to `~/cutsmart/frontend/dist` |
| HTTPS | Force HTTPS on (Web tab) |

Updating: backend-only changes need `git pull`, `pip install`, Reload; frontend
changes also need a new zip uploaded and unzipped. Back up before every update.

## 11. Suggested Next Work

1. Frontend issues #6 (visible error messages) and #7 (shorter pages).
2. Date inputs: `max` = tomorrow on all log forms; Weight Track `min` = journey start.
3. Password reset and "delete my account" (needs an email service or an admin flow).
4. Re-test and publish the Windows package if offline use is wanted.
5. Cleanup: compress mascot images, remove unused components and
   `frontend_backup/`, shared format helpers, calendar activity dots.

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
| Core fixes | Log editing, real streaks, signup validation (Teck Heang); PR #1 |
| Backend launch fixes | Server-side plan recalculation, input limits, weight editing, migration fix, full API tests; PR #2 |
| Hosting | PythonAnywhere entry point, photo compression, frontend packaging, guide; PR #3 |
| Frontend launch fixes | Shared plan loading, weight edit UI, wizard limits, journey confirmation, logout cleanup; PR #4 |
| Date rules | No future dates, weights not before journey start, rounded-up healthy target; PR #5 |
| Launch | v1.0.0 live on 2026-11-13 after a clean database reset |

GitHub repository: https://github.com/TTHeang520/cutsmart

Preview release: https://github.com/TTHeang520/cutsmart/releases/tag/v0.1.0-preview

The preview tag points to the earlier local-preview commit. Later commits on main
include authentication. Downloading that older release does not include the new
authentication work. Release notes describe their tagged snapshot, not latest main.

## 16. Verification Ledger (v1.0.0)

- 79 backend tests: every API route, bad input, cross-account access, photos
  (resize, rotation, metadata removal), journeys, date rules, migrations, and the
  PythonAnywhere entry point (production settings, per-visitor rate limits).
- Frontend lint and build pass; GitHub Actions runs both plus the backend tests.
- Live checks on the hosted site: two-account isolation, data survives Reload,
  per-visitor login rate limit (laptop blocked, phone on mobile data allowed),
  photo upload, weight editing, future-date rejection, new frontend served.
- Not covered: automated browser tests, load testing, a restore drill on the server.

## 17. Next Developer Checklist

- Start with `git status`, `git log` and the open GitHub issues.
- Read auth.py, app.py and frontend/src/utils/api.js together before changing auth.
- Keep all API calls and image URLs same-origin (`/api/...`).
- `auth_sessions` is created by `init_auth`, after `init_db`. Keep that startup order.
- Work on a branch and open a pull request; the team reviews and merges.
- Never commit passwords, real user data, `backend/cutsmart_database`, uploads or backups.
- The live database is only on PythonAnywhere. Back it up before risky changes and
  test destructive commands locally first; there is no undo for `rm`.
- Keep `docs/API_Contract.md` in step with any route change, and frontend form limits
  in step with backend validation.
