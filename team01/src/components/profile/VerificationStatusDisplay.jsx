import React, { useState, useEffect } from "react";
import "./VerificationStatusDisplay.css";
import {
  submitVerification,
  getVerificationStatus,
} from "../../utils/api/verification";

const VerificationStatusDisplay = ({ onOpenModal }) => {
  const [isVerified, setIsVerified] = useState(false);
  const [status, setStatus] = useState("not_submitted");
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [verifiedAt, setVerifiedAt] = useState(null);

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    setIsLoading(true);
    try {
      const data = await getVerificationStatus();
      setIsVerified(data.isVerified);
      setStatus(data.status);
      setScore(data.score);
      setVerifiedAt(data.verifiedAt);
    } catch (err) {
      console.error("Failed to check verification status:", err);
    }
    setIsLoading(false);
  };

  const getStatusInfo = () => {
    switch (status) {
      case "approved":
        return {
          icon: "✅",
          text: "ID Verified",
          className: "verified",
        };
      case "rejected":
        return {
          icon: "❌",
          text: "Verification Failed",
          className: "rejected",
        };
      case "pending":
        return {
          icon: "⏳",
          text: "Under Review",
          className: "pending",
        };
      default:
        return {
          icon: "🔒",
          text: "Not Verified",
          className: "not-verified",
        };
    }
  };

  const statusInfo = getStatusInfo();

  if (isLoading) {
    return (
      <div className="verification-status-display loading">
        <div className="verification-status-info">
          <div className="verification-status-icon">🔒</div>
          <div className="verification-status-details">
            <span className="verification-status-text verification-loading-text">
              Checking verification status
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`verification-status-display ${statusInfo.className}`}>
      <div className="verification-status-info">
        <div className="verification-status-icon">{statusInfo.icon}</div>
        <div className="verification-status-details">
          <span className="verification-status-text">{statusInfo.text}</span>
          {isVerified && score > 0 && (
            <span className="verification-status-subtext">
              Score: {score}/100 • Verified{" "}
              {verifiedAt && new Date(verifiedAt).toLocaleDateString()}
            </span>
          )}
          {status === "rejected" && (
            <span className="verification-status-subtext error">
              Try again with clearer photos
            </span>
          )}
        </div>
      </div>

      {!isVerified && (
        <button
          onClick={onOpenModal}
          className={`verification-verify-btn ${
            status === "rejected" ? "retry" : ""
          }`}>
          {status === "rejected" ? "Try Again" : "Verify ID"}
        </button>
      )}

      {isVerified && (
        <div className="verification-verified-badge">
          <span>Trusted Member</span>
          <span className="verification-verified-badge-icon">🏆</span>
        </div>
      )}
    </div>
  );
};

export default VerificationStatusDisplay;
