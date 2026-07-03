import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

function Register() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setMessageType("error");
    setIsLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:5000/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessageType("error");
        setMessage(data.message || "Registration failed. Please try again.");
        return;
      }

      setMessageType("success");
      setMessage(data.message || "Registered successfully");
      setTimeout(() => navigate("/login"), 700);
    } catch {
      setMessage("Could not connect to the server.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-mobile-shell" aria-label="Register form">
        <div className="auth-topbar">
          <div className="auth-brand-badge" aria-hidden="true">CS</div>
          <div className="auth-top-pill" aria-hidden="true">
            <span>▦</span>
            <strong>CutSmart</strong>
          </div>
        </div>

        <div className="auth-hero">
          <div className="auth-hero-copy">
            <p>START SMART</p>
            <h1>
              Create Your
              <span>Account!</span>
            </h1>
            <em>Join CutSmart and build healthier habits every day.</em>
          </div>
        </div>

        <div className="auth-card">
          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-field">
              <span className="auth-field-label">Username</span>
              <span className="auth-input-shell">
                <span className="auth-input-icon" aria-hidden="true">♙</span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Choose a username"
                  required
                />
              </span>
            </label>

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
                  {showPassword ? "◌" : "◎"}
                </button>
              </span>
            </label>

            {message && (
              <p className={`auth-message ${messageType === "success" ? "is-success" : ""}`}>
                {message}
              </p>
            )}

            <button type="submit" className="auth-primary-button" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Register"}
            </button>
          </form>

          <p className="auth-link-row">
            Already have an account? <Link to="/login">Login <span aria-hidden="true">›</span></Link>
          </p>
        </div>

        <p className="auth-security-note">Your data stays private and secure with CutSmart.</p>
      </section>
    </main>
  );
}

export default Register;
