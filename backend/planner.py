def calculate_bmi(weight_kg, height_cm):
    height_m = height_cm / 100
    bmi = weight_kg / (height_m * height_m)
    return round(bmi, 1)

def get_bmi_category(bmi):
    if bmi < 18.5:
        return "underweight"
    elif bmi < 25:
        return "normal"
    elif bmi < 30:
        return "overweight"
    else:
        return "obese"
    
def calculate_bmr(gender, age, weight_kg, height_cm):
    if gender == "male":
        return 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    elif gender == "female":
        return 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
    else:
        return None
    
def get_activity_multiplier(exercise_habit):
    if exercise_habit == "little_or_no_exercise" :
        return 1.2
    elif exercise_habit == "light_exercise":
        return 1.375
    elif exercise_habit == "moderate_exercise":
        return 1.55
    elif exercise_habit == "active_exercise":
        return 1.725
    elif exercise_habit == "very_active_exercise":
        return 1.9
    else:
        return None

def calculate_maintenance_calories(exercise_habit, bmr):
    activity_multiplier = get_activity_multiplier(exercise_habit)

    if activity_multiplier is None:
        return None

    return bmr * activity_multiplier

def calculate_daily_deficit(maintenance_calories, gender):
    default_deficit = 500

    if gender == "female":
        safety_floor = 1200
    elif gender == "male":
        safety_floor = 1500
    else:
        return None

    target_calories = maintenance_calories - default_deficit

    if target_calories < safety_floor:
        return maintenance_calories - safety_floor

    return default_deficit

def split_deficit_by_strategy(daily_deficit, strategy):
    if strategy == "diet":
        diet_deficit = daily_deficit * 0.8
        exercise_deficit = daily_deficit * 0.2
    elif strategy == "balanced":
        diet_deficit = daily_deficit * 0.6
        exercise_deficit = daily_deficit * 0.4
    elif strategy == "exercise":
        diet_deficit = daily_deficit * 0.4
        exercise_deficit = daily_deficit * 0.6
    else:
        return None

    return {
        "diet_deficit": round(diet_deficit),
        "exercise_deficit": round(exercise_deficit)
    }

def calculate_target_calories(maintenance_calories, diet_deficit):
    return round(maintenance_calories - diet_deficit)

def calculate_macros(target_calories, current_weight_kg):
    protein_g = current_weight_kg * 1.2
    protein_calories = protein_g * 4

    fat_calories = target_calories * 0.25
    fat_g = fat_calories / 9

    remaining_calories = target_calories - protein_calories - fat_calories
    carbs_g = remaining_calories / 4

    return {
        "protein_g": round(protein_g),
        "carbs_g": round(carbs_g),
        "fat_g": round(fat_g)
    }

def calculate_recommended_timeline(current_weight_kg, target_weight_kg, daily_deficit):
    weight_to_lose_kg = current_weight_kg - target_weight_kg
    total_deficit_needed = weight_to_lose_kg * 7700
    recommended_timeline_days = total_deficit_needed / daily_deficit
    recommended_timeline_weeks = recommended_timeline_days / 7

    return round(recommended_timeline_weeks)

def calculate_deficit_from_timeline(current_weight_kg, target_weight_kg, desired_timeline_weeks):
    weight_to_lose_kg = current_weight_kg - target_weight_kg
    total_deficit_needed = weight_to_lose_kg * 7700
    desired_timeline_days = desired_timeline_weeks * 7
    required_daily_deficit = total_deficit_needed / desired_timeline_days

    return round(required_daily_deficit)

def generate_plan(data):
    age = data["age"]
    gender = data["gender"]
    height_cm = data["height_cm"]
    current_weight_kg = data["current_weight_kg"]
    target_weight_kg = data["target_weight_kg"]
    exercise_habit = data["exercise_habit"]
    strategy = data["strategy"]
    desired_timeline_weeks = data.get("desired_timeline_weeks")

    current_bmi = calculate_bmi(current_weight_kg, height_cm)
    target_bmi = calculate_bmi(target_weight_kg, height_cm)

    bmr = calculate_bmr(gender, age, current_weight_kg, height_cm)
    activity_multiplier = get_activity_multiplier(exercise_habit)
    maintenance_calories = calculate_maintenance_calories(exercise_habit, bmr)

    daily_deficit = calculate_daily_deficit(maintenance_calories, gender)
    timeline_status = "not_provided"
    warning = None
    alternative_plan = None

    if gender == "female":
        safety_floor = 1200
    elif gender == "male":
        safety_floor = 1500
    else:
        return None

    if desired_timeline_weeks is not None:
        required_daily_deficit = calculate_deficit_from_timeline(
            current_weight_kg,
            target_weight_kg,
            desired_timeline_weeks
        )

        max_safe_deficit = min(1000, maintenance_calories - safety_floor)

        if required_daily_deficit <= max_safe_deficit:
            daily_deficit = required_daily_deficit
            timeline_status = "accepted"
        else:
            timeline_status = "adjusted"
            warning = "Requested timeline is too fast. A steady plan was returned instead."

            if max_safe_deficit > daily_deficit:
                warning = "Requested timeline is too fast. A steady plan was returned with a faster safe option."
                alternative_plan = {
                    "plan_type": "fastest_safe",
                    "daily_deficit": round(max_safe_deficit),
                    "recommended_timeline_weeks": calculate_recommended_timeline(
                        current_weight_kg,
                        target_weight_kg,
                        max_safe_deficit
                    )
                }

    if daily_deficit <= 0:
        return None

    deficit_split = split_deficit_by_strategy(daily_deficit, strategy)

    if deficit_split is None:
        return None

    diet_deficit = deficit_split["diet_deficit"]
    exercise_deficit = deficit_split["exercise_deficit"]

    target_calories = calculate_target_calories(maintenance_calories, diet_deficit)
    recommended_timeline_weeks = calculate_recommended_timeline(
        current_weight_kg,
        target_weight_kg,
        daily_deficit
    )
    estimated_weight_loss_kg_per_week = (daily_deficit * 7) / 7700
    macros = calculate_macros(target_calories, current_weight_kg)

    return {
        "current_bmi": current_bmi,
        "current_bmi_category": get_bmi_category(current_bmi),
        "target_bmi": target_bmi,
        "target_bmi_category": get_bmi_category(target_bmi),
        "bmr": round(bmr),
        "activity_multiplier": activity_multiplier,
        "maintenance_calories": round(maintenance_calories),
        "target_calories": target_calories,
        "daily_deficit": round(daily_deficit),
        "diet_deficit": diet_deficit,
        "exercise_deficit": exercise_deficit,
        "estimated_weight_loss_kg_per_week": round(estimated_weight_loss_kg_per_week, 2),
        "desired_timeline_weeks": desired_timeline_weeks,
        "recommended_timeline_weeks": recommended_timeline_weeks,
        "timeline_status": timeline_status,
        "protein_g": macros["protein_g"],
        "carbs_g": macros["carbs_g"],
        "fat_g": macros["fat_g"],
        "strategy": strategy,
        "exercise_habit": exercise_habit,
        "alternative_plan": alternative_plan,
        "warning": warning
    }
