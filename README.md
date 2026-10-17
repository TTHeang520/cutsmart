# CutSmart

## Downloadable Windows App

Windows x64 users can download **CutSmart-Windows-x64.zip** from the
[GitHub releases](https://github.com/TTHeang520/cutsmart/releases), extract all
files, then double-click **CutSmart.exe**. No Python or Node.js installation is
needed. Keep the application window open. Records and photos stay on your own
computer in `%LOCALAPPDATA%\CutSmart`. See [local app guide](docs/LOCAL_APP.md).
The Source code downloads are for developers, not the packaged application.

## Local Preview Release

CutSmart is a React/Vite + Flask web app with SQLite persistence. It supports
plans, archived journeys, weight tracking, food photos, exercise categories,
and calendar views. This release is for running locally on your own computer.
Server-verified sessions, ownership checks, private photos and CSRF protection
are implemented. Public hosting still needs HTTPS, same-origin API routing,
persistent hosting and deployed-browser verification. IP-based login/register
rate limits and a Waitress single-origin runner are now implemented; see
[Deployment](docs/DEPLOYMENT.md) for persistent-disk settings and preview commands.

### Start the App

Install Python 3.12+ and a Node.js version supported by Vite 8 (Node 22.12+ is
a suitable baseline). Clone this repository, then run from its root in PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
.\.venv\Scripts\python.exe backend/app.py
```

Keep that terminal open. In a second terminal, from the repository root:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open the URL printed by Vite (normally http://localhost:5173). Both servers must
keep running. Register an account, generate and save a plan, then log activity.
The database and upload directories are created automatically. Your data persists
when you stop the servers; another checkout has its own database.

### Verification and Handoff

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend -p "test_*.py" -v
cd frontend
npm.cmd run lint
npm.cmd run build
```

See [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md) for architecture and history,
[API Contract](docs/API_Contract.md) for requests/responses, and
[release notes](docs/RELEASE_NOTES.md) for scope and remaining launch work.

Back up `backend/cutsmart_database` and `backend/uploads/` privately before
moving computers. They are intentionally excluded from Git. A GitHub release
provides source downloads, not a running hosted service.

The original project proposal below describes ideas as well as implemented work;
use the handoff and release notes to determine current scope.

## Local Preview Release

CutSmart is a React/Vite + Flask web app with SQLite persistence. It supports
plans, archived journeys, weight tracking, food photos, exercise categories,
and calendar views. This release is for running locally on your own computer.
It is not yet suitable for an internet-facing service: the API currently trusts
client-supplied user IDs without authenticated sessions.

### Start the App

Install Python 3.12+ and a Node.js version supported by Vite 8 (Node 22.12+ is
a suitable baseline). Clone this repository, then run from its root in PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
.\.venv\Scripts\python.exe backend/app.py
```

Keep that terminal open. In a second terminal, from the repository root:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open the URL printed by Vite (normally http://localhost:5173). Both servers must
keep running. Register an account, generate and save a plan, then log activity.
The database and upload directories are created automatically. Your data persists
when you stop the servers; another checkout has its own database.

### Verification and Handoff

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend -p "test_*.py" -v
cd frontend
npm.cmd run lint
npm.cmd run build
```

See [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md) for architecture and history,
[API Contract](docs/API_Contract.md) for requests/responses, and
[release notes](docs/RELEASE_NOTES.md) for scope and remaining launch work.

Back up `backend/cutsmart_database` and `backend/uploads/` privately before
moving computers. They are intentionally excluded from Git. A GitHub release
provides source downloads, not a running hosted service.

The original project proposal below describes ideas as well as implemented work;
use the handoff and release notes to determine current scope.

CutSmart is an application that helps users plan weight loss in a smarter and more balanced way.

Most weight loss apps focus mainly on giving fixed workout. CutSmart focuses on the main idea behind weight loss: maintaining a healthy calorie deficit. The app aims to help users understand how diet and exercise work together, then generate a personalized plan based on their body statistics, goals, and lifestyle preferences.

## Project Motivation

Many people want to lose weight but struggle to make consistent progress because they do not know how to balance food intake, exercise, and realistic goals.

For example, a user may exercise regularly but still eat more calories than they burn. Another user may reduce food intake too aggressively without considering physical activity or health. CutSmart aims to guide users by showing them a clear calorie target, explaining the calorie deficit, and adjusting recommendations based on their preferences.

## Core Idea

The core of CutSmart is the calorie-deficit planner.

Users will enter basic information such as:

- Age
- Height
- Current weight
- Target weight
- Weight loss timeline
- Activity level
- Preferred strategy: diet-focused, exercise-focused, or balanced

The system will then estimate the user's daily calorie needs and generate a plan that combines dietary control and physical activity.

## Planned Features

### Milestone 1: Technical Proof of Concept

The first goal is to build a simple working version of the app.

- User profile form
- Backend calorie calculation logic
- Basic calorie-deficit plan generation
- Frontend and backend connection
- Simple testing for the calculation logic

### Milestone 2: Prototype

The second goal is to make the app more complete and usable.

- Full user profile creation and update
- Improved input validation
- Safer calorie-deficit recommendations
- Diet-focused, exercise-focused, and balanced plan options
- Basic workout recommendations
- Basic food logging
- Improved user interface

### Milestone 3: Extended System

The final goal is to add extra features if time allows.

- Weight progress tracking
- Progress charts and summaries
- Adaptive plan adjustment as weight changes
- Explanation module for recommendations
- Social weight loss challenges
- Streak system
- Family or friend monitoring feature
- Basic trainer or coach guidance module

## Tech Stack

This project currently plans to use:
- Frontend: HTML, CSS, JavaScript
- Backend: Python with Flask
- Version control: Git and GitHub

## Team Members

- Ng Wei Jien — Backend
- Tan Teck Heang — Frontend
