# CutSmart API Contract

This document describes the backend API routes that the frontend should call.

## Base URL

Local backend URL:

```text
http://127.0.0.1:5000
```

Example full routes:

```text
http://127.0.0.1:5000/api/register
http://127.0.0.1:5000/api/login
http://127.0.0.1:5000/api/plan
```

## Register

Route:

```text
POST /api/register
```

### Request

Frontend should send JSON with these exact key names:

```json
{
  "username": "wj",
  "email": "wj@example.com",
  "password": "123456"
}
```

### For Success Response

```json
{
  "success": true,
  "message": "Registered successfully"
}
```

### For Error Responses

Missing field:

```json
{
  "success": false,
  "message": "Username, email, and password are required"
}
```

Duplicate email:

```json
{
  "success": false,
  "message": "Email already registered"
}
```

## Login

Route:

```text
POST /api/login
```

### Request

Frontend should send JSON with these exact key names:

```json
{
  "email": "wj@example.com",
  "password": "123456"
}
```

### For Success Response

```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "wj",
    "email": "wj@example.com"
  }
}
```

### For Error Responses

Missing field:

```json
{
  "success": false,
  "message": "Email and password are required"
}
```

Wrong email or password:

```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

## Generate Plan

Route:

```text
POST /api/plan
```

This route is for the first version of the CutSmart calorie-deficit planner.

The user may send an optional desired timeline. If the user does not send a timeline, the backend should calculate a recommended timeline. If the user sends a timeline, the backend should check whether it is realistic and safe before accepting it.

### Request

Frontend should send JSON with these exact key names:

```json
{
  "age": 22,
  "gender": "male",
  "height_cm": 175,
  "current_weight_kg": 80,
  "target_weight_kg": 72,
  "daily_activity_level": "light_daily_movement",
  "strategy": "balanced",
  "desired_timeline_weeks": 16
}
```

### Request Field Notes

`age` should be a number.

`gender` should be one of:

```text
male
female
```

`height_cm`, `current_weight_kg`, and `target_weight_kg` should be numbers.

`daily_activity_level` describes the user's normal movement outside planned workouts.

Allowed daily activity level values:

```text
mostly_sitting
light_daily_movement
on_feet_often
physical_daily_routine
```

`strategy` should be one of:

```text
diet
exercise
balanced
```

`desired_timeline_weeks` is optional. If it is not sent, the backend calculates `recommended_timeline_weeks` using the default plan.

`timeline_status` in the response should be one of:

```text
not_provided
accepted
adjusted
```

### For Success Response

Example response shape:

```json
{
  "success": true,
  "message": "Plan generated successfully",
  "plan": {
    "current_bmi": 26.1,
    "current_bmi_category": "overweight",
    "target_bmi": 23.5,
    "target_bmi_category": "normal",
    "bmr": 1755,
    "activity_multiplier": 1.3,
    "maintenance_calories": 2325,
    "target_calories": 1995,
    "daily_deficit": 550,
    "diet_deficit": 330,
    "exercise_deficit": 220,
    "estimated_weight_loss_kg_per_week": 0.5,
    "desired_timeline_weeks": 16,
    "recommended_timeline_weeks": 16,
    "timeline_status": "accepted",
    "protein_g": 96,
    "carbs_g": 278,
    "fat_g": 55,
    "strategy": "balanced",
    "daily_activity_level": "light_daily_movement",
    "alternative_plan": null,
    "warning": null
  }
}
```

### For Error Responses

Missing field:

```json
{
  "success": false,
  "message": "Age, gender, height, current weight, target weight, exercise habit, and strategy are required"
}
```

Invalid exercise habit:

```json
{
  "success": false,
  "message": "Invalid exercise habit"
}
```

Invalid strategy:

```json
{
  "success": false,
  "message": "Invalid strategy"
}
```

Invalid weight goal:

```json
{
  "success": false,
  "message": "Target weight must be lower than current weight for a weight-loss plan"
}
```

Invalid desired timeline:

```json
{
  "success": false,
  "message": "Desired timeline must be a positive number"
}
```

### Planner Notes

- Version 1 focuses on weight loss only.
- The backend returns BMI together with the calorie plan.
- The activity multiplier represents normal daily movement outside planned workouts. Planned exercise is returned separately as `exercise_deficit` to avoid double counting.
- The backend returns BMR and activity multiplier so the frontend can explain how maintenance calories were estimated.
- Version 1 macro guidance returns estimated `protein_g`, `carbs_g`, and `fat_g`.
- `desired_timeline_weeks` is optional. The backend should accept it only if the required daily deficit is not too aggressive and target calories do not fall below the safety floor.
- If the desired timeline is accepted, `recommended_timeline_weeks` can match `desired_timeline_weeks` and `timeline_status` should be `accepted`.
- `timeline_status` should explain whether the timeline was not provided, accepted, adjusted for being too fast, adjusted for low calories, or accepted as a slow plan.
- If the desired timeline is not accepted for safety reasons, the backend should still return a safer plan with `success: true`, `recommended_timeline_weeks`, `timeline_status`, and a warning message.
- If the desired timeline is too fast but there is a faster safe option than the default plan, the backend may also return `alternative_plan`. The frontend can show this as an optional faster plan later.
- Full formulas and references are recorded in `docs/Calorie_Deficit_Planner_Reference.md`.
- The planner gives estimated guidance only. It should not claim to replace medical or professional health advice.

## Some Notes For Frontend

- Register and login must use `POST` to get users data.
- Generate plan must use `POST`.
- Save plan must use `POST`.
- Fetch latest saved plan must use `GET`.
- Send request data as JSON.
- Use the exact key names shown in this document.
- `id` is not needed from frontend. The backend creates and returns it.
- The backend wont return the password or password hash.

## Save Plan

Route:

```text
POST /api/plans/save
```

This route saves a generated plan for a logged-in user.

The frontend should call this after `POST /api/plan` returns a successful generated plan.

### Request

Frontend should send JSON with these exact top-level key names:

```json
{
  "user_id": 1,
  "input_data": {
    "age": 22,
    "gender": "male",
    "height_cm": 175,
    "current_weight_kg": 80,
    "target_weight_kg": 72,
    "daily_activity_level": "light_daily_movement",
    "strategy": "balanced",
    "desired_timeline_weeks": 16
  },
  "plan_result": {
    "current_bmi": 26.1,
    "current_bmi_category": "overweight",
    "target_bmi": 23.5,
    "target_bmi_category": "normal",
    "bmr": 1755,
    "activity_multiplier": 1.3,
    "maintenance_calories": 2325,
    "target_calories": 1995,
    "daily_deficit": 550,
    "diet_deficit": 330,
    "exercise_deficit": 220,
    "estimated_weight_loss_kg_per_week": 0.5,
    "desired_timeline_weeks": 16,
    "recommended_timeline_weeks": 16,
    "timeline_status": "accepted",
    "protein_g": 96,
    "carbs_g": 278,
    "fat_g": 55,
    "strategy": "balanced",
    "daily_activity_level": "light_daily_movement",
    "alternative_plan": null,
    "warning": null
  }
}
```

### Request Field Notes

`user_id` should be the logged-in user's `id` from the login response.

`input_data` should contain the original form data used to generate the plan.

`plan_result` should contain the generated plan returned by `POST /api/plan`.

The backend requires these `input_data` fields:

```text
age
gender
height_cm
current_weight_kg
target_weight_kg
daily_activity_level
strategy
```

The backend requires these `plan_result` fields:

```text
current_bmi
current_bmi_category
target_bmi
target_bmi_category
bmr
activity_multiplier
maintenance_calories
target_calories
daily_deficit
diet_deficit
exercise_deficit
estimated_weight_loss_kg_per_week
recommended_timeline_weeks
timeline_status
protein_g
carbs_g
fat_g
```

`desired_timeline_weeks`, `alternative_plan`, and `warning` may be empty depending on the generated plan.

### For Success Response

```json
{
  "success": true,
  "message": "Plan saved successfully"
}
```

### For Error Responses

Missing JSON body:

```json
{
  "success": false,
  "message": "Request body must be JSON"
}
```

Missing top-level data:

```json
{
  "success": false,
  "message": "User id, input data, and plan result are required"
}
```

Missing input fields:

```json
{
  "success": false,
  "message": "Input data is missing required fields"
}
```

Missing plan result fields:

```json
{
  "success": false,
  "message": "Plan result is missing required fields"
}
```

## Fetch Latest Saved Plan

Route:

```text
GET /api/plans/latest/<user_id>
```

Example full route:

```text
http://127.0.0.1:5000/api/plans/latest/1
```

This route returns the newest saved plan for one user.

The backend uses the saved plan's `created_at` value to sort newest first.

### For Success Response

```json
{
  "success": true,
  "message": "Latest plan fetched successfully",
  "plan": {
    "id": 1,
    "user_id": 1,
    "age": 22,
    "gender": "male",
    "height_cm": 175,
    "current_weight_kg": 80,
    "target_weight_kg": 72,
    "daily_activity_level": "light_daily_movement",
    "strategy": "balanced",
    "desired_timeline_weeks": 16,
    "current_bmi": 26.1,
    "current_bmi_category": "overweight",
    "target_bmi": 23.5,
    "target_bmi_category": "normal",
    "bmr": 1755,
    "activity_multiplier": 1.3,
    "maintenance_calories": 2325,
    "target_calories": 1995,
    "daily_deficit": 550,
    "diet_deficit": 330,
    "exercise_deficit": 220,
    "estimated_weight_loss_kg_per_week": 0.5,
    "recommended_timeline_weeks": 16,
    "timeline_status": "accepted",
    "protein_g": 96,
    "carbs_g": 278,
    "fat_g": 55,
    "alternative_plan": null,
    "warning": null,
    "created_at": "2026-06-24 17:48:30"
  }
}
```

If there is no alternative plan, `alternative_plan` returns `null`.

### For Error Responses

No saved plan:

```json
{
  "success": false,
  "message": "No saved plan found"
}
```

## Weight Log

Weight Log allows a registered user to record body weight by date.

A user can have one weight record per date. Sending another weight for the same user and date updates the existing record.

## Create Or Update Weight

Route:

```text
POST /api/weights
```

### Request

```json
{
  "user_id": 1,
  "weight_kg": 77.9,
  "logged_date": "2026-06-30"
}
```

### Request Field Notes

`user_id` must be the logged-in user's ID.

`weight_kg` must be a positive number.

`logged_date` must be a real date using `YYYY-MM-DD` format.

If the user already has a weight record for that date, the backend updates its `weight_kg` and `updated_at` values.

### For Success Response

```json
{
  "success": true,
  "message": "Weight recorded successfully",
  "weight": {
    "user_id": 1,
    "weight_kg": 77.9,
    "logged_date": "2026-06-30"
  }
}
```

### For Error Responses

Missing fields:

```json
{
  "success": false,
  "message": "User id, weight, and logged date are required"
}
```

Invalid number:

```json
{
  "success": false,
  "message": "User id and weight must be numbers"
}
```

Invalid positive value:

```json
{
  "success": false,
  "message": "User id and weight must be positive"
}
```

Invalid or nonexistent date:

```json
{
  "success": false,
  "message": "Logged date must be a real date in YYYY-MM-DD format"
}
```

Incorrect date formatting:

```json
{
  "success": false,
  "message": "Logged date must use YYYY-MM-DD format"
}
```

User not found:

```json
{
  "success": false,
  "message": "User not found"
}
```

## Fetch Weight History

Route:

```text
GET /api/weights/history/<user_id>
```

Example full route:

```text
http://127.0.0.1:5000/api/weights/history/1
```

This route returns all weight records belonging to one user, ordered by `logged_date` from newest to oldest.

### For Success Response

```json
{
  "success": true,
  "message": "Weight history fetched successfully",
  "history": [
    {
      "id": 11,
      "user_id": 1,
      "weight_kg": 77.9,
      "logged_date": "2026-06-30",
      "created_at": "2026-07-01 13:19:50",
      "updated_at": "2026-07-01 13:24:22"
    }
  ]
}
```

If there are no records, the request still succeeds and returns an empty list:

```json
{
  "success": true,
  "message": "Weight history fetched successfully",
  "history": []
}
```

## Fetch Latest Weight

Route:

```text
GET /api/weights/latest/<user_id>
```

Example full route:

```text
http://127.0.0.1:5000/api/weights/latest/1
```

This route returns the user's newest weight record according to `logged_date`.

### For Success Response

```json
{
  "success": true,
  "message": "Latest weight fetched successfully",
  "latest": {
    "id": 11,
    "user_id": 1,
    "weight_kg": 77.9,
    "logged_date": "2026-06-30",
    "created_at": "2026-07-01 13:19:50",
    "updated_at": "2026-07-01 13:24:22"
  }
}
```

### For Error Responses

No weight record found:

```json
{
  "success": false,
  "message": "No weight found"
}
```
