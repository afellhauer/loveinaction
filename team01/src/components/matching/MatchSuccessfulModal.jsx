// src/components/RatingModal.jsx
import React from "react";
import "../safety-score/SafetyScoreDialog.css";
import { useNavigate } from "react-router-dom";

export default function MatchSuccessfulModal({ onClose, profile }) {
    const navigate = useNavigate();

    const onNavigate = () => {
        onClose();
        navigate("/loveinaction/chat");

    }

  // build full name from the snapshot
  const fullName = `${profile.firstName} ${profile.lastName}`;

  return (
    <div className="dialog-overlay">
      <div className="safety-dialog">
        <button className="dialog-close" onClick={onClose}>
          ×
        </button>
        <h2 className="dialog-title">YOU MADE A MATCH</h2>
        <div>
          <p>
            You matched with <strong>{fullName}</strong>!
          </p>
        </div>
        <div className="dialog-buttons">
          <button className="dialog-btn back" onClick={onClose}>
            BACK
          </button>
          <button className="dialog-btn info" onClick={onNavigate}>
            GO TO CHAT
          </button>
        </div>
      </div>
    </div>
  );
}
