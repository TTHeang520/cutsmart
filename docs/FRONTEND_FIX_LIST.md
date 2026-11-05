# Frontend Fix List Before Launch

Hi Teck Heang,

Before launch, Wei Jien and I (Claude) went through the whole frontend page by page,
and also ran the production build (`backend/serve.py`) against a fresh database to
check the pages in a browser. The backend fixes are in the PR
`fix/backend-launch-bugs`. **Please pull that branch first.** Several items below
rely on what it adds (a new weight edit endpoint, `journey` in the weight history
response, and new input limits).

Everything below is grouped by priority:

- **P0: must fix before launch.** Users get wrong numbers or hit dead ends.
- **P1: should fix before launch.** It's confusing, or the frontend and backend disagree.
- **P2: polish and cleanup.** Nice to have, can go after launch.

Each item says where the problem is, how to reproduce it, a suggested fix, and how
to check it's done. Line numbers are from `main` at `d7f63d1`. Please make the fixes
on a new branch (e.g. `fix/frontend-launch-bugs`) and open a PR so Wei Jien can review.

---

## P0: must fix before launch

### 1. Weight "Edit" creates duplicates instead of editing

**Where:** `src/pages/WeightTrack.jsx`: `handleEdit` (line 109) and `handleSubmit` (line 81).

**Problem:** "Edit" only copies the entry into the "Add new entry" form. Saving then
calls `POST /api/weights`, which can only insert, or overwrite whatever is on that date.
- **Starting weight:** saving adds a *second* entry on the start date, and the real
  starting weight never changes.
- **Changing the date while editing:** a new entry is created, and the old one stays.
- **Feedback:** the user never sees that they are in "edit mode".

**Reproduce:**
1. Create a plan.
2. Go to Weight Track and click Edit on the "Start" entry.
3. Change the weight and press Save Entry.
4. The history now shows two entries on the start date.

