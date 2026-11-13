# CutSmart Frontend User Flow and Design Direction

## Purpose

This document describes the frontend experience for CutSmart, centred on the plan
wizard and its design direction. Last updated for v1.0.0 (2026-11-13).

## Current Completed Features

- Registration and login (logged-in users skip straight to the dashboard)
- Welcome page for new users without a plan
- Multi-step plan wizard with inline limit hints, generated and saved by the backend
- Staged plan result reveal, with a steady or faster (within safe limits) pace choice
- Dashboard: targets, today's calories, nutrition split, weight preview, weekly overview, streak
- Food log with photos and macros, exercise log with categories, weight tracking with editing
- Calendar, Journey History and Journey Overview
- Confirmation before any action that archives the current journey

## Current Plan Setup Flow

After logging in, the user enters the plan setup flow.

### Step 0: Onboarding Screen

Title:

> Let’s build your CutSmart plan

Subtitle:

> A personalised calorie and lifestyle plan, built around your body, goal, and routine.

Button:

> Get Started

### Step 1: About You

The user enters age and gender. This helps estimate daily energy needs.

### Step 2: Height

The user enters height in centimetres. Height is used for BMI and calorie calculations.

### Step 3: Current Weight

The user types their current weight in kilograms (30-350 kg, to 0.1 kg).

### Step 4: Target Weight

The user types their target weight (30-350 kg). It must be lower than the current
weight and not underweight: the step shows the lowest healthy target for the user's
height (BMI 18.5) and disables Next with a hint until the target is valid.

Steps 1, 2 and 7 also show a hint and disable Next when a value is out of range
(age 18-100, height 100-250 cm, timeline 1-520 weeks). These limits match the backend.

### Step 5: Movement Rhythm

The user selects how active their normal day is (planned workouts are counted
separately through the exercise deficit):

- Mostly sitting
- Light daily movement
- On your feet often
- Physical daily routine

After selecting an option, the app can automatically continue to the next step.

### Step 6: Preferred Strategy

The user chooses one plan style:

- Diet focused
- Exercise focused
- Balanced

After selecting an option, the app can automatically continue to the next step. This choice affects the plan's calorie-deficit split and the visual style of the result screen.

### Step 7: Timeline

The user enters desired timeline in weeks. The backend checks whether the requested timeline is realistic and safe.

### Step 8: Review

The user reviews all entered information and presses `Generate my plan`.

The frontend sends data to:

```text
POST /api/plan
```

## Result Experience

After the backend returns the plan, CutSmart reveals the result in smaller sections instead of showing everything at once.

The result includes:

1. Plan introduction
2. Daily calorie target
3. Estimated timeline and weekly weight loss
4. Strategy breakdown
5. Macro guide
6. Calculation details

## Strategy Themes

The backend returns one common plan structure. The frontend changes wording, icon, colours, and tone depending on the selected strategy.

### Diet Focused

- Theme: fresh, green, calm
- Icon: 🥗
- Main focus: daily calorie target, diet calorie deficit, macros, timeline

Example title:

> Your plate is about to work smarter.

Example caption:

> No sad salads or impossible rules. We’ll make your calorie target feel doable, one meal at a time.

### Exercise Focused

- Theme: cool, sporty, energetic
- Icon: ⚡
- Main focus: daily calorie target, exercise calorie deficit, weekly progress estimate, timeline

Example title:

> Time to put your movement to work.

Example caption:

> Your workouts are part of the plan now. We’ll turn that energy into progress without making every day feel like leg day.

### Balanced

- Theme: warm, friendly, colourful
- Icon: ⚖️
- Main focus: daily calorie target, diet deficit, exercise deficit, macros, timeline

Example title:

> A little food magic. A little movement.

Example caption:

> No extremes needed. Your plan gives both your meals and your routine a job, so progress can fit into real life.

## Theme Content Draft

Theme content should live in:

```text
frontend/src/data/planThemes.js
```

The file should export:

- `themeContent`
- `calorieCaptions`
- `timelineCaptions`

Each object should use these keys:

- `diet`
- `exercise`
- `balanced`

This makes the user feel:

> I picked this style, and CutSmart understands me.

## Sequential Text Reveal

Result screens should reveal content step by step:

1. Strategy icon appears first
2. Small eyebrow label appears
3. Title fades in
4. Caption fades in
5. Main metric or result card appears
6. Button appears last

The animation should be subtle, such as a short fade-in or slide-up. It should not delay the user for too long.

Suggested timing:

```text
Icon: immediately
Eyebrow: after 0.15s
Title: after 0.3s
Caption: after 0.45s
Main result: after 0.6s
Button: after 0.75s
```

The animation should reset when the result step changes.

## Design Direction

CutSmart should feel like a friendly, modern wellness app instead of a strict calorie calculator.

The design should make users feel encouraged and curious about their plan. It should avoid making weight loss feel stressful, punishing, or overly clinical.

The interface should feel:

- Clean and premium
- Friendly and encouraging
- Calm during form setup
- More exciting when revealing the personalised result
- Mobile-app inspired, even on desktop
- Simple enough that users always know what to do next

The main experience should use:

- Large headings
- Short, playful captions
- Rounded cards
- Clear progress indicators
- Soft gradients
- Gentle animations between steps
- One main action button per screen

## Suggested Frontend File Structure

For now, do not create three completely separate result pages.

Use:

```text
frontend/src/pages/Plan.jsx
frontend/src/components/ResultReveal.jsx
frontend/src/data/planThemes.js
```

The backend returns the same plan data structure for all three strategies, so the frontend only needs to change icon, title, caption, button text, colour theme, and some result screen wording.

Later, if the diet, exercise, and balanced experiences become very different, the app can split them into:

```text
frontend/src/components/results/DietResult.jsx
frontend/src/components/results/ExerciseResult.jsx
frontend/src/components/results/BalancedResult.jsx
```

## Future Features

Food logging, exercise logging and weight tracking with streaks are now implemented.
Still open:

- Estimated completion date and progress milestones
- Custom CutSmart illustrations or SVG icons instead of emoji
- Reports, profile and settings pages

## Current Development Priority

After the v1.0.0 launch, open frontend work is tracked as GitHub issues:

1. Show error messages where the user is looking, not only at the top of the page (#6)
2. Shorten long pages, especially on phones (#7)
3. Date inputs: no future dates; weight entries not before the journey start
