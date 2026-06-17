import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

const startingForm = {
  age: "",
  gender: "male",
  height_cm: "",
  current_weight_kg: "",
  target_weight_kg: "",
  exercise_habit: "light_exercise",
  strategy: "balanced",
  desired_timeline_weeks: "",
};

function Plan() {
  const navigate = useNavigate();
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;
  const [formData, setFormData] = useState(startingForm);
  const [plan, setPlan] = useState(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  }

  function handleLogout() {
    localStorage.removeItem("user");
    navigate("/login");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setPlan(null);
    setIsLoading(true);

    const requestBody = {
      age: Number(formData.age),
      gender: formData.gender,
      height_cm: Number(formData.height_cm),
      current_weight_kg: Number(formData.current_weight_kg),
      target_weight_kg: Number(formData.target_weight_kg),
      exercise_habit: formData.exercise_habit,
      strategy: formData.strategy,
    };

    if (formData.desired_timeline_weeks) {
      requestBody.desired_timeline_weeks = Number(formData.desired_timeline_weeks);
    }

    try {
      const response = await fetch("http://127.0.0.1:5000/api/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Could not generate your plan.");
        return;
      }

      setPlan(data.plan);
      setMessage(data.message || "Plan generated successfully");
    } catch {
      setMessage("Could not connect to the server.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="plan-page">
      <section className="plan-shell">
        <header className="page-header">
          <div>
            <p className="brand-name">CutSmart</p>
            <h1>Calorie Plan</h1>
            <p className="page-copy">
              Enter your details and generate a weight-loss plan.
            </p>
          </div>

          <div className="header-actions">
            <Link to="/dashboard">Dashboard</Link>
            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <div className="plan-layout">
          <form onSubmit={handleSubmit} className="plan-form">
            <label>
              Age
              <input
                type="number"
                name="age"
                min="1"
                value={formData.age}
                onChange={handleChange}
                placeholder="22"
                required
              />
            </label>

            <label>
              Gender
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </label>

            <label>
              Height (cm)
              <input
                type="number"
                name="height_cm"
                min="1"
                value={formData.height_cm}
                onChange={handleChange}
                placeholder="175"
                required
              />
            </label>

            <label>
              Current weight (kg)
              <input
                type="number"
                name="current_weight_kg"
                min="1"
                step="0.1"
                value={formData.current_weight_kg}
                onChange={handleChange}
                placeholder="80"
                required
              />
            </label>

            <label>
              Target weight (kg)
              <input
                type="number"
                name="target_weight_kg"
                min="1"
                step="0.1"
                value={formData.target_weight_kg}
                onChange={handleChange}
                placeholder="72"
                required
              />
            </label>

            <label>
              Exercise habit
              <select
                name="exercise_habit"
                value={formData.exercise_habit}
                onChange={handleChange}
                required
              >
                <option value="little_or_no_exercise">Little or no exercise</option>
                <option value="light_exercise">Light exercise</option>
                <option value="moderate_exercise">Moderate exercise</option>
                <option value="active_exercise">Active exercise</option>
                <option value="very_active_exercise">Very active exercise</option>
              </select>
            </label>

            <label>
              Strategy
              <select
                name="strategy"
                value={formData.strategy}
                onChange={handleChange}
                required
              >
                <option value="diet">Diet focused</option>
                <option value="exercise">Exercise focused</option>
                <option value="balanced">Balanced</option>
              </select>
            </label>

            <label>
              Desired timeline (weeks)
              <input
                type="number"
                name="desired_timeline_weeks"
                min="1"
                value={formData.desired_timeline_weeks}
                onChange={handleChange}
                placeholder="Optional"
              />
            </label>

            {message && (
              <p className={plan ? "form-message success" : "form-message"}>
                {message}
              </p>
            )}

            <button type="submit" disabled={isLoading}>
              {isLoading ? "Generating..." : "Generate Plan"}
            </button>
          </form>

          <section className="plan-results">
            {!plan ? (
              <div className="empty-results">
                <h2>Your plan will appear here</h2>
                <p>
                  The result will show calories, BMI, timeline, and basic
                  macronutrient guidance.
                </p>
              </div>
            ) : (
              <>
                {plan.warning && <p className="plan-warning">{plan.warning}</p>}

                <div className="result-grid">
                  <ResultItem label="Current BMI" value={plan.current_bmi} />
                  <ResultItem
                    label="Current category"
                    value={plan.current_bmi_category}
                  />
                  <ResultItem label="Target BMI" value={plan.target_bmi} />
                  <ResultItem
                    label="Target category"
                    value={plan.target_bmi_category}
                  />
                  <ResultItem label="BMR" value={`${plan.bmr} kcal`} />
                  <ResultItem
                    label="Maintenance"
                    value={`${plan.maintenance_calories} kcal`}
                  />
                  <ResultItem
                    label="Target calories"
                    value={`${plan.target_calories} kcal`}
                  />
                  <ResultItem
                    label="Daily deficit"
                    value={`${plan.daily_deficit} kcal`}
                  />
                  <ResultItem
                    label="Diet deficit"
                    value={`${plan.diet_deficit} kcal`}
                  />
                  <ResultItem
                    label="Exercise deficit"
                    value={`${plan.exercise_deficit} kcal`}
                  />
                  <ResultItem
                    label="Weekly loss"
                    value={`${plan.estimated_weight_loss_kg_per_week} kg`}
                  />
                  <ResultItem
                    label="Timeline"
                    value={`${plan.recommended_timeline_weeks} weeks`}
                  />
                </div>

                <div className="macro-panel">
                  <h2>Macros</h2>
                  <div className="macro-list">
                    <ResultItem label="Protein" value={`${plan.protein_g} g`} />
                    <ResultItem label="Carbs" value={`${plan.carbs_g} g`} />
                    <ResultItem label="Fat" value={`${plan.fat_g} g`} />
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function ResultItem({ label, value }) {
  return (
    <div className="result-item">
      <span>{label}</span>
      <strong>{value ?? "-"}</strong>
    </div>
  );
}

export default Plan;
