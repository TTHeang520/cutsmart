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
