import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Plan from "./pages/Plan";
import Welcome from "./pages/Welcome";
import FoodLog from "./pages/FoodLog";
import ExerciseLog from "./pages/ExerciseLog";
import WeightTrack from "./pages/WeightTrack";
import Calendar from "./pages/Calendar";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/plan" element={<Plan />} />
      <Route path="/food-log" element={<FoodLog />} />
      <Route path="/exercise-log" element={<ExerciseLog />} />
      <Route path="/weight-track" element={<WeightTrack />} />
      <Route path="/calendar" element={<Calendar />} />
    </Routes>
  );
}

export default App;
