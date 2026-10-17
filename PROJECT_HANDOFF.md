# CutSmart Project Handoff

This document is the working context for a new developer or a new Codex account.
Authentication update (2026-10-18): auth.py implements revocable eight-hour
database sessions, hashed tokens, CSRF checks and user ownership enforcement.
Photos require ownership. Frontend utils/api.js uses same-origin /api requests.
Production requires HTTPS and CUTSMART_ENV=production for Secure cookies.
Older authentication descriptions below are historical; use the updated API
contract. Login rate limiting and hosting remain outstanding.
Release wrap-up: 2026-10-18. Current checkout: `C:\CUTSMART\cutsmart`.
Earlier absolute paths below describe the previous computer layout; use your
actual clone directory. See README.md for portable setup commands.
It describes what CutSmart is, what is implemented now, how the code is organised,
how to run it locally, and what remains before a public launch.

## 1. Project in One Paragraph

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
- This is suitable for the local prototype, but is not production-grade
  authentication yet because it has no server-side session or JWT token.

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

`database.py:init_db()` both creates new tables and runs small migrations for
older local databases. This matters: do not remove those migration blocks just
because a fresh database works. They preserve existing development data after a
schema change.

## 6. Important API Routes

The authoritative request/response shapes are in [docs/API_Contract.md](docs/API_Contract.md).

High-level route groups:

| Area | Routes |
| --- | --- |
| Auth | `POST /api/register`, `POST /api/login` |
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
changing a record outside the supplied user/journey combination. This is NOT
authentication: a caller can supply another user's ID. Public deployment requires
server-verified identity and authorization.

## 7. Running Locally

Open two terminals.

### Backend terminal

```powershell
cd "C:\University (NUS)\CUTSMART\cutsmart\backend"
python -m pip install -r requirements.txt
python app.py
```

The Flask backend runs at `http://127.0.0.1:5000` and creates the database and
upload folder automatically when it starts.

### Frontend terminal

```powershell
cd "C:\University (NUS)\CUTSMART\cutsmart\frontend"
npm install
npm.cmd run dev
```

Use `npm.cmd` in PowerShell if `npm run dev` is blocked by the machine's script
execution policy. Vite normally prints a URL such as `http://localhost:5173`.

### Local checks used recently

```powershell
cd "C:\University (NUS)\CUTSMART\cutsmart"
python -m py_compile backend\app.py backend\database.py backend\planner.py

cd frontend
npm.cmd run lint
npm.cmd run build
```

The project passed these checks at commit `8c4a8bd` (`Fix frontend hook dependency warnings`).

## 8. What Local Storage Means Here

There are two different kinds of local data:

| Storage | Current use | Shared between users/computers? |
| --- | --- | --- |
| Browser `localStorage` | Logged-in user object and some cached/fallback plan UI data | No. It belongs to one browser profile on one computer. |
| SQLite database file | Actual backend user, journey, plan, food, exercise and weight records | No. It belongs to the computer running Flask. |

The main logs now save to SQLite through Flask. `localStorage` still exists for
the prototype login state and fallback/cache behaviour. It should not be treated
as the authoritative source for production data.

## 9. Current Limitations / Not Yet Production Ready

The local app works, but it is not yet a shared public app. Important remaining
work:

1. **Shared database:** provision persistent server-side storage. Hosted PostgreSQL
   is an option; SQLite can also serve multiple users through a hosted backend
   with suitable persistent disk and concurrency limits. Current independent
   developer database files are not shared automatically.
2. **Cloud photo storage:** replace `backend/uploads/food_photos/` with a service
   such as Cloudinary, Amazon S3, or Supabase Storage. A hosted backend's local
   disk is not reliable shared media storage.
3. **Deployment configuration:** frontend API URLs are currently mostly hardcoded
   to `http://127.0.0.1:5000`; replace them with a Vite environment variable
   such as `VITE_API_BASE_URL` and one shared API URL helper.
4. **Production authentication:** use a secure session cookie or JWT. Do not
   rely only on a user object in browser `localStorage` for authorization.
5. **Environment variables:** database URL, CORS origin, upload credentials and
   secret keys must be outside Git and configured by the host.
6. **Frontend placeholders:** `/profile` and `/activity-history` are explicitly
   "Coming Soon" screens. Reports/settings should be checked for final product
   scope before launch.
7. **Automated tests:** `backend/test_smoke.py` now covers the core journey/weight
   flow with a temporary database. Broader API and browser coverage remains.
8. **Deployment security:** debug mode must be disabled; Flask development server
   must be replaced by a production WSGI server such as Gunicorn on the hosting
   platform.

## 10. Recommended Public-Launch Stack

This is a simple, suitable path for a student project:

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

1. Create a frontend API helper using `VITE_API_BASE_URL`; remove hardcoded
   `127.0.0.1:5000` values and inconsistent relative `/api/...` requests.
2. Add a backend configuration module for CORS origin, secret key and database
   connection settings.
3. Migrate database access from `sqlite3` to PostgreSQL using a proper migration
   tool (Alembic/Flask-Migrate is recommended) rather than copying the SQLite
   file.
4. Move food image uploads to cloud storage and save the returned URL/public ID
   in `food_logs.photo_path`.
5. Add real authentication/session handling.
6. Add API tests for register/login, plan save modes, journey isolation, logs,
   and photo upload validation.
7. Deploy backend, database and frontend; set environment variables on each host.
8. Test with two independent browser profiles/accounts to prove users cannot see
   or modify each other's records.

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
