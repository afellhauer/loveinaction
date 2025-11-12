// 📁 src/components/ProfileCard.jsx
import React from "react";
import { sanitizeInput } from "../../utils/sanitize";
import "./ProfileCard.css";

export default function ProfileCard({
  name,
  age,
  activity,
  location,
  time,
  timeOfDay,
  image,
  bio,
  safetyScore = 0,
  badges = [],
  gender,
  socialMedia = {},
  isIdVerified = false,
  onViewSafety,
  onClose,
  isNewUser = false,
}) {

  const handleViewSafety = () => {
    if (onViewSafety) onViewSafety({ safetyScore, badges });
  };

  const sanitizedBio = sanitizeInput(bio || "No bio available.");
  const sanitizedName = sanitizeInput(name || "");

  return (
    <div className="profile-card">
      {/* Safety Score Bar */}
      <div
        className="safety-bar"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
        onClick={handleViewSafety}
      >
        <span>View Safety Score</span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          {isNewUser && (
            <span className="new-user-badge">
              <span className="new-user-star">⭐</span> New User
            </span>
          )}
          {!isNewUser && (
            <div className="score-badge">{safetyScore}%</div>
          )}
        </div>
      </div>

      {/* Name, Age, Photo with Verification Badge */}
      <div className="profile-header">
        <h2 className="profile-name">
          {sanitizedName}, {age}
          {isIdVerified && (
            <span className="verification-badge" title="ID Verified">
              ✓
            </span>
          )}
        </h2>
      </div>
      {image && <img className="profile-img" src={image} alt="Profile" />}

      {/* Activity Intent */}
      <p className="profile-activity">
        {sanitizedName} wants to {activity}!
      </p>

      {/* Where / When / Time of Day */}
      <div className="profile-fields">
        <div className="field-label">Where:</div>
        <div className="field-value">{location}</div>
      </div>
      <div className="profile-fields">
        <div className="field-label">When:</div>
        <div className="field-value">{time}</div>
      </div>
      <div className="profile-fields">
        <div className="field-label">Time of Day:</div>
        <div className="field-value">{timeOfDay}</div>
      </div>
      {gender && (
        <div className="profile-fields">
          <div className="field-label">Gender:</div>
          <div className="field-value">{gender}</div>
        </div>
      )}

      <hr />

      {/* Bio */}
      <h3>About {sanitizedName}</h3>
      <p className="profile-about">{sanitizedBio}</p>

      {/* Social Media Handles */}
      {(socialMedia.instagram ||
        socialMedia.snapchat ||
        socialMedia.tiktok) && (
        <div className="social-media">
          <h4>Connect with {sanitizedName}</h4>
          <div className="social-links">
            {socialMedia.instagram && (
              <span className="social-handle">
                📸 {sanitizeInput(socialMedia.instagram)}
              </span>
            )}
            {socialMedia.snapchat && (
              <span className="social-handle">
                👻 {sanitizeInput(socialMedia.snapchat)}
              </span>
            )}
            {socialMedia.tiktok && (
              <span className="social-handle">
                🎵 {sanitizeInput(socialMedia.tiktok)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Optional Close Button (for modals) */}
      {onClose && (
        <button className="dialog-btn back" onClick={onClose}>
          Close
        </button>
      )}
    </div>
  );
}