**Fix:**
- Keep an `editingEntry` state, like FoodLog and ExerciseLog do.
- While editing, show "Edit entry" and "Save Changes", plus a Cancel button that resets the form.
- On save, call the new endpoint:
  ```js
  apiFetch(`/api/weights/${editingEntry.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id, weight_kg, logged_date, note }),
  })
  ```
- For the starting weight (`entry.is_initial === 1`), **disable the date input**. The
  backend returns 400 if its date changes. Only the weight and note can change.
- Show the backend's message on errors. 409 means "You already have a weight entry on
  that date. Edit that entry instead".
- Contract: `docs/API_Contract.md`, section "Edit Weight".

**Done when:**
- Editing any entry changes that entry and never adds a new one.
- Editing the start weight updates "Starting weight" everywhere.
- Moving an entry onto a date that already has one shows the 409 message.

### 2. "Start" weight and progress % reset when the plan is modified

**Where:**
- `src/pages/Dashboard.jsx:30` and `:589`
- `src/pages/WeightTrack.jsx:72`
- `src/utils/weightUtils.js:1`

**Problem:** `getWeightStats` falls back to `plan.current_weight_kg` when no `journey`
is passed. Dashboard and Weight Track never pass one. That means:
- After "Modify Plan" with a new current weight, "Start" shows the new weight.
- Progress to goal drops back to roughly 0%.
- Editing the starting weight (item 1) is ignored.

I confirmed this live: the journey baseline was corrected to 70.5 kg, but the dashboard
still showed "Start: 70 kg".

**Fix:** `GET /api/weights/history/<user_id>` now also returns `journey`, which includes
`initial_weight_kg` and `target_weight_kg`.
- Store it next to the history and pass it in:
  `getWeightStats({ weights, plan: latestPlan, journey })`.
- Do this in Dashboard (both calls, including `WeightPreview`) and in WeightTrack.
- JourneyHistory and JourneyOverview already pass `journey`.

**Done when:** after Modify Plan with a different current weight, the dashboard
"Start" still shows the journey's original starting weight and progress % doesn't reset.

### 3. Plan and goal missing on a new device or browser

**Where:** `getStoredLatestPlan(user)` in:
- `FoodLog.jsx:14`
- `ExerciseLog.jsx:27`
- `WeightTrack.jsx:22`
- `JourneyHistory.jsx:13`

**Problem:** These pages only read the plan from `localStorage`. They never ask the
server. On a new phone or laptop, or after clearing site data, opening Weight Track
or Food Log directly (bookmark or refresh) shows:
- Daily target: **0 kcal**
- Goal weight: **--**
- Progress: **0%**

You only see real numbers after visiting the Dashboard once. I reproduced this on
Weight Track. Once the site is hosted and people use several devices, this will be common.

**Fix:**
- Make one shared hook, e.g. `src/utils/useLatestPlan.js`. It starts from the cache,
  then calls `GET /api/plans/latest/<id>`, then updates the state and the cache.
- Use it on all these pages, and delete the 7 copies of `getStoredLatestPlan` /
  `getLatestPlanKey`.

**Done when:** after clearing localStorage (keeping the login cookie) and opening
`/food-log` directly, the target calories appear within a moment.

### 4. Plan wizard limits don't match the backend (heavier users can't sign up)

**Where:** `src/pages/Plan.jsx`:
- `RangeField` sliders at lines 612 and 631 (current weight 40-150, target 35-140)
- age input at line 552
- height input at line 589
- timeline input at line 685
- `isStepComplete` at line 1094

**Problems:**
- **Weight caps:** anyone over 150 kg can't enter their weight, so they can't use the app at all.
- **Whole numbers only:** the sliders only allow whole kg (80.5 isn't possible).
- **Errors arrive late:** the backend now rejects age under 18 or over 100, height outside
  100-250 cm, timeline outside 1-520 weeks, and targets below a healthy BMI of 18.5. Users
  only find out at the very last step.
- **Target vs current:** target ≥ current is only reported at the end.

**Fix:**
- Replace the sliders with number inputs (`step="0.1"`, `min="30"`, `max="350"`), or keep
  a slider but add a number box next to it with those limits.
- Age: `min="18" max="100"`. Height: `min="100" max="250"`. Timeline: `min="1" max="520"`.
- In `isStepComplete`, enforce the same ranges and show a hint under the field when invalid.
- Step 3 (target weight):
  - Disable Next when target ≥ current weight, with a hint.
  - Show the lowest healthy target, using the same formula as the backend:
    `minTarget = 18.5 * (height_cm / 100) ** 2`.
    For example: "For 165 cm, the lowest healthy target is 50.4 kg."
- Keep showing the backend `message` as a fallback.

**Done when:**
- A 160 kg user can create a plan.
- Entering age 15 or a 40 kg target for 175 cm shows a hint on that step, not at the end.

### 5. Creating a new plan from the Plan page archives the journey without asking

**Where:** `src/pages/Plan.jsx`:
- `handleCreateNewPlan` (line 181), used by the account menu and the "Create New Plan"
  button on the summary
- `onRestart` (line 386), the "Create another plan" button

**Problem:** These set `planSaveMode` to `"new"` straight away. The next generated plan
archives the current journey and starts a fresh one. The Dashboard asks before doing
this ("Start New Journey?"), but the Plan page doesn't, so one click on "Create another
plan" right after finishing the wizard silently archives everything.

**Fix:**
- Show the same confirmation modal as the Dashboard (`ConfirmStartJourneyModal`; move it
  to `src/components/` so both pages can use it).
- After the very first plan, consider making "Create another plan" mean "edit this
  plan" (mode `update`) instead.

**Done when:** no button archives a journey without a confirmation that says so.

---

## P1: should fix before launch

### 6. Weight entry form limits

**Where:** `src/pages/WeightTrack.jsx:222`.

The backend now only accepts 20-500 kg. Change the input to `min="20" max="500"` (keep
`step="0.01"`). Note `maxLength={200}` is already right.

### 7. Food and exercise form limits

**Where:** `FoodLog.jsx` and `ExerciseLog.jsx` inputs. The backend now enforces:

| Field | Limit | Suggested input attributes |
| --- | --- | --- |
| Food / exercise name | required, ≤ 100 chars | `maxLength={100}` |
| Notes | ≤ 500 chars | `maxLength={500}` |
| Food calories | 1-10,000 | `min="1" max="10000"` |
| Protein / carbs / fat | 0-1,000 g | `min="0" max="1000" step="0.1"` (decimals are currently blocked because the default step is 1) |
| Exercise duration | 1-1,440 min | `min="1" max="1440"` |
| Calories burned | 1-10,000 | `min="1" max="10000"` |

A name that is only spaces is now rejected by the backend. Trimming before sending
avoids the error.

### 8. Use the plan the server returns after saving

**Where:** `saveGeneratedPlan` in `src/pages/Plan.jsx` (return at line 1086).

The backend now recalculates and stores the plan itself. It ignores the numbers the
browser sends, and returns the stored version as `data.plan`. Return
`{ ...data.plan, journey_id, plan_id }` instead of merging the client's
`inputData`/`planResult`, so the screen always shows exactly what was saved.

### 9. Dead links and buttons

| Where | What | Suggested fix |
| --- | --- | --- |
| `Dashboard.jsx:179-180` sidebar | "Reports", "Settings" do nothing | Link to `/reports` and `/settings` (placeholder pages exist), or remove them |
| `Dashboard.jsx:327` quick action | "Streak" does nothing | Scroll to the streak card (`#streak` exists), or make it a non-clickable tile |
| `Dashboard.jsx:328` quick action | "Reports" does nothing | Same as above |
| `JourneyOverview.jsx:111` | "···" share button does nothing | Remove until sharing exists |
| `JourneyOverview.jsx:160` | Disabled "Coming Soon" button | Remove, or hide for archived journeys |
| Profile menu links `/profile`, `/activity-history` | "Coming Soon" pages | Hide from the menu for launch |

### 10. Misleading copy

