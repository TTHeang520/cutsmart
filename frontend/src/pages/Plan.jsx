import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import DailyPlanHome from "../components/DailyPlanHome";
import ExerciseTrack from "../components/ExerciseTrack";
import {
  calorieCaptions,
  themeContent,
  timelineCaptions,
} from "../data/planThemes";

const totalSteps = 8;

const startingForm = {
  age: "",
  gender: "male",
  height_cm: "",
  current_weight_kg: 80,
  target_weight_kg: 72,
  exercise_habit: "light_exercise",
  strategy: "balanced",
  desired_timeline_weeks: "",
};

const stepTitles = [
  "About you",
  "Your height",
  "Current weight",
  "Target weight",
  "Movement rhythm",
  "Preferred strategy",
  "Timeline",
  "Review",
];

const exerciseOptions = [
  {
    value: "little_or_no_exercise",
    title: "Little or no exercise",
    caption: "Mostly sitting, light daily movement.",
  },
  {
    value: "light_exercise",
    title: "Light exercise",
    caption: "A few easy sessions or walks each week.",
  },
  {
    value: "moderate_exercise",
    title: "Moderate exercise",
    caption: "Consistent training with regular movement.",
  },
  {
    value: "active_exercise",
    title: "Active exercise",
    caption: "Hard sessions or a physically active routine.",
  },
  {
    value: "very_active_exercise",
    title: "Very active exercise",
    caption: "High activity, frequent intense training.",
  },
];

const strategyOptions = [
  {
    value: "diet",
    title: "Diet focused",
    caption: "Let food choices do most of the work.",
  },
  {
    value: "balanced",
    title: "Balanced",
    caption: "A steady mix of nutrition and movement.",
  },
  {
    value: "exercise",
    title: "Exercise focused",
    caption: "Lean more on activity while still eating smart.",
  },
];

