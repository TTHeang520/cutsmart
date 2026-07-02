import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: "⌂" },
  { to: "/plan", label: "Plan", icon: "□" },
  { to: "/food-log", label: "Food", icon: "◌" },
  { to: "/exercise-log", label: "Workout", icon: "✦" },
  { to: "/weight-track", label: "Weight", icon: "▱" },
];

function BottomNav() {
  return (
    <nav className="app-bottom-nav" aria-label="Primary navigation">
      {navItems.map((item) => (
        <NavLink key={item.to} to={item.to}>
          <span aria-hidden="true">{item.icon}</span>
          <strong>{item.label}</strong>
        </NavLink>
      ))}
    </nav>
  );
}

export default BottomNav;
