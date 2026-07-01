import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Login failed. Please try again.");
        return;
      }

      const user = data.user || data;
      const username = user.username || email.split("@")[0];

      localStorage.setItem(
        "user",
        JSON.stringify({
          ...user,
          username,
          email: user.email || email,
        })
      );

      const latestPlan = await getLatestPlanForUser({ ...user, username, email: user.email || email });

      if (latestPlan) {
        localStorage.setItem(
          getLatestPlanKey(user),
          JSON.stringify(latestPlan)
        );
        navigate("/dashboard");
        return;
      }

      navigate("/welcome");
    } catch {
      setMessage("Could not connect to the server.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel" aria-label="CutSmart overview">
        <div className="login-brand-content">
          <div className="login-logo-mark" aria-hidden="true">
            CS
          </div>
          <div>
            <p className="login-kicker">CutSmart</p>
            <h1>Build healthier habits every day.</h1>
          </div>

          <div className="login-feature-list">
            <div className="login-feature-item">
              <span aria-hidden="true">01</span>
              <strong>Smart calorie planning</strong>
            </div>
            <div className="login-feature-item">
              <span aria-hidden="true">02</span>
              <strong>Workout tracking</strong>
            </div>
            <div className="login-feature-item">
              <span aria-hidden="true">03</span>
              <strong>Progress insights</strong>
            </div>
          </div>
        </div>

        <p className="login-copyright">© 2026 CutSmart. All rights reserved.</p>
      </section>

      <section className="login-card-panel" aria-label="Login form">
        <div className="login-card">
          <div className="login-card-header">
            <p className="login-card-eyebrow">Welcome Back</p>
            <h2>Login</h2>
            <p>Continue your fitness journey with CutSmart.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
              />
            </label>

            <div className="login-form-row">
              <span>Secure sign in</span>
              <a href="#forgot-password" onClick={(event) => event.preventDefault()}>
                Forgot password?
              </a>
            </div>

            {message && <p className="login-message">{message}</p>}

            <button type="submit" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="login-register-link">
            New to CutSmart? <Link to="/register">Register</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

async function getLatestPlanForUser(user) {
  if (user?.id) {
    try {
      const response = await fetch(`/api/plans/latest/${user.id}`);
      const data = await response.json();

      if (response.ok && data.success !== false && data.plan) {
        return data.plan;
      }
    } catch {
      // Fall back to localStorage below when the latest-plan route is unavailable.
    }
  }

  const savedPlan = localStorage.getItem(getLatestPlanKey(user));

  if (!savedPlan) {
    return null;
  }

  try {
    return JSON.parse(savedPlan);
  } catch {
    return null;
  }
}

function getLatestPlanKey(user) {
  return user?.id ? `cutsmart_latest_plan_${user.id}` : "cutsmart_latest_plan_guest";
}

export default Login;
