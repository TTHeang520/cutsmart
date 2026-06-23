# CutSmart Frontend User Flow and Design Direction

## Purpose

This document describes the current frontend experience for CutSmart.

The first version focuses on helping a user generate a personalised calorie-deficit plan based on body information, activity level, preferred strategy, and desired timeline.

## Current Completed Features

- User registration
- User login
- Dashboard page
- Protected plan page
- Multi-step plan setup form
- Backend connection to `POST /api/plan`
- Personalised calorie plan result
- BMI, BMR, maintenance calories, calorie target, deficits, macros, and timeline display

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

The user chooses current weight in kilograms. A slider makes the experience simple and visual.

### Step 4: Target Weight

The user chooses target weight in kilograms. The backend checks that target weight is lower than current weight.

### Step 5: Movement Rhythm

The user selects their normal exercise habit:

- Little or no exercise
- Light exercise
- Moderate exercise
- Active exercise
- Very active exercise

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

### Food Logging

Users can enter food they eat during the day. The system can show calories eaten, remaining daily calories, and whether the user is above or below target.

### Exercise Logging

Users can record walking, running, gym workouts, cycling, or sports. The app can estimate calories burned and compare it with the exercise part of the plan.

### Progress Tracking

Users can update their weight weekly. The app can later show weight trends, progress toward target weight, estimated completion date, streaks, and milestones.

### Personalised Icons and Illustrations

The current version can use emoji icons. Later versions may use custom CutSmart illustrations or SVG icons for strategy types, food logging, progress milestones, and celebrations.

## Current Development Priority

1. Add onboarding screen
2. Improve wizard transitions
3. Add automatic next-step behaviour for option cards
4. Add strategy-based result themes
5. Add sequential text reveal in the result screen
6. Improve result page visuals
7. Test the complete frontend-to-backend plan flow

Food logging and progress tracking should be developed after the core plan-generation flow is stable.
