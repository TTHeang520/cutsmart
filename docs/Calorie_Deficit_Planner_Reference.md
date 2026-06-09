# CutSmart Calorie-Deficit Planner Reference

## Purpose

This document records the calculation rules, assumptions, and references used by the CutSmart calorie-deficit planner.

The goal is to make sure the backend logic is not random. Every major calculation should have a clear reason and, where possible, a supporting reference.

CutSmart version 1 focuses on weight loss planning. It gives estimated guidance only and should not be treated as medical advice.

## Version 1 Scope

Version 1 focuses on:

- Estimating the user's current BMI.
- Estimating the user's daily maintenance calories.
- Recommending a daily calorie target for weight loss.
- Calculating a recommended timeline instead of asking the user to enter one.
- Splitting the calorie deficit between diet and exercise based on the user's chosen strategy.
- Giving basic macronutrient guidance for protein, carbohydrates, and fat.

Version 1 does not decide the exact sport or workout the user must do. It only suggests how many calories should come from exercise/activity.

## User Input Fields

The planner uses these user inputs:

- `age`
- `gender`
- `height_cm`
- `current_weight_kg`
- `target_weight_kg`
- `exercise_habit`
- `strategy`

## BMI

BMI stands for Body Mass Index.

Formula:

```text
height_m = height_cm / 100
BMI = weight_kg / (height_m * height_m)
```

BMI categories for adults:

```text
BMI below 18.5      -> underweight
BMI 18.5 to 24.9    -> normal
BMI 25.0 to 29.9    -> overweight
BMI 30.0 and above  -> obese
```

CutSmart should calculate:

- current BMI
- current BMI category
- target BMI
- target BMI category

BMI is a screening estimate, not a full health diagnosis.

## BMR

BMR stands for Basal Metabolic Rate.

BMR means the estimated calories the body burns per day at rest. This includes basic body functions such as breathing, heartbeat, brain function, body temperature regulation, and organ function.

CutSmart version 1 uses the Mifflin-St Jeor equation.

Male:

```text
BMR = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
```

Female:

```text
BMR = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
```

## Maintenance Calories

Maintenance calories means the estimated number of calories a user needs per day to stay around the same weight.

Formula:

```text
maintenance_calories = BMR * activity_multiplier
```

For version 1, CutSmart maps `exercise_habit` to an activity multiplier:

```text
little_or_no_exercise -> 1.2
light_exercise        -> 1.375
moderate_exercise     -> 1.55
active_exercise       -> 1.725
very_active_exercise  -> 1.9
```

## Daily Calorie Deficit

CutSmart version 1 starts with a default daily deficit:

```text
daily_deficit = 500 kcal
```

Reason:

A 500 kcal/day deficit is a common starting point for weight loss planning and roughly estimates around 0.45 kg / 1 lb weight loss per week.

However, this should not be forced if it makes the user's target calories too low.

## Minimum Calorie Safety Floor

CutSmart version 1 uses a simple safety floor:

```text
female -> 1200 kcal/day
male   -> 1500 kcal/day
```

If:

```text
maintenance_calories - 500 < safety_floor
```

then CutSmart should reduce the daily deficit:

```text
daily_deficit = maintenance_calories - safety_floor
target_calories = safety_floor
```

The backend should return a warning explaining that the deficit was reduced because the target calories would be too low.

## Target Calories

Formula:

```text
target_calories = maintenance_calories - daily_deficit
```

## Recommended Timeline

CutSmart should calculate the timeline for the user instead of asking the user to enter a timeline.

Simplified estimate:

```text
1 kg body weight = about 7700 kcal
```

Formula:

```text
weight_to_lose_kg = current_weight_kg - target_weight_kg
total_deficit_needed = weight_to_lose_kg * 7700
recommended_timeline_days = total_deficit_needed / daily_deficit
recommended_timeline_weeks = recommended_timeline_days / 7
```

This is an estimate. Real progress can change due to water weight, adherence, metabolism changes, exercise changes, and other lifestyle factors.

## Strategy Split

The user chooses one strategy:

```text
diet
exercise
balanced
```

CutSmart splits the final daily deficit based on the chosen strategy:

```text
diet     -> 80% diet, 20% exercise
balanced -> 60% diet, 40% exercise
exercise -> 40% diet, 60% exercise
```

Example for 500 kcal/day deficit:

```text
diet:
  diet_deficit = 400
  exercise_deficit = 100

balanced:
  diet_deficit = 300
  exercise_deficit = 200

exercise:
  diet_deficit = 200
  exercise_deficit = 300
```

## Macronutrient Guidance

CutSmart should not only show calories. It should also give simple macro guidance so users do not think any food choice is fine as long as calories are low.

Version 1 macro rules:

```text
protein_g = current_weight_kg * 1.2
fat_g = (target_calories * 0.25) / 9
carbs_g = remaining_calories / 4
```

Supporting calorie conversions:

```text
protein = 4 kcal per gram
carbohydrate = 4 kcal per gram
fat = 9 kcal per gram
```

Calculation order:

```text
protein_calories = protein_g * 4
fat_calories = fat_g * 9
remaining_calories = target_calories - protein_calories - fat_calories
carbs_g = remaining_calories / 4
```

These are basic nutrition targets, not a strict meal plan.

## Validation And Warnings

CutSmart should reject or warn for unsafe or invalid inputs.

Invalid weight-loss goal:

```text
target_weight_kg >= current_weight_kg
```

Response should explain that version 1 only supports weight loss.

Underweight target warning:

```text
target_bmi < 18.5
```

Response should warn that the target weight may result in an underweight BMI.

Low calorie warning:

```text
target_calories <= safety_floor
```

Response should explain that the plan has reached the minimum calorie safety floor.

## References

### BMI

CDC Adult BMI Categories  
https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html

Used for BMI category thresholds.

### BMR

Mifflin-St Jeor equation paper  
https://pubmed.ncbi.nlm.nih.gov/2305711/

Used for estimating resting energy expenditure / BMR from weight, height, age, and gender.

### 500 kcal Deficit

MedlinePlus: 10 ways to cut 500 calories a day  
https://medlineplus.gov/ency/patientinstructions/000892.htm

Used to support 500 kcal/day as a common starting point for weight loss planning.

### Safety Floor

MedlinePlus: Diet for rapid weight loss  
https://medlineplus.gov/ency/patientinstructions/000885.htm

Used to support the basic low-calorie diet range of about 1200 to 1500 kcal/day for women and 1500 to 1800 kcal/day for men.

### Macronutrient Ranges

Dietary Guidelines for Americans / Acceptable Macronutrient Distribution Range  
https://www.dietaryguidelines.gov/

Used to support the idea that calorie plans should also consider carbohydrates, protein, and fat.

## Limitations

CutSmart gives estimated planning guidance only.

It does not replace advice from a doctor, dietitian, trainer, or other qualified professional.

The calculations are simplified and may not fit every user, especially users who are pregnant, under 18, elderly, highly athletic, have medical conditions, or have a history of eating disorders.
