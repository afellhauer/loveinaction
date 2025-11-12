import React from "react";
import "../AlertCard.css";

export default function UpcomingCard({ title, message, onClose }) {
  return (
    <div className="alert-card alert-blue">
      <div className="alert-text">
        <h3>{title}</h3>
        <p>{message}</p>
      </div>
      <button className="alert-close" onClick={onClose}>×</button>
    </div>
  );
}
