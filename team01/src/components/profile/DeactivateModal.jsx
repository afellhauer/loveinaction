import React, { useState } from "react";
import ReactDOM from "react-dom";
import "./DeactivateModal.css";
import {useDispatch} from "react-redux";
import {useNavigate} from "react-router-dom";
import {deactivateAccount} from "../../utils/api/index.js";
import {persistor} from "../../store/store.js";
import {logout, setLoggedIn, setSideBarOpen} from "../../store/slices/userFlagsSlice.js";
import {clearCurrentUser} from "../../store/slices/profilesSlice.js";

export default function DeactivateModal({ isOpen, onClose }) {
    const [selectedReason, setSelectedReason] = useState("");
    const [otherReason, setOtherReason] = useState("");
    const [password, setPassword] = useState("");
    const [deactivateError, setDeactivateError] = useState("");


    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleDeactivate = async () => {
        const reason =
            selectedReason === other ? otherReason.trim() : selectedReason;
        try {
            await deactivateAccount({
                reason: reason,
                password: password
            });
            console.log("Account deactivated!");
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            persistor.purge().then(() => {
                dispatch(logout());
                dispatch(clearCurrentUser());
                dispatch(setLoggedIn(false));
                dispatch(setSideBarOpen(false));
                navigate("/login");
            });
        } catch(error) {
            console.error("Error deactivating account:", error);
            setDeactivateError(error.message)
        }

    };

    // REASONS
    const reason1 = "I no longer use this"
    const reason2 = "I want to take a break"
    const reason3 = "I had a bad experience"
    const reason4 = "I found a match"
    const other = "Other"

    if (!isOpen) return null;


    const isOtherSelected = selectedReason === other;
    const isReasonValid =
        selectedReason && (!isOtherSelected || otherReason.trim() !== "");
    const isPasswordValid = password.trim() !== "";
    const isDeactivateDisabled = !isReasonValid || !isPasswordValid;

    return ReactDOM.createPortal(
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="deactivation-error" hidden={deactivateError === ''}>{deactivateError}</div>
                <h3>Are you sure you want to deactivate your account?</h3>
                <p>Your profile will be hidden and you can reactivate it anytime by logging back in.</p>

                <div className="deactivation-reason">
                    <label className="radio-label">
                        <input
                            type="radio"
                            name="reason"
                            value={reason1}
                            checked={selectedReason === reason1}
                            onChange={(e) => setSelectedReason(e.target.value)}
                        />
                        {reason1}
                    </label>
                    <label className="radio-label">
                        <input
                            type="radio"
                            name="reason"
                            value={reason2}
                            checked={selectedReason === reason2}
                            onChange={(e) => setSelectedReason(e.target.value)}
                        />
                        {reason2}
                    </label>
                    <label className="radio-label">
                        <input
                            type="radio"
                            name="reason"
                            value={reason3}
                            checked={selectedReason === reason3}
                            onChange={(e) => setSelectedReason(e.target.value)}
                        />
                        {reason3}
                    </label>
                    <label className="radio-label">
                        <input
                            type="radio"
                            name="reason"
                            value={reason4}
                            checked={selectedReason === reason4}
                            onChange={(e) => setSelectedReason(e.target.value)}
                        />
                        {reason4}
                    </label>
                    <label className="radio-label">
                        <input
                            type="radio"
                            name="reason"
                            value={other}
                            checked={selectedReason === other}
                            onChange={(e) => setSelectedReason(e.target.value)}
                        />
                        {other}
                    </label>

                    {isOtherSelected && (
                        <textarea
                            className="other-reason-input"
                            placeholder="Please specify..."
                            value={otherReason}
                            onChange={(e) => setOtherReason(e.target.value)}
                            rows="3"
                        />
                    )}
                </div>

                {/* Password Input */}
                <div className="password-confirmation">
                    <label htmlFor="deactivation-password">🔒 Confirm Password</label>
                    <input
                        id="deactivation-password"
                        type="password"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value)
                            setDeactivateError("")
                        }}
                        placeholder="Enter your password"
                        className="password-input"
                    />
                </div>

                <div className="modal-buttons">
                    <button className="cancel-button" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="confirm-button"
                        onClick={handleDeactivate}
                        disabled={isDeactivateDisabled}
                    >
                        Deactivate
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
