// 📁 src/components/RatingModal.jsx
import "./RatingModal.css";
import React, { useState } from "react";
import ReactDOM from "react-dom";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useDispatch } from "react-redux";
import { submitRatingThunk } from "../../store/slices/ratingSlice";

const badgeVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.05 },
  selected: { scale: 1.02 },
};

function BadgeToggle({
  label,
  checked,
  onToggle,
  disabled,
  variant = "default",
}) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      className={`rating-badge ${variant} ${checked ? "selected" : ""} ${
        disabled ? "disabled" : ""
      }`}
      animate={checked ? "selected" : "rest"}
      whileHover={!disabled ? "hover" : "rest"}
      variants={badgeVariants}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      disabled={disabled}>
      {label}
    </motion.button>
  );
}

function ConnectionSlider({ value, onChange, disabled }) {
  const labels = ["Poor", "Fair", "Good", "Great", "Amazing"];
  const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#8b5cf6"];

  return (
    <div className="connection-slider-container">
      <label className="slider-label">Overall Connection</label>
      <div className="slider-wrapper">
        <input
          type="range"
          min="1"
          max="5"
          value={value}
          onChange={(e) => onChange(+e.target.value)}
          className="connection-slider"
          disabled={disabled}
          style={{
            background: `linear-gradient(to right, ${colors[value - 1]} 0%, ${
              colors[value - 1]
            } ${(value - 1) * 25}%, #e5e7eb ${
              (value - 1) * 25
            }%, #e5e7eb 100%)`,
          }}
        />
        <div className="slider-labels">
          {labels.map((label, index) => (
            <span
              key={index}
              className={`slider-label-item ${
                index === value - 1 ? "active" : ""
              }`}
              style={{
                color: index === value - 1 ? colors[index] : "#6b7280",
              }}>
              {label}
            </span>
          ))}
        </div>
      </div>
      <div className="slider-value" style={{ color: colors[value - 1] }}>
        {labels[value - 1]} Connection
      </div>
    </div>
  );
}

