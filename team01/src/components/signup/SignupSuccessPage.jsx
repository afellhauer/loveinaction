import React from "react";
import { useNavigate } from "react-router-dom";
import "./SignupSuccessPage.css";

export default function SignupSuccessPage() {
  const navigate = useNavigate();

  return (
    <div className="success-bg">
      <div className="success-card">
        <h2 className="success-title">Almost There!</h2>
        <p className="success-message">
          We’ve sent a verification link to your email. Please click it to
          verify your account.
        </p>
        <button
          className="success-login-btn"
          onClick={() => navigate("/login")}>
          Back to Login
        </button>
      </div>
    </div>
  );
}
