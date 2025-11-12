// 📁 src/components/VerifyPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import "./VerifyPage.css";

export default function VerifyPage() {
  const navigate = useNavigate();

  return (
    <div className="verify-bg">
      <div className="verify-card">
        <h2 className="verify-title">Email Verified! 🎉</h2>
        <p className="verify-message">
          Your email has been successfully verified. Next, sign in to complete
          your profile.
        </p>
        <button
          className="verify-login-btn"
          onClick={() => {
            // Tell the login page where to go next
            navigate("/login", { state: { next: "/complete-profile" } });
          }}>
          Sign In & Complete Profile
        </button>
      </div>
    </div>
  );
}
