# CutSmart Frontend

React 19 + Vite single-page app. See the [main README](../README.md) for the whole project.

## Commands

```powershell
npm.cmd ci          # install exact dependencies from package-lock.json
npm.cmd run dev     # development server (proxies /api to Flask on 127.0.0.1:5000)
npm.cmd run lint    # ESLint
npm.cmd run build   # production build into dist/
```

Run the Flask backend at the same time for `npm run dev` (see the main README).

## Layout

| Folder | Contents |
| --- | --- |
| `src/pages/` | One component per screen (Dashboard, Plan, FoodLog, ExerciseLog, WeightTrack, Calendar, JourneyHistory, JourneyOverview, Login, Register, Welcome) |
| `src/components/` | Shared pieces (layout, bottom navigation, charts, mascot, start-journey confirmation) |
| `src/utils/` | `api.js` (requests, CSRF and logout clean-up), `latestPlan.js` (cached plan + refresh), date, weight and activity helpers |
| `src/data/` | Plan and journey themes |
| `public/` | Favicon and static images |

## Conventions

- Call the backend with `apiFetch` from `src/utils/api.js`, using same-origin `/api/...`
  URLs. It adds the headers the backend requires and sends users to `/login` when their
  session ends.
- Read the user's plan with `useLatestPlan` from `src/utils/latestPlan.js`. Don't read
  `localStorage` directly; the server is the source of truth.
- Keep form limits in step with the backend's rules in `docs/API_Contract.md`.

## Deploying

`dist/` is not committed. To update the live site, run `scripts/package-frontend.ps1`
from the repository root and follow "Updating the site" in `docs/PYTHONANYWHERE.md`.
