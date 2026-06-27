import { useMemo, useState } from "react";
import { exerciseOptions } from "../data/exerciseOptions";

const categoryFilters = ["All", "Cardio", "Sport", "Strength", "Recovery"];
const intensityFilters = ["All intensity", "Light", "Medium", "High"];

function ExerciseTrack({ plan, theme, onBackHome }) {
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [expandedExercise, setExpandedExercise] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [intensityFilter, setIntensityFilter] = useState("All intensity");
  const exerciseGoal = Number(plan.exercise_deficit) || 0;

  const filteredExercises = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return exerciseOptions.filter((exercise) => {
      const matchesSearch =
        !search ||
        exercise.name.toLowerCase().includes(search) ||
        exercise.category.toLowerCase().includes(search) ||
        exercise.intensity.toLowerCase().includes(search);
      const matchesCategory =
        categoryFilter === "All" || exercise.category === categoryFilter;
      const matchesIntensity =
        intensityFilter === "All intensity" ||
        exercise.intensity === intensityFilter;

      return matchesSearch && matchesCategory && matchesIntensity;
    });
  }, [categoryFilter, intensityFilter, searchTerm]);

  function handleStartWorkout(event, exercise) {
    event.stopPropagation();
    setSelectedExercise(exercise);
    setExpandedExercise(exercise.name);
  }

  function clearFilters() {
    setSearchTerm("");
    setCategoryFilter("All");
    setIntensityFilter("All intensity");
  }

  return (
    <section className={`exercise-track daily-theme-${plan.strategy}`}>
      <div className="exercise-header">
        <button type="button" className="secondary-button" onClick={onBackHome}>
          Back to Daily Plan Home
        </button>
        <div>
          <span className="daily-eyebrow">{theme.eyebrow}</span>
          <h2>Exercise Track</h2>
          <p>
            Today’s movement goal is about{" "}
            <strong>{formatNumber(exerciseGoal)} kcal</strong>. Pick a workout
            and start with the suggested duration.
          </p>
        </div>
      </div>

      {selectedExercise && (
        <SelectedExercisePanel
          exercise={selectedExercise}
          exerciseGoal={exerciseGoal}
          onChangeExercise={() => setSelectedExercise(null)}
        />
      )}

      <div className="exercise-controls">
        <label className="exercise-search">
          Search workouts
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Try badminton, sport, medium..."
          />
        </label>

        <FilterGroup
          label="Category"
          options={categoryFilters}
          selectedValue={categoryFilter}
          onSelect={setCategoryFilter}
        />

        <FilterGroup
          label="Intensity"
          options={intensityFilters}
          selectedValue={intensityFilter}
          onSelect={setIntensityFilter}
        />

        <p className="exercise-safety-note">
          Calories burned are estimates. Actual burn depends on body weight,
          pace, intensity, and duration.
        </p>
      </div>

      {filteredExercises.length === 0 ? (
        <div className="exercise-empty-state">
          <h3>No workouts found.</h3>
          <p>Try another search or clear the filters.</p>
          <button type="button" className="secondary-button" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="exercise-grid">
          {filteredExercises.map((exercise) => {
            const isExpanded = expandedExercise === exercise.name;
            const duration = getSuggestedDuration(
              exerciseGoal,
              exercise.caloriesPer30Min
            );

            return (
              <article
                className={isExpanded ? "exercise-card expanded" : "exercise-card"}
                key={exercise.name}
                onClick={() =>
                  setExpandedExercise(isExpanded ? null : exercise.name)
                }
              >
                <div className="exercise-card-summary">
                  <span className="exercise-card-icon" aria-hidden="true">
                    {exercise.icon}
                  </span>
                  <div>
                    <h3>{exercise.name}</h3>
                    <div className="exercise-pills">
                      <span>{exercise.category}</span>
                      <span>{exercise.intensity}</span>
                    </div>
                  </div>
                </div>

                {!isExpanded && <span className="view-details-hint">View details</span>}

                {isExpanded && (
                  <div className="exercise-expanded-content">
                    <p>{exercise.caption}</p>
                    <div className="exercise-facts">
                      <span>
                        Estimated: {exercise.caloriesPer30Min} kcal / 30 min
                      </span>
                      <span>Suggested today: {duration.minutes} min</span>
                    </div>
                    <p className="exercise-calorie-note">
                      Calories burned are estimates and depend on body weight,
                      pace, intensity, and duration.
                    </p>
                    {duration.isCapped && (
                      <p className="exercise-session-note">
                        You can split this into smaller sessions.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={(event) => handleStartWorkout(event, exercise)}
                    >
                      Start Workout
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SelectedExercisePanel({ exercise, exerciseGoal, onChangeExercise }) {
  const duration = getSuggestedDuration(exerciseGoal, exercise.caloriesPer30Min);

  return (
    <div className="timer-placeholder">
      <div>
        <span className="daily-eyebrow">Workout ready</span>
        <h3>{exercise.name}</h3>
        <p>
          Suggested duration: <strong>{duration.minutes} min</strong>
        </p>
        <p>
          Today’s exercise calorie goal:{" "}
          <strong>{formatNumber(exerciseGoal)} kcal</strong>
        </p>
        {duration.isCapped && (
          <p className="exercise-session-note">
            You can split this into smaller sessions.
          </p>
        )}
      </div>
      <div className="timer-actions">
        <button type="button">Start timer</button>
        <button type="button" className="secondary-button" onClick={onChangeExercise}>
          Change exercise
        </button>
      </div>
    </div>
  );
}

function FilterGroup({ label, options, selectedValue, onSelect }) {
  return (
    <div className="filter-group">
      <span>{label}</span>
      <div className="filter-chip-row">
        {options.map((option) => (
          <button
            type="button"
            key={option}
            className={selectedValue === option ? "filter-chip active" : "filter-chip"}
            onClick={() => onSelect(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function getSuggestedDuration(goalCalories, caloriesPer30Min) {
  if (!goalCalories || !caloriesPer30Min) {
    return {
      minutes: 30,
      isCapped: false,
    };
  }

  const rawMinutes = (goalCalories / caloriesPer30Min) * 30;
  const roundedMinutes = Math.ceil(rawMinutes / 5) * 5;

  return {
    minutes: Math.max(10, Math.min(roundedMinutes, 120)),
    isCapped: roundedMinutes > 120,
  };
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });
}

export default ExerciseTrack;