function Plan() {
  const navigate = useNavigate();
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;
  const [hasStarted, setHasStarted] = useState(false);
  const [formData, setFormData] = useState(startingForm);
  const [currentStep, setCurrentStep] = useState(0);
  const [plan, setPlan] = useState(null);
  const [resultStep, setResultStep] = useState(0);
  const [dailyView, setDailyView] = useState("result");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  }

  function handleOptionChange(name, value) {
    setFormData({
      ...formData,
      [name]: value,
    });

    if (currentStep === 4 || currentStep === 5) {
      setTimeout(() => {
        setMessage("");
        setCurrentStep((step) =>
          step === currentStep ? Math.min(step + 1, totalSteps - 1) : step
        );
      }, 180);
    }
  }

  function handleLogout() {
    localStorage.removeItem("user");
    navigate("/login");
  }

  function handleCreateNewPlan() {
    setPlan(null);
    setMessage("");
    setResultStep(0);
    setDailyView("result");
    setCurrentStep(0);
    setHasStarted(true);
    setIsAccountMenuOpen(false);
  }

  function goNext() {
    setMessage("");
    setCurrentStep(currentStep + 1);
  }

  function goBack() {
    setMessage("");
    setCurrentStep(currentStep - 1);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setPlan(null);
    setResultStep(0);
    setIsLoading(true);

    // Keep these request keys exactly aligned with the backend contract.
    const requestBody = {
      age: Number(formData.age),
      gender: formData.gender,
      height_cm: Number(formData.height_cm),
      current_weight_kg: Number(formData.current_weight_kg),
      target_weight_kg: Number(formData.target_weight_kg),
      exercise_habit: formData.exercise_habit,
      strategy: formData.strategy,
      desired_timeline_weeks: Number(formData.desired_timeline_weeks),
    };

    if (formData.desired_timeline_weeks) {
      requestBody.desired_timeline_weeks = Number(formData.desired_timeline_weeks);
    }

    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json().catch(() => ({
        success: false,
        message: `Plan API returned status ${response.status}. Please check the backend route.`,
      }));

      if (!response.ok || data.success === false) {
        setMessage(data.message || "Could not generate your plan.");
        return;
      }

      setPlan(data.plan);
      setDailyView("result");
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
            <h1>Build your plan</h1>
            <p className="page-copy">
              A calm guided setup for a plan that feels personal, realistic, and
              useful.
            </p>
          </div>

          <div className="account-area">
            <button
              type="button"
              className="profile-menu-button"
              onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
              aria-label="Open account menu"
              aria-expanded={isAccountMenuOpen}
            >
              <span>{getUserInitial(user)}</span>
              <span className="menu-dots" aria-hidden="true">•••</span>
            </button>

            {isAccountMenuOpen && (
              <div className="account-menu">
                <div className="account-menu-user">
                  <strong>{user.username || "CutSmart user"}</strong>
                  {user.email && <span>{user.email}</span>}
                </div>

                <Link to="/dashboard" onClick={() => setIsAccountMenuOpen(false)}>
                  Dashboard
                </Link>
                <button type="button" onClick={handleCreateNewPlan}>
                  Create new plan
                </button>
                <button type="button" className="logout-menu-item" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {!hasStarted && !plan ? (
          <OnboardingCard onStart={() => setHasStarted(true)} />
        ) : !plan ? (
          <WizardCard
            currentStep={currentStep}
            formData={formData}
            isLoading={isLoading}
            message={message}
            onBack={goBack}
            onChange={handleChange}
            onNext={goNext}
            onOptionChange={handleOptionChange}
            onSubmit={handleSubmit}
          />
        ) : dailyView === "home" ? (
          <DailyPlanHome
            plan={plan}
            theme={getPlanTheme(plan)}
            onCreateAnotherPlan={handleCreateNewPlan}
            onOpenExerciseTrack={() => setDailyView("exercise")}
          />
        ) : dailyView === "exercise" ? (
          <ExerciseTrack
            plan={plan}
            theme={getPlanTheme(plan)}
            onBackHome={() => setDailyView("home")}
          />
        ) : (
          <ResultReveal
            message={message}
            plan={plan}
            resultStep={resultStep}
            onFinish={() => setDailyView("home")}
            onBackToReview={() => {
              setPlan(null);
              setResultStep(0);
              setDailyView("result");
              setCurrentStep(totalSteps - 1);
              setHasStarted(true);
            }}
            onBackResult={() => setResultStep(Math.max(resultStep - 1, 0))}
            onNext={() => setResultStep(resultStep + 1)}
            onRestart={() => {
              setPlan(null);
              setMessage("");
              setDailyView("result");
              setCurrentStep(0);
              setHasStarted(false);
            }}
          />
        )}
      </section>
    </main>
  );
}

function OnboardingCard({ onStart }) {
  return (
    <section className="onboarding-card">
      <div className="onboarding-badge">Personal plan builder</div>
      <div className="onboarding-visual" aria-hidden="true">
        <span>🍽️</span>
        <span>＋</span>
        <span>🏃</span>
      </div>
      <h2>Let’s build your CutSmart plan</h2>
      <p>
        A personalised calorie and lifestyle plan, built around your body, goal,
        and routine.
      </p>
      <button type="button" onClick={onStart}>
        Get Started
      </button>
    </section>
  );
}

function WizardCard({
  currentStep,
  formData,
  isLoading,
  message,
  onBack,
  onChange,
  onNext,
  onOptionChange,
  onSubmit,
}) {
  const isLastStep = currentStep === totalSteps - 1;
  const isAutoAdvanceStep = currentStep === 4 || currentStep === 5;
  const canContinue = isStepComplete(currentStep, formData);
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <form onSubmit={onSubmit} className="wizard-card">
      <div className="wizard-progress">
        <div>
          <span>
            Step {currentStep + 1} of {totalSteps}
          </span>
          <strong>{stepTitles[currentStep]}</strong>
        </div>
        <div className="progress-track" aria-hidden="true">
          <div style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="wizard-step">
        <StepContent
          currentStep={currentStep}
          formData={formData}
          onChange={onChange}
          onOptionChange={onOptionChange}
        />
      </div>

      {message && <p className="error-card">{message}</p>}

      <div className="wizard-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={onBack}
          disabled={currentStep === 0 || isLoading}
        >
          Back
        </button>

        {isLastStep ? (
          <button type="submit" disabled={!canContinue || isLoading}>
            {isLoading ? "Generating..." : "Generate my plan"}
          </button>
        ) : isAutoAdvanceStep ? (
          <span className="auto-next-hint">Choose an option to continue</span>
        ) : (
          <button
            type="button"
            onClick={onNext}
            disabled={!canContinue || isLoading}
          >
            Next
          </button>
        )}
      </div>
    </form>
  );
}

