import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false); // Loading state
  const navigate = useNavigate(); // React Router navigation

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !pwd.trim()) {
      return alert("Email aur password daal");
    }

    try {
      setLoading(true);
      const res = await fetch("http://localhost:5000/login", {
        // ✅ Full backend URL
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pwd }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem("token", data.token);
        alert("Login successful ✅");
        navigate("/dashboard"); // ✅ Redirect after login
      } else {
        alert(data.message || "Login failed");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="brand">
          <div className="logo">SI</div>
          <h2>SEO Cache Invalidator</h2>
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="pwd">Password / OTP</label>
          <input
            id="pwd"
            type="password"
            placeholder="*****"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            autoComplete="current-password"
            disabled={loading}
          />
        </div>

        <div className="actions">
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
          <div className="secondary-row">
            <button
              type="button"
              className="forgot-password-btn"
              onClick={(e) => {
                e.preventDefault();
                alert("Forgot password feature coming soon");
              }}
              aria-label="Forgot your password? Click to learn more."
            >
              Forgot?
            </button>

            <div className="note">Access only 12–1 PM &amp; 8–9 PM IST</div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Login;
