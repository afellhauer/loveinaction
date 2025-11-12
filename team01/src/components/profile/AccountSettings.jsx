import { useState } from "react";
import "./AccountSettings.css";
import DeactivateModal from "./DeactivateModal";

export default function AccountSettings() {
    const [showDangerZone, setShowDangerZone] = useState(false);
    const [showDeactivateConfirmation, setShowDeactivateConfirmation] = useState(false);


    return (
        <div className="account-settings-container">
            <button
                type="button"
                className="profile-details-page-btn cancel"
                onClick={() => setShowDangerZone(!showDangerZone)}
            >
                {showDangerZone ? "Hide Account Options" : "Show Account Options"}
            </button>

            {showDangerZone && (
                <div className="deactivate-account-section">
                    <hr className="section-divider" />
                    <h4 className="danger-zone-title">Danger Zone</h4>
                    <p className="danger-zone-description">
                        Deactivating your account will make your profile invisible.
                        You can log in again at any time to reactivate.
                    </p>
                    <button
                        className="deactivate-button"
                        onClick={() => setShowDeactivateConfirmation(true)}
                    >
                        Deactivate Account
                    </button>
                </div>
            )}

            <DeactivateModal
                isOpen={showDeactivateConfirmation}
                onClose={() => setShowDeactivateConfirmation(false)}
            />
        </div>
    );
}

