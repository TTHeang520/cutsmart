import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:5000/api/login", {
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

      const user = data.user;
      const username = user.username || email.split("@")[0];

      localStorage.setItem(
        "user",
        JSON.stringify({
          ...user,
          username,
          email: user.email || email,
        })
      );

      navigate("/dashboard");
    } catch {
      setMessage("Could not connect to the server.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-mobile-shell" aria-label="Login form">
        <div className="auth-topbar">
          <div className="auth-brand-badge" aria-hidden="true">CS</div>
          <div className="auth-top-pill" aria-hidden="true">
            <span>▦</span>
            <strong>CutSmart</strong>
          </div>
        </div>

        <div className="auth-hero">
          <div className="auth-hero-copy">
            <p>WELCOME BACK</p>
            <h1>
              Welcome
              <span>Back!</span>
            </h1>
            <em>Continue your fitness journey with CutSmart.</em>
          </div>
        </div>

        <div className="auth-card">
          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-field">
              <span className="auth-field-label">Email</span>
              <span className="auth-input-shell">
                <span className="auth-input-icon" aria-hidden="true">✉</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email address"
                  required
                />
              </span>
            </label>

            <label className="auth-field">
              <span className="auth-field-label">Password</span>
              <span className="auth-input-shell">
                <span className="auth-input-icon" aria-hidden="true">⌘</span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  required
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((currentValue) => !currentValue)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  ◉
                </button>
              </span>
            </label>

            {message && <p className="auth-message">{message}</p>}

            <button type="submit" className="auth-primary-button" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="auth-divider" aria-hidden="true">
            <span>or</span>
          </div>

          <p className="auth-link-row">
            New to CutSmart? <Link to="/register">Register <span aria-hidden="true">›</span></Link>
          </p>
        </div>

        <p className="auth-security-note">Your data stays private and secure with CutSmart.</p>
      </section>
    </main>
  );
}

export default Login;