- `Dashboard.jsx:200`: always "Good morning". Use the hour: morning before 12,
  afternoon before 18, evening after.
- `Dashboard.jsx:516`: the confirm text says starting a new journey "will reset ... streak
  and calendar tracking". The streak and calendar include all journeys and are **not**
  reset. Suggested: "Your current journey will be archived and a new one started.
  Previous journeys stay in Journey History, and your calendar and streak keep your
  past logs."
- `JourneyHistory.jsx:309`: `formatActiveTimeline` returns "in 12 days" for a journey
  that started 12 days ago. Suggested: "12 days in".
- `JourneyHistory.jsx`, `CurrentJourneyCard`: shows two pills, "Current Journey" and
  "Current". Keep one.

### 11. Fake sample chart on an empty weight page

**Where:** `WeightTrack.jsx:180` and `components/WeightLineChart.jsx:13`.

With no entries, Weight Track shows a made-up trend (71.1 kg, 71 kg, ...) dated in
June. New users may think it's their data. Pass `sampleWhenEmpty={false}` and show
the empty text instead, as Dashboard already does.

### 12. Logged-in users still land on the login page

**Where:** `src/App.jsx:24` and `pages/Login.jsx`.

`/` always redirects to `/login`, even when already logged in, and the login page
doesn't redirect logged-in users. Once the site has a public URL this is the first
thing users see.
- Redirect `/` to `/dashboard` when `localStorage.user` exists, otherwise to `/login`.
- In Login, redirect to `/dashboard` if `user` exists.
- `/welcome` is never reached in the current flow. Either send first-time users (no
  plan) there after login, or delete it.

### 13. Browser tab title and icon

**Where:** `frontend/index.html`.

- The title is `frontend`. Change it to `CutSmart`.
- `public/favicon.svg` is the default Vite logo. Replace it with a
  CutSmart icon.
- Add `<meta name="description" content="...">` and `<meta name="theme-color" ...>`.

---

## P2: polish and cleanup (can go after launch)

### 14. Large images slow the first load on phones

These PNGs are bundled at full size:
- `src/assets/companions/dashboard_mascot.png` (2.1 MB)
- `src/assets/companions/plant-stage-2.png` (1.3 MB)

Convert them to WebP or compressed PNG, ideally under 200 KB each and roughly the
size they are displayed. `public/plant-stage-1.png` (1.8 MB) isn't used anywhere in
`src`; delete it, or use it.

### 15. Unused code to remove

None of these are imported by any page:
- `src/components/ExerciseTrack.jsx`
- `src/components/JourneyPath.jsx`
- `src/components/JourneyNode.jsx`
- `src/components/ThemeDecorations.jsx`
- `src/data/exerciseOptions.js`
- `src/pages/JourneyOverviewPlaceholder.jsx`
- `buildJourneyMilestones` in `src/data/journeyThemes.js` (check whether anything else in that file is still used)
- `src/assets/react.svg`, `src/assets/vite.svg`, `src/assets/hero.png`

Also at the repository root, only if you agree they're no longer needed:
- `frontend_backup/`
- the root-level PNG copies, including `ChatGPT Image Jun 29, 2026, ...png`
- `.DS_Store`

### 16. Duplicated helpers

`formatNumber`, `formatLabel`, `getStoredLatestPlan` and `getLatestPlanKey` are
copy-pasted in 5-7 pages, with slightly different behaviour; e.g. `formatNumber(null)`
returns "-" on some pages and "0" on others. Move them to `src/utils/format.js` so
every page shows the same thing.

### 17. Calendar improvements

- Days with logs aren't marked. `GET /api/activity/<id>?start=&end=` returns per-day
  counts for a whole month in one call, so add a dot under active days.
- Calendar isn't in the bottom navigation. On phones it's only reachable from the
  dashboard quick actions.

### 18. Exercise category legacy parsing

`ExerciseLog.jsx` still parses `[category:...]` from notes, from before the
`category` column existed. Once you're sure no old data uses it, it can be removed.

---

## Quick test checklist after your fixes

Run these with `npm run build` followed by `.\.venv\Scripts\python.exe backend/serve.py`,
using **two different accounts** (one in a private window):

1. Register, then log in. You should land on the dashboard. Refresh `/`; you should stay logged in.
2. Plan wizard:
   - Try age 15, a 160 kg current weight, and a target below the healthy BMI. You
     should get clear hints on each step.
   - Then create a valid plan.
3. Add food (with a photo), exercise and two weight entries. Edit each one.
   - Edit the start weight; the dashboard "Start" should update.
   - Move a weight entry onto a date that already has one; you should get the 409 message.
4. Modify the plan with a different current weight. "Start" and progress shouldn't reset.
5. Start a new journey. You should be asked to confirm. Old journey should be in Journey History.
6. In a fresh browser profile, log in and open `/food-log` directly. The target calories should show.
7. Account B must never see account A's data or photos.
8. `npm run lint` and `npm run build` must pass.

Thanks! Ping Wei Jien if any backend response looks different from
`docs/API_Contract.md`.
