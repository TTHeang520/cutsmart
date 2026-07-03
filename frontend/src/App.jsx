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
import AppLayout from "./components/AppLayout";
import AuthLayout from "./components/AuthLayout";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import "./App.css";


function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
      <Route element={<AppLayout />}>
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="/food-log" element={<FoodLog />} />
        <Route path="/exercise-log" element={<ExerciseLog />} />
        <Route path="/weight-track" element={<WeightTrack />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
