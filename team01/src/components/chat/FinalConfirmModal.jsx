// FinalConfirmModal.jsx
import { createPortal } from "react-dom";
import "../safety-score/SafetyScoreDialog.css"; // reuse dialog styles

export default function FinalConfirmModal({ onClose, onConfirm, latestPlanMessage }) {
    return createPortal(
        <div className="dialog-overlay suggest-plan-overlay">
            <div className="safety-dialog">
                <button className="dialog-close" onClick={onClose}>×</button>
                <h2 className="dialog-title">Confirm Your Plans</h2>

                <p className="dialog-body">Here's your most recent plan:</p>
                <div className="plan-preview">
                    <em>{latestPlanMessage?.content || "No plan message found."}</em>
                </div>

                <p className="dialog-body">
                    Finalizing your date means you’re committing to attend. If you don’t show up without notice,
                    it may affect your safety score and future matches.
                </p>

                <div className="dialog-buttons">
                    <button className="dialog-btn back" onClick={onClose}>Go Back</button>
                    <button className="dialog-btn confirm" onClick={onConfirm}>Yes, Confirm</button>
                </div>
            </div>
        </div>,
        document.body
    );
}
