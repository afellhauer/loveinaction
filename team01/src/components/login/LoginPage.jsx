import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { login as apiLogin, reactivateAccount as apiReactivateAccount } from "../../utils/api";
import { validateSessionMessage } from "../../utils/sanitize";
import "./LoginPage.css";

export default function LoginPage({ onLogin, errorMsg: externalError }) {
  const navigate = useNavigate();
  const location = useLocation();

  // If someone came here with { state: { next: "/complete-profile" } },
  // use that; otherwise default to home.
  const redirectTo = location.state?.next || "/app/home";
  const params = new URLSearchParams(location.search);
  const rawSessionMessage = params.get("message");
  
  // Validate the session message against our whitelist - only allow legitimate messages
  const sessionMessage = rawSessionMessage ? validateSessionMessage(rawSessionMessage) : null;

  const [username, setUsername] = useState(""); // holds the user's email
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Show either a server-side error or a local validation error
  const errorMsgToShow = externalError || localError;
  const [successMsgToShow, setSuccessMsgToShow] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    setIsLoading(true);

    if (!username || !password) {
      setLocalError("Please enter both email and password.");
      setIsLoading(false);
      return;
    }

    try {
      const { user, accessToken, refreshToken } = await apiLogin({
        email: username,
        password,
      });

      // 1) Store tokens
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);

      // 2) Let App.jsx know login succeeded
      onLogin(user, { accessToken, refreshToken });

      // 3) Navigate to the next page (e.g. "/complete-profile" or "/app/home")
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setLocalError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const reactivateAccount = async () => {
    setIsLoading(true);
    setLocalError("");

    if (!username || !password) {
      setLocalError("Please enter both email and password.");
      setIsLoading(false);
      return;
    }
    try {
      await apiReactivateAccount({
        email: username,
        password,
      });
      setSuccessMsgToShow("Reactivation successful! You can now log in.");
    } catch (err) {
      setLocalError(err.message || "Reactivation failed");
    } finally {
      setIsLoading(false);
    }

  }

  return (
    <div className="login-bg">
      <div className="login-header">
        <h1 className="login-main-title">
          Love In <span className="login-main-title-accent">Action</span>
        </h1>
      </div>

      <div className="login-card-split">
        <div className="login-info-side">
          <p>
            Discover meaningful matches and build real relationships by doing
            what you love—together.
          </p>
          <div className="about-link">
            <button
              type="button"
              onClick={() => navigate("/about")}
              className="about-link-btn">
              Learn more about us →
            </button>
          </div>
        </div>

        <div className="login-form-side">
          <h2 className="login-title">Login</h2>

          {sessionMessage && (
            <div className="session-expiry-message">{sessionMessage}</div>
          )}

          {errorMsgToShow && (
            <div className="login-error">{errorMsgToShow}</div>
          )}
          {successMsgToShow !== '' && (
            <div className="login-success">{successMsgToShow}</div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            {errorMsgToShow.includes("deactivated") && (
                <button
                    type="button"
                    className="reactivate-link-btn"
                    onClick={reactivateAccount}
                >
                  Reactivate Account?
                </button>
            )}
            <div className="login-field">
              <label className="login-label">Email:</label>
              <input
                className="login-input"
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="enter your email"
                required
              />
            </div>

            <div className="login-field">
              <label className="login-label">Password:</label>
              <input
                className="login-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="enter your password"
                required
              />
            </div>

            <button type="submit" className="login-btn" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="signup-link">
            <span>Don't have an account? </span>
            <button
              type="button"
              onClick={() => navigate("/signup")}
              className="signup-link-btn">
              Sign up!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}