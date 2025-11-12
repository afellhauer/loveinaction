// 📁 src/components/ProfileCard.jsx
import React, {useRef} from "react";
import { sanitizeInput } from "../../utils/sanitize";
import "./ProfileCard.css";
import {createPortal} from "react-dom";


export default function ViewProfileCardModal({
    name,
    age,
    image,
    bio,
    safetyScore = 0,
    gender,
    socialMedia = {},
    onClose,
    onShowSafety}) {



    const sanitizedBio = sanitizeInput(bio || 'No bio available.');
    const sanitizedName = sanitizeInput(name || '');

    const overlayRef = useRef(null);
    const handleClickOutside = (e) => {
        if (e.target === overlayRef.current && onClose) {
            onClose();
        }
    };

    return createPortal(
        <div className="dialog-overlay suggest-plan-overlay"
             ref={overlayRef}
             onClick={handleClickOutside}>
        <div className="profile-card static">
            {/* Safety Score Bar */}
            <div className="safety-bar" onClick={onShowSafety}>
                <span>View Safety Score</span>
                <div className="score-badge">{safetyScore}%</div>
            </div>

            {/* Name, Age, Photo */}
            <h2 className="profile-name">
                {sanitizedName}, {age}
            </h2>
            {image && <img className="profile-img" src={image} alt="Profile" />}

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
                            <span className="social-handle">📸 {sanitizeInput(socialMedia.instagram)}</span>
                        )}
                        {socialMedia.snapchat && (
                            <span className="social-handle">👻 {sanitizeInput(socialMedia.snapchat)}</span>
                        )}
                        {socialMedia.tiktok && (
                            <span className="social-handle">🎵 {sanitizeInput(socialMedia.tiktok)}</span>
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
        </div>,
        document.body
    );
}