function StepContent({ currentStep, formData, onChange, onOptionChange }) {
  if (currentStep === 0) {
    return (
      <>
        <StepIntro
          title="Let us start with the basics."
          caption="Your age and gender help estimate how much energy your body uses each day."
        />
        <div className="two-column-fields">
          <label className="premium-field">
            Age
            <input
              type="number"
              name="age"
              min="1"
              value={formData.age}
              onChange={onChange}
              placeholder="22"
              required
            />
          </label>

          <label className="premium-field">
            Gender
            <select
              name="gender"
              value={formData.gender}
              onChange={onChange}
              required
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>
        </div>
      </>
    );
  }

  if (currentStep === 1) {
    return (
      <>
        <StepIntro
          title="How tall are you?"
          caption="Height gives the BMI and calorie math a better foundation."
        />
        <label className="premium-field feature-field">
          Height
          <input
            type="number"
            name="height_cm"
            min="1"
            value={formData.height_cm}
            onChange={onChange}
            placeholder="175"
            required
          />
          <span>cm</span>
        </label>
      </>
    );
  }

  if (currentStep === 2) {
    return (
      <>
        <StepIntro
          title="Where are you starting from?"
          caption="No judgement here. This is simply the starting point for the plan."
        />
        <RangeField
          label="Current weight"
          name="current_weight_kg"
          min="40"
          max="150"
          value={formData.current_weight_kg}
          onChange={onChange}
        />
      </>
    );
  }

  if (currentStep === 3) {
    return (
      <>
        <StepIntro
          title="What is your target weight?"
          caption="Pick a goal that feels motivating and still grounded."
        />
        <RangeField
          label="Target weight"
          name="target_weight_kg"
          min="35"
          max="140"
          value={formData.target_weight_kg}
          onChange={onChange}
        />
      </>
    );
  }

  if (currentStep === 4) {
    return (
      <>
        <StepIntro
          title="How active is your normal week?"
          caption="This helps estimate your maintenance calories without overpromising."
        />
        <OptionGrid
          name="exercise_habit"
          options={exerciseOptions}
          selectedValue={formData.exercise_habit}
          onSelect={onOptionChange}
        />
      </>
    );
  }

  if (currentStep === 5) {
    return (
      <>
        <StepIntro
          title="Choose your style."
          caption="Pick the style you prefer. CutSmart will still keep the final plan realistic and safe."
        />
        <OptionGrid
          name="strategy"
          options={strategyOptions}
          selectedValue={formData.strategy}
          onSelect={onOptionChange}
        />
      </>
    );
  }

  if (currentStep === 6) {
    return (
      <>
        <StepIntro
          title="What timeline are you hoping for?"
          caption="The backend will check whether your timeline looks realistic."
        />
        <label className="premium-field feature-field">
          Desired timeline
          <input
            type="number"
            name="desired_timeline_weeks"
            min="1"
            value={formData.desired_timeline_weeks}
            onChange={onChange}
            placeholder="18"
            required
          />
          <span>weeks</span>
        </label>
      </>
    );
  }

  return (
    <>
      <StepIntro
        title="Review your setup."
        caption="If this looks right, generate your personalized plan."
      />
      <div className="review-grid">
        <ReviewItem label="Age" value={`${formData.age} years`} />
        <ReviewItem label="Gender" value={formatLabel(formData.gender)} />
        <ReviewItem label="Height" value={`${formData.height_cm} cm`} />
        <ReviewItem
          label="Current weight"
          value={`${formData.current_weight_kg} kg`}
        />
        <ReviewItem
          label="Target weight"
          value={`${formData.target_weight_kg} kg`}
        />
        <ReviewItem
          label="Exercise habit"
          value={formatLabel(formData.exercise_habit)}
        />
        <ReviewItem label="Strategy" value={formatLabel(formData.strategy)} />
        <ReviewItem
          label="Desired timeline"
          value={`${formData.desired_timeline_weeks} weeks`}
        />
      </div>
    </>
  );
}

function StepIntro({ title, caption }) {
  return (
    <div className="step-intro">
      <h2>{title}</h2>
      <p>{caption}</p>
    </div>
  );
}

