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

The user does not send a timeline. The backend should calculate a recommended timeline for the user instead, because user-entered timelines may be unrealistic.

### Request

Frontend should send JSON with these exact key names:

```json
{
  "age": 22,
  "gender": "male",
  "height_cm": 175,
  "current_weight_kg": 80,
  "target_weight_kg": 72,
  "exercise_habit": "light_exercise",
  "strategy": "balanced"
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

`exercise_habit` describes how often or intensely the user usually exercises.

Suggested exercise habit values:

```text
little_or_no_exercise
light_exercise
moderate_exercise
active_exercise
very_active_exercise
```

`strategy` should be one of:

```text
diet
exercise
balanced
```

### For Success Response

Example response shape:

```json
{
  "success": true,
  "message": "Plan generated successfully",
  "plan": {
    "maintenance_calories": 2400,
    "target_calories": 1900,
    "daily_deficit": 500,
    "diet_deficit": 300,
    "exercise_deficit": 200,
    "estimated_weight_loss_kg_per_week": 0.45,
    "recommended_timeline_weeks": 18,
    "strategy": "balanced",
    "exercise_habit": "light_exercise",
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

### Planner Notes

- Version 1 focuses on weight loss only.
- The backend calculates the recommended timeline instead of receiving `timeline_weeks` from the frontend.
- The calculation formula and health/safety references should be recorded separately in the calorie-deficit planner reference document before implementation.
- The planner gives estimated guidance only. It should not claim to replace medical or professional health advice.

## Some Notes For Frontend

- Register and login must use `POST` to get users data.
- Generate plan must use `POST`.
- Send request data as JSON.
- Use the exact key names shown in this document.
- `id` is not needed from frontend. The backend creates and returns it.
- The backend wont return the password or password hash.
