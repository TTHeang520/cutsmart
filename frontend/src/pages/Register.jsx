import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

function Register() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Registration failed. Please try again.");
        return;
      }

      navigate("/login");
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

      <section className="login-card-panel" aria-label="Register form">
        <div className="login-card">
          <div className="login-card-header">
            <p className="login-card-eyebrow">Start Smart</p>
            <h2>Register</h2>
            <p>Create your CutSmart account and begin your healthier routine.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <label>
              Username
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Choose a username"
                required
              />
            </label>

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
                placeholder="Create a password"
                required
              />
            </label>

            <div className="login-form-row">
              <span>Private by default</span>
              <span>Fitness-ready</span>
            </div>

            {message && <p className="login-message">{message}</p>}

            <button type="submit" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Register"}
            </button>
          </form>

          <p className="login-register-link">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default Register;
