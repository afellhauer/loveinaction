import React from "react";
import { createPortal } from "react-dom";

export default function SafetyScoreDialog({
                                              safetyScore = 0,
                                              badges = [],
                                              onClose,
                                          }) {
    const dialog = (
        <div className="dialog-overlay safety-dialog-overlay">
            <div className="safety-dialog">
                <button className="dialog-close" onClick={onClose}>
                    ×
                </button>

                <h2 className="dialog-title">Safety Score: {safetyScore}%</h2>

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
                            <div className="badge-item placeholder">
                                No badges earned yet
                            </div>
                        )}
                    </div>
                </div>

                <div className="moreinfo-content">
                    <p>
                        The Safety Score system is designed to enhance user safety and trust within the platform.
                        It evaluates user interactions based on various criteria, including:
                    </p>
                    <ul>
                        <li>Verified ID status</li>
                        <li>Feedback on safety and respect during interactions</li>
                        <li>Connection quality, such as conversation skills and active listening</li>
                    </ul>
                    <p>
                        Users can earn badges for completing safety checks and maintaining a positive interaction history.
                    </p>
                </div>

                <div className="dialog-buttons">
                    <button className="dialog-btn back" onClick={onClose}>
                        BACK
                    </button>
                </div>

            </div>
        </div>
    );

    return createPortal(dialog, document.body);
}
