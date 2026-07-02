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

## Fetch Weight By Date

Route:

```text
GET /api/weights/<user_id>?date=<YYYY-MM-DD>
```

Example full route:

```text
http://127.0.0.1:5000/api/weights/1?date=2026-06-30
```

`user_id` is a path parameter. `date` is a query parameter.

### For Success Response

```json
{
  "success": true,
  "message": "Weight fetched successfully",
  "date": "2026-06-30",
  "weight": {
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

Missing date query parameter:

```json
{
  "success": false,
  "message": "Date query parameter is required"
}
```

No weight for that date:

```json
{
  "success": false,
  "message": "No weight found for this date"
}
```

## Food Log

Food Log allows users to record individual foods and calories as dated diary entries.

Required fields are `user_id`, `food_name`, `calories`, `meal_type`, `logged_date`, and `logged_time`.

Optional fields are `protein_g`, `carbs_g`, `fat_g`, and `notes`. Unknown optional values return `null`.

`photo_path` is reserved for the future photo-upload feature. It currently returns `null` because photo uploading is not implemented yet.

Allowed meal types:

```text
breakfast
lunch
dinner
snack
```

## Create Food Entry

Route:

```text
POST /api/foods
```

### Request

```json
{
  "user_id": 1,
  "food_name": "Chicken rice",
  "calories": 650,
  "meal_type": "lunch",
  "logged_date": "2026-07-02",
  "logged_time": "12:30",
  "protein_g": 32,
  "carbs_g": 75,
  "fat_g": 20,
  "notes": "Less rice"
}
```

`logged_date` must use `YYYY-MM-DD`. `logged_time` must use zero-padded 24-hour `HH:MM` format.

Macros and notes may be omitted:

```json
{
  "user_id": 1,
  "food_name": "Banana",
  "calories": 105,
  "meal_type": "snack",
  "logged_date": "2026-07-02",
  "logged_time": "15:05"
}
```

### For Success Response

```json
{
  "success": true,
  "message": "Food recorded successfully",
  "food": {
    "user_id": 1,
    "food_name": "Chicken rice",
    "calories": 650.0,
    "meal_type": "lunch",
    "logged_date": "2026-07-02",
    "logged_time": "12:30",
    "protein_g": 32.0,
    "carbs_g": 75.0,
    "fat_g": 20.0,
    "notes": "Less rice",
    "photo_path": null
  }
}
```

### For Error Responses

Common errors include:

```json
{
  "success": false,
  "message": "User id, food name, calories, meal type, date, and time are required"
}
```

```json
{
  "success": false,
  "message": "Invalid meal type"
}
```

```json
{
  "success": false,
  "message": "Logged time must use HH:MM format"
}
```

```json
{
  "success": false,
  "message": "Macro values cannot be negative"
}
```

```json
{
  "success": false,
  "message": "User not found"
}
```

## Fetch Food History

Route:

```text
GET /api/foods/history/<user_id>
```

Example full route:

```text
http://127.0.0.1:5000/api/foods/history/1
```

This route returns all food entries for one user, ordered by newest date and time first.

### For Success Response

```json
{
  "success": true,
  "message": "Food history fetched successfully",
  "history": [
    {
      "id": 5,
      "user_id": 1,
      "food_name": "Banana",
      "calories": 105.0,
      "meal_type": "snack",
      "logged_date": "2026-07-02",
      "logged_time": "15:05",
      "protein_g": null,
      "carbs_g": null,
      "fat_g": null,
      "notes": null,
      "photo_path": null,
      "created_at": "2026-07-02 07:05:00",
      "updated_at": "2026-07-02 07:05:00"
    }
  ]
}
```

If there are no records, `history` returns an empty list.

## Fetch Foods By Date

Route:

```text
GET /api/foods/<user_id>?date=<YYYY-MM-DD>
```

Example full route:

```text
http://127.0.0.1:5000/api/foods/1?date=2026-07-02
```

`user_id` is a path parameter. `date` is a query parameter.

Food entries are ordered by `logged_time` from earliest to latest. The response also includes the number of entries and total calories for that date.

### For Success Response

```json
{
  "success": true,
  "message": "Food logs fetched successfully",
  "date": "2026-07-02",
  "foods": [
    {
      "id": 4,
      "user_id": 1,
      "food_name": "Chicken rice",
      "calories": 650.0,
      "meal_type": "lunch",
      "logged_date": "2026-07-02",
      "logged_time": "12:30",
      "protein_g": 32.0,
      "carbs_g": 75.0,
      "fat_g": 20.0,
      "notes": "Less rice",
      "photo_path": null,
      "created_at": "2026-07-02 04:30:00",
      "updated_at": "2026-07-02 04:30:00"
    }
  ],
  "summary": {
    "entry_count": 1,
    "total_calories": 650.0
  }
}
```

An empty date returns `foods: []`, `entry_count: 0`, and `total_calories: 0`.

## Update Food Entry

Route:

```text
PUT /api/foods/<food_id>
```

Example full route:

```text
http://127.0.0.1:5000/api/foods/4
```

The request must contain the full edited food entry. Both `food_id` and `user_id` must match the stored record.

### Request

```json
{
  "user_id": 1,
  "food_name": "Large chicken rice",
  "calories": 720,
  "meal_type": "lunch",
  "logged_date": "2026-07-02",
  "logged_time": "12:45",
  "protein_g": 35,
  "notes": "Larger portion"
}
```

### For Success Response

```json
{
  "success": true,
  "message": "Food entry updated successfully",
  "food": {
    "id": 4,
    "user_id": 1,
    "food_name": "Large chicken rice",
    "calories": 720.0,
    "meal_type": "lunch",
    "logged_date": "2026-07-02",
    "logged_time": "12:45",
    "protein_g": 35.0,
    "carbs_g": null,
    "fat_g": null,
    "notes": "Larger portion"
  }
}
```

If the food entry does not exist or does not belong to `user_id`:

```json
{
  "success": false,
  "message": "Food entry not found"
}
```

## Delete Food Entry

Route:

```text
DELETE /api/foods/<food_id>
```

### Request

```json
{
  "user_id": 1
}
```

Both `food_id` and `user_id` must match before the entry is deleted.

### For Success Response

```json
{
  "success": true,
  "message": "Food entry deleted successfully"
}
```

If the food entry does not exist or belongs to another user:

```json
{
  "success": false,
  "message": "Food entry not found"
}
```

## Exercise Log

Exercise Log allows users to record individual exercises and calories burned as dated diary entries.

Required fields are `user_id`, `exercise_name`, `duration_minutes`, `calories_burned`, `logged_date`, `logged_time`.

Optional fields are `notes`.

## Create Exercise Entry

Route:

```text
POST /api/exercises
```

### Request

```json
{
  "user_id": 1,
  "exercise_name": "Running",
  "duration_minutes": 30,
  "calories_burned": 300,
  "logged_date": "2026-07-02",
  "logged_time": "12:30",
  "notes": "Slow pace run"
}
```

`duration_minutes` and `calories_burned` must be positive numbers.

`logged_date` must use `YYYY-MM-DD`.

`logged_time` must use zero-padded 24-hour `HH:MM` format.

`notes` is optional. If omitted, it returns `null`.

```json
{
  "user_id": 1,
  "exercise_name": "Running",
  "duration_minutes": 30,
  "calories_burned": 300,
  "logged_date": "2026-07-02",
  "logged_time": "12:30"
}
```

### For Success Response

```json
{
   "success": true,
   "message": "Exercise recorded successfully",
   "exercise": {
      "user_id": 1,
      "exercise_name": "Running",
      "duration_minutes": 30,
      "calories_burned": 300,
      "logged_date": "2026-07-02",
      "logged_time": "12:30",
      "notes": "Slow pace run"
   }
}
```

### For Error Responses

Common errors include:

```json
{
  "success": false,
  "message": "Request body must be JSON"
}
```

```json
{
   "success": false,
   "message": "User id, exercise name, duration, calories burned, date, and time are required"
}
```

```json
{
  "success": false,
  "message": "User id, duration, and calories burned must be numbers"
}
```

```json
{
   "success": false,
   "message": "User id, duration, and calories burned must be positive"
}
```

```json
{
  "success": false,
  "message": "Logged date must be a real date in YYYY-MM-DD format"
}
```

```json
{
   "success": false,
   "message": "Logged date must use YYYY-MM-DD format"
}
```

```json
{
  "success": false,
  "message": "Logged time must be a real time in HH:MM format"
}
```

```json
{
  "success": false,
  "message": "Logged time must use HH:MM format"
}
```

```json
{
  "success": false,
  "message": "User not found"
}
```

## Fetch Exercise History

Route:

```text
GET /api/exercises/history/<user_id>
```

Example full route:

```text
http://127.0.0.1:5000/api/exercises/history/1
```

This route returns all exercise entries for one user, ordered by newest date and time first.

### For Success Response

```json
{
  "success": true,
  "message": "Exercise history fetched successfully",
  "history": [
    {
      "id": 3,
      "user_id": 1,
      "exercise_name": "Running",
      "duration_minutes": 30.0,
      "calories_burned": 300.0,
      "logged_date": "2026-07-02",
      "logged_time": "12:30",
      "notes": "Slow pace run",
      "created_at": "2026-07-03 00:52:42",
      "updated_at": "2026-07-03 00:52:42"
    }
  ]
}
```

If the user has no exercise records, the route still succeeds with an empty list:

```json
{
  "success": true,
  "message": "Exercise history fetched successfully",
  "history": []
}
```

## Fetch Exercises By Date

Route:

```text
GET /api/exercises/<user_id>?date=<YYYY-MM-DD>
```

Example full route:

```text
http://127.0.0.1:5000/api/exercises/1?date=2026-07-02
```

`user_id` is a path parameter. `date` is a query parameter.

Exercise entries are ordered by `logged_time` from earliest to latest. The response includes total entries, exercise duration, and calories burned for the selected date.

### For Success Response

```json
{
  "success": true,
  "message": "Exercise logs fetched successfully",
  "date": "2026-07-02",
  "exercises": [
    {
      "id": 3,
      "user_id": 1,
      "exercise_name": "Running",
      "duration_minutes": 30.0,
      "calories_burned": 300.0,
      "logged_date": "2026-07-02",
      "logged_time": "12:30",
      "notes": "Slow pace run",
      "created_at": "2026-07-03 00:52:42",
      "updated_at": "2026-07-03 00:52:42"
    }
  ],
  "summary": {
    "entry_count": 1,
    "total_duration_minutes": 30.0,
    "total_calories_burned": 300.0
  }
}
```

An empty date returns:

```json
{
  "success": true,
  "message": "Exercise logs fetched successfully",
  "date": "2026-01-01",
  "exercises": [],
  "summary": {
    "entry_count": 0,
    "total_duration_minutes": 0,
    "total_calories_burned": 0
  }
}
```

### For Error Responses

Missing date query parameter:

```json
{
  "success": false,
  "message": "Date query parameter is required"
}
```

Invalid date:

```json
{
  "success": false,
  "message": "Date must be a real date in YYYY-MM-DD format"
}
```

## Update Exercise Entry

Route:

```text
PUT /api/exercises/<exercise_id>
```

Example full route:

```text
http://127.0.0.1:5000/api/exercises/3
```

The request must contain the full edited exercise entry. Both `exercise_id` and `user_id` must match the stored record.

### Request

```json
{
  "user_id": 1,
  "exercise_name": "Cycling",
  "duration_minutes": 40,
  "calories_burned": 240,
  "logged_date": "2026-07-02",
  "logged_time": "13:15",
  "notes": "Updated workout"
}
```

The update route applies the same required-field, number, date, and time validation as the create route.

### For Success Response

```json
{
  "success": true,
  "message": "Exercise entry updated successfully",
  "exercise": {
    "id": 3,
    "user_id": 1,
    "exercise_name": "Cycling",
    "duration_minutes": 40.0,
    "calories_burned": 240.0,
    "logged_date": "2026-07-02",
    "logged_time": "13:15",
    "notes": "Updated workout"
  }
}
```

If the entry does not exist or does not belong to `user_id`:

```json
{
  "success": false,
  "message": "Exercise entry not found"
}
```

## Delete Exercise Entry

Route:

```text
DELETE /api/exercises/<exercise_id>
```

Example full route:

```text
http://127.0.0.1:5000/api/exercises/3
```

### Request

```json
{
  "user_id": 1
}
```

Both `exercise_id` and `user_id` must match before the entry is deleted.

### For Success Response

```json
{
  "success": true,
  "message": "Exercise entry deleted successfully"
}
```

### For Error Responses

Missing user ID:

```json
{
  "success": false,
  "message": "User id is required"
}
```

If the entry does not exist or belongs to another user:

```json
{
  "success": false,
  "message": "Exercise entry not found"
}
```
