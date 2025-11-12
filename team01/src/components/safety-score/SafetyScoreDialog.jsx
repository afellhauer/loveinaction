// 📁 src/components/SafetyScoreDialog.jsx
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  setShowSafety,
  setShowMoreInfo,
} from "../../store/slices/userFlagsSlice";
import "./SafetyScoreDialog.css";

export default function SafetyScoreDialog() {
  const dispatch = useDispatch();

  // Pull dynamic safety score and badges from redux state
  // (Assumes you have stored them in userFlags.safetyPayload)
  const { safetyScore = 0, badges = [] } =
    useSelector((state) => state.userFlags.safetyPayload) || {};

  const onClose = () => {
    dispatch(setShowSafety(false));
  };

  const onMoreInfo = () => {
    dispatch(setShowMoreInfo(true));
  };

  return (
    <div className="dialog-overlay">
      <div className="safety-dialog">
        <button className="dialog-close" onClick={onClose}>
          ×
        </button>

        {/* Show the numeric safety score */}
        <h2 className="dialog-title">Safety Score: {safetyScore}%</h2>

        {/* Badges section */}
        <div className="badges-section">
          <h3>Badges Earned</h3>
          <div className="badge-list">
            {badges.length > 0 ? (
              badges.map((badge) => (
                <div key={badge} className="badge-item">
                  {badge}
                </div>
              ))
            ) : (
              <div className="badge-item placeholder">No badges earned yet</div>
            )}
          </div>
        </div>

        <div className="dialog-buttons">
          <button className="dialog-btn back" onClick={onClose}>
            BACK
          </button>
          <button className="dialog-btn info" onClick={onMoreInfo}>
            MORE INFO
          </button>
        </div>
      </div>
    </div>
  );
}
