# CutSmart

**Try it: https://cutsmart.pythonanywhere.com**

CutSmart helps you lose weight in a balanced way. Instead of handing out a fixed
workout, it works out a healthy **calorie deficit** for your body and goal, splits it
between food and exercise the way you prefer, and helps you track how it goes.

## Features

- **Personal plan:** enter age, gender, height, current and target weight, daily
  activity and a preferred strategy (diet-focused, exercise-focused or balanced).
  CutSmart calculates BMI, maintenance calories, a daily calorie target, how the
  deficit splits between diet and exercise, protein/carbs/fat targets and an
  estimated timeline. If your timeline is too fast, it offers a steady plan and a
  faster option that stays within safe limits.
- **Journeys:** update your plan without losing your history, or start a new
  journey; old journeys stay readable in Journey History.
- **Food log:** meals with calories, optional macros, notes and a photo.
- **Exercise log:** workouts with category, duration and calories burned.
- **Weight tracking:** entries with notes, a trend chart, and progress toward your goal.
- **Dashboard and calendar:** today's calories eaten and burned, weekly overview,
  logging streak, and any day's entries at a glance.

## Privacy and safety

- Each account can only see its own data. Passwords are stored hashed.
- Food photos are resized and stripped of hidden metadata (such as GPS location).
- Plans keep to minimum daily intakes and refuse underweight targets (BMI below 18.5).
  CutSmart gives general estimates, **not medical advice**.

## Using the website

Open the link above, register, create your plan, and start logging. It works in any
modern browser on phones and computers. Your data is stored on the CutSmart server,
so you can log in from any device.

## Running it locally (for developers)

Requires Python 3.12+ and Node.js 22.12+. From the repository root in PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
.\.venv\Scripts\python.exe backend/app.py
```

In a second terminal:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open the URL Vite prints (normally http://localhost:5173). Your local database
(`backend/cutsmart_database`) and photos (`backend/uploads/`) are separate from the
website's data and are never committed to Git.

### Checks

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend -p "test_*.py"
cd frontend
npm.cmd run lint
npm.cmd run build
```

The same checks run on GitHub for every push and pull request.

## Tech stack

| Part | Technology |
| --- | --- |
| Frontend | React 19, Vite, React Router |
| Backend | Python, Flask, Waitress |
| Database | SQLite |
| Photos | Pillow (validation, resizing, WebP) |
| Hosting | PythonAnywhere |

## Documentation

| Document | What it covers |
| --- | --- |
| [docs/PYTHONANYWHERE.md](docs/PYTHONANYWHERE.md) | Hosting: setup, updating the site, monthly renewal, backups |
| [docs/API_Contract.md](docs/API_Contract.md) | Every API route, request and response |
| [docs/Calorie_Deficit_Planner_Reference.md](docs/Calorie_Deficit_Planner_Reference.md) | How the plan is calculated |
| [docs/Frontend_User_Flow.md](docs/Frontend_User_Flow.md) | Plan wizard flow and design direction |
| [docs/RELEASE_NOTES.md](docs/RELEASE_NOTES.md) | What changed in each release |
| [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md) | Architecture, decisions and history for new developers |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), [docs/HOSTING_SETUP.md](docs/HOSTING_SETUP.md) | Other ways to run the server (Waitress, Docker, paid hosting) |
| [docs/LOCAL_APP.md](docs/LOCAL_APP.md) | Packaging CutSmart as a Windows app |

## Known limitations

- No password reset or self-service account deletion yet; contact the team.
- Hosted on a free plan: storage is limited and the site is renewed monthly.
- No Windows download for v1.0.0 yet; the website is the recommended way to use CutSmart.
- Reports, profile and settings pages are not built yet.

## Why we built it

Many people exercise but still eat more than they burn, or cut food too aggressively
without considering activity or health. CutSmart shows a clear calorie target,
explains the deficit, and adjusts recommendations to each person's preferences.

Ideas for later include adaptive plans as weight changes, progress reports, social
challenges, and friend or coach features.

## Team

- Ng Wei Jien: backend
- Tan Teck Heang: frontend
