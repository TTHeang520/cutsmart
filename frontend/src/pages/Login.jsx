import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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

      navigate("/dashboard");
    } catch {
      setMessage("Could not connect to the server.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <p className="brand-name">CutSmart</p>
        <h1>Login</h1>
        <p className="page-copy">Welcome back. Sign in to continue.</p>

        <form onSubmit={handleSubmit} className="auth-form">
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

          {message && <p className="form-message">{message}</p>}

          <button type="submit" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="auth-link">
          Need an account? <Link to="/register">Register</Link>
        </p>
      </section>
    </main>
  );
}

export default Login;
