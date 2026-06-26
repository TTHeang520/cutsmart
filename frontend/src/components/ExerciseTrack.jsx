import { useState } from "react";
import { exerciseOptions } from "../data/exerciseOptions";

function ExerciseTrack({ plan, theme, onBackHome }) {
  const [selectedExercise, setSelectedExercise] = useState(null);
  const exerciseGoal = Number(plan.exercise_deficit) || 0;

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
        <div className="timer-placeholder">
          <div>
            <span className="daily-eyebrow">Timer placeholder</span>
            <h3>{selectedExercise.name}</h3>
            <p>
              Suggested duration:{" "}
              <strong>{getSuggestedDuration(exerciseGoal, selectedExercise.caloriesPer30Min)} min</strong>
            </p>
          </div>
          <button type="button">Start timer</button>
        </div>
      )}

      <div className="exercise-grid">
        {exerciseOptions.map((exercise) => (
          <article className="exercise-card" key={exercise.name}>
            <div className="exercise-card-top">
              <span aria-hidden="true">{exercise.icon}</span>
              <strong>{exercise.difficulty}</strong>
            </div>
            <h3>{exercise.name}</h3>
            <p>{exercise.caption}</p>
            <div className="exercise-facts">
              <span>{exercise.caloriesPer30Min} kcal / 30 min</span>
              <span>
                {getSuggestedDuration(exerciseGoal, exercise.caloriesPer30Min)} min suggested
              </span>
            </div>
            <button type="button" onClick={() => setSelectedExercise(exercise)}>
              Start
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function getSuggestedDuration(goalCalories, caloriesPer30Min) {
  if (!goalCalories || !caloriesPer30Min) {
    return 30;
  }

  const minutes = Math.ceil((goalCalories / caloriesPer30Min) * 30);
  return Math.max(10, Math.min(minutes, 120));
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
