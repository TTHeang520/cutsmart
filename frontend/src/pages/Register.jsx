import { apiFetch } from "../utils/api";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

// Keep these rules in step with get_email_error in backend/app.py.
const EMAIL_PATTERN = /^[^@\s]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const GMAIL_TYPO_NAMES = new Set(["gmail", "gmial", "gamil", "gmal", "gmai", "gmaill", "gnail", "gmaul"]);
const MIN_PASSWORD_LENGTH = 8;

function Register() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setMessageType("error");

    const validationError = getRegistrationError(username, email, password, confirmPassword);

    if (validationError) {
      setMessage(validationError);
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiFetch("/api/register", {
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
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <label className="auth-field">
              <span className="auth-field-label">Username</span>
              <span className="auth-input-shell">
                <span className="auth-input-icon" aria-hidden="true">♙</span>
                <input
                  type="text"
                  autoComplete="username"
                  maxLength={30}
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
                  autoComplete="email"
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
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
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

            <label className="auth-field">
              <span className="auth-field-label">Confirm password</span>
              <span className="auth-input-shell">
                <span className="auth-input-icon" aria-hidden="true">⌘</span>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Type your password again"
                  required
                />
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

function getRegistrationError(username, email, password, confirmPassword) {
  if (!username.trim()) {
    return "Choose a username.";
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return "Enter a valid email address, for example name@gmail.com.";
  }

  const [localPart, domain] = normalizedEmail.split("@");

  if (GMAIL_TYPO_NAMES.has(domain.split(".")[0]) && !["gmail.com", "googlemail.com"].includes(domain)) {
    return `Did you mean ${localPart}@gmail.com?`;
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }

  return "";
}

export default Register;