function RangeField({ label, name, min, max, value, onChange }) {
  return (
    <label className="range-field">
      <span>{label}</span>
      <strong>{value} kg</strong>
      <input
        type="range"
        name={name}
        min={min}
        max={max}
        value={value}
        onChange={onChange}
      />
      <div className="range-limits">
        <span>{min} kg</span>
        <span>{max} kg</span>
      </div>
    </label>
  );
}

function OptionGrid({ name, options, selectedValue, onSelect }) {
  return (
    <div className="option-grid">
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          className={selectedValue === option.value ? "option-card selected" : "option-card"}
          onClick={() => onSelect(name, option.value)}
        >
          <strong>{option.title}</strong>
          <span>{option.caption}</span>
        </button>
      ))}
    </div>
  );
}

function ReviewItem({ label, value }) {
  return (
    <div className="review-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ResultReveal({
  message,
  plan,
  resultStep,
  onFinish,
  onBackToReview,
  onBackResult,
  onNext,
  onRestart,
}) {
  const strategyKey = plan.strategy in themeContent ? plan.strategy : "balanced";
  const theme = themeContent[strategyKey];

  // The result is intentionally revealed in chapters so the plan feels guided.
  const screens = [
    {
      title: theme.title,
      caption: theme.caption,
      button: theme.nextButton,
      body: (
        <div className="readiness-panel">
          <span>Ready</span>
          <strong>{message}</strong>
        </div>
      ),
    },
    {
      title: "Your daily target",
      caption: calorieCaptions[strategyKey],
      button: "How fast can I get there? ->",
      body: (
        <HeroMetric
          value={formatNumber(plan.target_calories)}
          suffix="kcal/day"
        />
      ),
    },
    {
      title: "Your estimated journey",
      caption: timelineCaptions[strategyKey],
      button: "Reveal my strategy ->",
      body: (
        <div className="split-metrics">
          <HeroMetric
            value={formatNumber(plan.recommended_timeline_weeks)}
            suffix="weeks"
          />
          <HeroMetric
            value={formatNumber(plan.estimated_weight_loss_kg_per_week)}
            suffix="kg/week"
          />
        </div>
      ),
    },
    {
      title: "Your strategy",
      caption:
        "You do not need to starve or do endless cardio. The plan balances food and movement.",
      button: "Show my macros ->",
      body: (
        <div className="result-stat-grid">
          <ResultStat label="Strategy" value={formatLabel(plan.strategy)} />
          <ResultStat
            label="Diet deficit"
            value={`${formatNumber(plan.diet_deficit)} kcal`}
          />
          <ResultStat
            label="Exercise deficit"
            value={`${formatNumber(plan.exercise_deficit)} kcal`}
          />
        </div>
      ),
    },
    {
      title: "Fuel guide",
      caption:
        "These targets help you lose weight while keeping your body fueled.",
      button: "See the details ->",
      body: (
        <div className="result-stat-grid">
          <ResultStat label="Protein" value={`${formatNumber(plan.protein_g)} g`} />
          <ResultStat label="Carbs" value={`${formatNumber(plan.carbs_g)} g`} />
          <ResultStat label="Fat" value={`${formatNumber(plan.fat_g)} g`} />
        </div>
      ),
    },
    {
      title: "Calculation details",
      caption: "Curious how the plan was estimated? Here is the breakdown.",
      button: "Finish",
      body: (
        <div className="details-stack">
          <PlanComparison plan={plan} />
          <div className="details-grid">
            <ResultStat
              label="Current BMI"
              value={`${formatNumber(plan.current_bmi)} (${plan.current_bmi_category})`}
            />
            <ResultStat
              label="Target BMI"
              value={`${formatNumber(plan.target_bmi)} (${plan.target_bmi_category})`}
            />
            <ResultStat label="BMR" value={`${formatNumber(plan.bmr)} kcal`} />
            <ResultStat
              label="Maintenance"
              value={`${formatNumber(plan.maintenance_calories)} kcal`}
            />
            <ResultStat
              label="Activity multiplier"
              value={formatNumber(plan.activity_multiplier)}
            />
            <ResultStat
              label="Daily deficit"
              value={`${formatNumber(plan.daily_deficit)} kcal`}
            />
          </div>
        </div>
      ),
    },
  ];

  const screen = screens[resultStep];
  const isLastScreen = resultStep === screens.length - 1;

  return (
    <section className={`result-reveal result-theme-${strategyKey}`}>
      <div className="result-step-count">
        Result {resultStep + 1} of {screens.length}
      </div>

      <div className="result-card" key={resultStep}>
        <div className="reveal-item reveal-icon" aria-hidden="true">
          {theme.icon}
        </div>
        <div className="reveal-item reveal-eyebrow">{theme.eyebrow}</div>
        <h2 className="reveal-item reveal-title">{screen.title}</h2>
        <p className="reveal-item reveal-caption">{screen.caption}</p>

        {plan.warning && (
          <div className="warning-note reveal-item reveal-body">
            Heads up: {plan.warning}
          </div>
        )}

        <div className="reveal-item reveal-body">{screen.body}</div>

        <div className="result-actions reveal-item reveal-button">
          {isLastScreen ? (
            <>
              <button type="button" onClick={onFinish}>
                Finish / Open Daily Plan Home
              </button>
              <button type="button" className="secondary-button" onClick={onRestart}>
                Create another plan
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="secondary-button"
                onClick={resultStep === 0 ? onBackToReview : onBackResult}
              >
                {resultStep === 0 ? "Back to review" : "Back"}
              </button>
              <button type="button" onClick={onNext}>
                {screen.button}
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function PlanComparison({ plan }) {
  return (
    <section className="plan-comparison">
      <div>
        <span className="comparison-eyebrow">Milestone 2 safety check</span>
        <h3>Preferred style vs safer plan</h3>
        <p>
          {plan.warning
            ? "CutSmart adjusted the plan to keep it realistic and safer for steady progress."
            : "Your preferred style was accepted, so the plan can stay close to what you chose."}
        </p>
      </div>

      <div className="comparison-grid">
        <ResultStat label="Preferred style" value={formatLabel(plan.strategy)} />
        <ResultStat
          label="Timeline status"
          value={formatLabel(plan.timeline_status)}
        />
        <ResultStat
          label="Recommended timeline"
          value={`${formatNumber(plan.recommended_timeline_weeks)} weeks`}
        />
        <ResultStat
          label="Desired timeline"
          value={
            plan.desired_timeline_weeks
              ? `${formatNumber(plan.desired_timeline_weeks)} weeks`
              : "Not provided"
          }
        />
      </div>

      {plan.warning && <div className="comparison-warning">{plan.warning}</div>}
    </section>
  );
}

function HeroMetric({ value, suffix }) {
  return (
    <div className="hero-metric">
      <strong>{value}</strong>
      <span>{suffix}</span>
    </div>
  );
}

function ResultStat({ label, value }) {
  return (
    <div className="result-stat">
      <span>{label}</span>
      <strong>{value ?? "-"}</strong>
    </div>
  );
}

function isStepComplete(step, formData) {
  if (step === 0) {
    return Number(formData.age) > 0 && Boolean(formData.gender);
  }

  if (step === 1) {
    return Number(formData.height_cm) > 0;
  }

  if (step === 2) {
    return Number(formData.current_weight_kg) > 0;
  }

  if (step === 3) {
    return Number(formData.target_weight_kg) > 0;
  }

  if (step === 4) {
    return Boolean(formData.exercise_habit);
  }

  if (step === 5) {
    return Boolean(formData.strategy);
  }

  if (step === 6) {
    return Number(formData.desired_timeline_weeks) > 0;
  }

  return (
    Number(formData.age) > 0 &&
    Number(formData.height_cm) > 0 &&
    Number(formData.current_weight_kg) > 0 &&
    Number(formData.target_weight_kg) > 0 &&
    Number(formData.desired_timeline_weeks) > 0 &&
    Boolean(formData.gender) &&
    Boolean(formData.exercise_habit) &&
    Boolean(formData.strategy)
  );
}

function formatLabel(value) {
  if (!value) {
    return "-";
  }

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });
}

function getUserInitial(user) {
  const name = user?.username || user?.email || "U";
  return name.charAt(0).toUpperCase();
}

function getPlanTheme(plan) {
  const strategyKey = plan.strategy in themeContent ? plan.strategy : "balanced";
  return themeContent[strategyKey];
}

export default Plan;
