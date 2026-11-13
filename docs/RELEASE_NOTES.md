# Next release - Mobile usability

## Improvements

- Food, exercise and weight forms begin within the first phone screen instead of
  sitting below tall summary sections.
- Tracker feedback stays visible above the fixed navigation and remains announced
  to screen readers with `role="alert"`.
- The phone dashboard uses compact summary and quick-action grids and stays under
  four screens with representative data.
- Weight entry is presented before secondary profile and chart information.

## Verification

- 79 backend tests pass.
- Frontend lint and production build pass.
- At 375×812, the dashboard measures 3.34 screens; Food and Exercise forms begin
  at 0.41 screens and the Weight form at 0.66 screens, without horizontal overflow.

---

# v1.0.0 - First Public Launch

Released on 2026-11-13. Live at https://cutsmart.pythonanywhere.com

## What you can do
- Register and get a personal calorie-deficit plan: BMI, maintenance calories, daily
  target, diet/exercise split by strategy, macros and timeline, with a faster option
  that stays within safe limits.
- Keep updating your plan in the same journey, or start a new journey; past journeys
  stay readable in Journey History.
- Log meals (with photos and macros), workouts (with categories) and weight (with
  notes, a trend chart and editing, including the starting weight).
- See today's progress, a weekly overview, your logging streak and a calendar of past days.

## Changes since the preview
- **Security:** server sessions, CSRF protection and per-account access checks on every
  route; login and registration rate limits per visitor.
- **Plans:** recalculated on the server, never trusted from the browser; input limits
  (adults 18-100, realistic heights and weights); underweight targets refused with a
  suggested healthy minimum.
- **Logs:** weight entries can be edited; no future dates; weights can't predate the
  journey start; text and number limits on every field.
- **Photos:** resized to at most 1280 px, saved as WebP, location metadata removed.
- **Frontend:** plan wizard hints, confirmation before archiving a journey, plan always
  loaded from the server (works on any device), cached data cleared on logout, dead
  links removed, new title and icon.
- **Hosting:** PythonAnywhere setup, frontend packaging script, backup and update guide.
- **Tests:** 79 backend tests; lint and build checks on every pull request.

## Known limitations
- No password reset or self-service account deletion yet.
- Free hosting: limited storage, renewed monthly.
- No Windows download for this release.
- Planned improvements: error messages shown where you are (#6), shorter pages (#7).

CutSmart gives general estimates, not medical advice.

---

# v0.1.0-preview - Local Prototype

Prepared on 2026-10-18.

## Included

- React frontend and Flask backend with persistent SQLite storage.
- Registration, password hashing, and prototype login UI.
- Calorie plans with plan snapshots grouped into journeys.
- Plan updates preserve the journey; new journeys archive the previous one.
- Initial and daily weight records, food logs/photos, exercise logs/categories.
- Calendar data loaded from the backend and archived journey history views.
- Repeatable journey regression test using a temporary database.
- Setup instructions and project handoff documentation.

## Intended Use

Run locally with both development servers. A GitHub source release requires
Python and Node.js installation; it is not a desktop executable or hosted app.
No dataset is needed to use manual logging.

## Before Public Hosting

The API trusts user IDs from requests. Ownership filters alone do not authenticate
the caller. Add server-verified login sessions and authorization on every private
route, including image retrieval, before accepting public user data.

Also configure API origins, production serving with debug disabled, secret
management, persistent storage and backups, and exercise the complete UI flow.
Hosted PostgreSQL and object storage are possible choices; SQLite can also run on
a properly provisioned persistent server, but current hosting has not been set up.
Profile and activity-history screens remain deferred placeholders.

## Regression Scope

The automated test checks account creation/login, plan generation/save, preservation
of weight history across plan updates, separation of new journeys, archived weight
access, mismatched-user filtering, and repeatable database initialization. It is
not a complete security, medical-calculation, browser, or photo regression suite.