export default function RatingModal({
  onClose,
  name,
  rateeId,
  onRatingSubmitted,
}) {
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    safetyAndRespect: {
      madeMeFeelSafe: false,
      asDescribedInProfile: false,
      respectfulOfBoundaries: false,
    },
    connection: {
      greatConversationalist: false,
      activeListener: false,
      madeMeLaugh: false,
      wouldMeetAgain: false,
    },
    consideration: {
      onTime: false,
      attentive: false,
      goodManners: false,
      communicatedClearly: false,
    },
    qualities: {
      dressedWell: false,
      smelledNice: false,
      goodEnergy: false,
      charmingSmile: false,
      athletic: false,
      competitiveDrive: false,
      openToAnything: false,
    },
    didNotShowUp: false,
    cancelled: false,
    leftEarly: false,
    wouldRecommendToFriend: false,
    comments: "",
    connectionStrength: 3,
  });

  const handleBadge = (section, field) =>
    setForm((f) => ({
      ...f,
      [section]: {
        ...f[section],
        [field]: !f[section][field],
      },
    }));

  const handleSimpleBadge = (field) =>
    setForm((f) => ({ ...f, [field]: !f[field] }));

  const handleComments = (e) =>
    setForm((f) => ({ ...f, comments: e.target.value }));

  const handleSlider = (val) =>
    setForm((f) => ({ ...f, connectionStrength: val }));

  const handleSpecialStatus = (field) =>
    setForm((f) => ({
      ...f,
      [field]: !f[field],
      // If any special status is checked, reset positive feedback
      ...(field === "didNotShowUp" && !form.didNotShowUp
        ? {
            cancelled: false,
            leftEarly: false,
            safetyAndRespect: {
              madeMeFeelSafe: false,
              asDescribedInProfile: false,
              respectfulOfBoundaries: false,
            },
            connection: {
              greatConversationalist: false,
              activeListener: false,
              madeMeLaugh: false,
              wouldMeetAgain: false,
            },
            consideration: {
              onTime: false,
              attentive: false,
              goodManners: false,
              communicatedClearly: false,
            },
            qualities: {
              dressedWell: false,
              smelledNice: false,
              goodEnergy: false,
              charmingSmile: false,
              athletic: false,
              competitiveDrive: false,
              openToAnything: false,
            },
            wouldRecommendToFriend: false,
            comments: "",
            connectionStrength: 1,
          }
        : {}),
      ...(field === "cancelled" && !form.cancelled
        ? {
            didNotShowUp: false,
            leftEarly: false,
            safetyAndRespect: {
              madeMeFeelSafe: false,
              asDescribedInProfile: false,
              respectfulOfBoundaries: false,
            },
            connection: {
              greatConversationalist: false,
              activeListener: false,
              madeMeLaugh: false,
              wouldMeetAgain: false,
            },
            consideration: {
              onTime: false,
              attentive: false,
              goodManners: false,
              communicatedClearly: false,
            },
            qualities: {
              dressedWell: false,
              smelledNice: false,
              goodEnergy: false,
              charmingSmile: false,
              athletic: false,
              competitiveDrive: false,
              openToAnything: false,
            },
            wouldRecommendToFriend: false,
            comments: "",
            connectionStrength: 1,
          }
        : {}),
    }));

  const handleSubmit = async () => {
    // Enhanced confetti for positive ratings
    if (
      form.connectionStrength >= 4 ||
      form.wouldRecommendToFriend ||
      (form.safetyAndRespect.madeMeFeelSafe && form.connection.wouldMeetAgain)
    ) {
      // Multi-burst confetti effect
      const duration = 2000;
      const animationEnd = Date.now() + duration;
      const defaults = {
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        zIndex: 2000,
      };

      function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        // Left side burst
        confetti(
          Object.assign({}, defaults, {
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          })
        );

        // Right side burst
        confetti(
          Object.assign({}, defaults, {
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          })
        );
      }, 250);
    }

    const ratingData = {
      ...form,
      ratee: rateeId,
    };

    await dispatch(submitRatingThunk(ratingData));
    onRatingSubmitted();
    onClose();
  };

  const isSpecialStatus = form.didNotShowUp || form.cancelled;
  const positiveSignals =
    Object.values(form.safetyAndRespect).filter(Boolean).length +
    Object.values(form.connection).filter(Boolean).length;

  return ReactDOM.createPortal(
    <div className="dialog-overlay">
      <motion.div
        className="safety-dialog rating-modal"
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}>
        <button
          className="dialog-close"
          onClick={onClose}
          aria-label="Close rating modal">
          ×
        </button>

        <div className="modal-header">
          <h2 className="dialog-title">Rate Your Date</h2>
          <p className="date-name">{name}</p>
        </div>

        {/* Progress indicator */}
        <div className="progress-indicator">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(positiveSignals / 10) * 100}%` }}
            />
          </div>
          <span className="progress-text">
            {positiveSignals > 0
              ? `${positiveSignals} positive signals`
              : "Start rating your experience"}
          </span>
        </div>

        {/* Attendance Status */}
        <section className="rating-section">
          <h3 className="section-title">Attendance</h3>
          <div className="special-status-group">
            <BadgeToggle
              label="Did not show up"
              checked={form.didNotShowUp}
              onToggle={() => handleSpecialStatus("didNotShowUp")}
              variant="negative"
            />
            <BadgeToggle
              label="Cancelled"
              checked={form.cancelled}
              onToggle={() => handleSpecialStatus("cancelled")}
              variant="negative"
            />
            <BadgeToggle
              label="Left early"
              checked={form.leftEarly}
              onToggle={() => handleSimpleBadge("leftEarly")}
              disabled={isSpecialStatus}
              variant="warning"
            />
          </div>
        </section>

        <div className={isSpecialStatus ? "form-blur" : ""}>
          {/* Safety & Respect - Most Important Section */}
          <section className="rating-section priority">
            <h3 className="section-title">
              Safety & Respect
              <span className="priority-badge">Most Important</span>
            </h3>
            <div className="badge-group">
              {Object.entries(form.safetyAndRespect).map(([key, val]) => (
                <BadgeToggle
                  key={key}
                  label={(() => {
                    switch (key) {
                      case "madeMeFeelSafe":
                        return "Made me feel safe";
                      case "asDescribedInProfile":
                        return "Matched their profile";
                      case "respectfulOfBoundaries":
                        return "Respected boundaries";
                      default:
                        return key;
                    }
                  })()}
                  checked={val}
                  onToggle={() => handleBadge("safetyAndRespect", key)}
                  disabled={isSpecialStatus}
                  variant="safety"
                />
              ))}
            </div>
          </section>

          {/* Connection */}
          <section className="rating-section">
            <h3 className="section-title">Connection & Chemistry</h3>
            <div className="badge-group">
              {Object.entries(form.connection).map(([key, val]) => (
                <BadgeToggle
                  key={key}
                  label={(() => {
                    switch (key) {
                      case "greatConversationalist":
                        return "Great conversationalist";
                      case "activeListener":
                        return "Good listener";
                      case "madeMeLaugh":
                        return "Made me laugh";
                      case "wouldMeetAgain":
                        return "Would meet again";
                      default:
                        return key;
                    }
                  })()}
                  checked={val}
                  onToggle={() => handleBadge("connection", key)}
                  disabled={isSpecialStatus}
                  variant="connection"
                />
              ))}
            </div>
          </section>

          {/* Overall Connection Slider */}
          <section className="rating-section">
            <ConnectionSlider
              value={form.connectionStrength}
              onChange={handleSlider}
              disabled={isSpecialStatus}
            />
          </section>

          {/* Consideration */}
          <section className="rating-section">
            <h3 className="section-title">Consideration & Manners</h3>
            <div className="badge-group">
              {Object.entries(form.consideration).map(([key, val]) => (
                <BadgeToggle
                  key={key}
                  label={(() => {
                    switch (key) {
                      case "onTime":
                        return "On time";
                      case "attentive":
                        return "Attentive";
                      case "goodManners":
                        return "Good manners";
                      case "communicatedClearly":
                        return "Clear communication";
                      default:
                        return key;
                    }
                  })()}
                  checked={val}
                  onToggle={() => handleBadge("consideration", key)}
                  disabled={isSpecialStatus}
                  variant="consideration"
                />
              ))}
            </div>
          </section>

          {/* Qualities */}
          <section className="rating-section">
            <h3 className="section-title">Personal Qualities</h3>
            <div className="badge-group qualities-grid">
              {Object.entries(form.qualities).map(([key, val]) => (
                <BadgeToggle
                  key={key}
                  label={(() => {
                    const map = {
                      dressedWell: "Well dressed",
                      smelledNice: "Good hygiene",
                      goodEnergy: "Positive energy",
                      charmingSmile: "Charming smile",
                      athletic: "Athletic",
                      competitiveDrive: "Competitive",
                      openToAnything: "Open-minded",
                    };
                    return map[key] || key;
                  })()}
                  checked={val}
                  onToggle={() => handleBadge("qualities", key)}
                  disabled={isSpecialStatus}
                  variant="quality"
                />
              ))}
            </div>
          </section>

          {/* Overall Recommendation */}
          <section className="rating-section highlight">
            <h3 className="section-title">Final Assessment</h3>
            <div className="recommendation-badge">
              <BadgeToggle
                label="Gold Star Date"
                checked={form.wouldRecommendToFriend}
                onToggle={() => handleSimpleBadge("wouldRecommendToFriend")}
                disabled={isSpecialStatus}
                variant="recommendation"
              />
            </div>
          </section>

          {/* Comments */}
          <section className="rating-section">
            <h3 className="section-title">Additional Comments</h3>
            <div className="comment-container">
              <textarea
                value={form.comments}
                onChange={handleComments}
                placeholder="Share your thoughts about the date experience..."
                rows={3}
                className="comment-textarea"
                disabled={isSpecialStatus}
                maxLength={500}
              />
              <div className="comment-footer">
                <span className="comment-help">
                  Your feedback helps build a safer community
                </span>
                <span className="comment-count">
                  {form.comments.length}/500
                </span>
              </div>
            </div>
          </section>
        </div>

        <div className="dialog-buttons">
          <button className="dialog-btn back" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`dialog-btn info ${
              positiveSignals > 5 ? "positive" : ""
            }`}
            onClick={handleSubmit}>
            Submit Rating
          </button>
        </div>
      </motion.div>
    </div>,
    document.getElementById("modal-root")
  );
}
