import {createPortal} from "react-dom";
import {useState} from "react";
import "./ProvideContactInfoModal.css";

export default function ProvideContactInfoModal({ userEmail, onClose, onSend }) {
    const [sendEmail, setSendEmail] = useState(false);
    const [phone, setPhone] = useState("");
    const [sent, setSent] = useState(false);

    const handlePhoneChange = (e) => setPhone(e.target.value);
    const handleEmailCheck = (e) => setSendEmail(e.target.checked);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!sent) {
            const payload = { email: sendEmail ? userEmail : undefined, phone: phone.trim() };
            onSend(payload);
            setSent(true);
            onClose();
        }
    };

    return createPortal(
        <div className="dialog-overlay contact-info-overlay">
        <div className="safety-dialog">
            <button className="dialog-close" onClick={onClose}>×</button>
            <h2 className="dialog-title">Provide Contact Information</h2>
            <div className="contact-info-warning">
                ⚠️ You can only send your contact info once per match. Please double-check before sending.
            </div>
            <form className="login-form" onSubmit={handleSubmit}>
                <div className="login-field">
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={sendEmail}
                            onChange={handleEmailCheck}
                        />
                        Send my email
                    </label>
                </div>
                {sendEmail && (
                    <div className="login-field">
                        <label className="login-label">Email</label>
                        <input
                            type="email"
                            className="contact-info-input large-input"
                            value={userEmail || ''}
                            readOnly
                            style={{ background: '#f5f5f5', color: '#888' }}
                        />
                    </div>
                )}
                <div className="login-field">
                    <label className="login-label">Phone</label>
                    <input
                        type="tel"
                        className="contact-info-input large-input"
                        placeholder="Enter your phone number"
                        value={phone}
                        onChange={handlePhoneChange}
                        pattern="[0-9\-\+\s\(\)]*"
                    />
                </div>
                <button
                    type="submit"
                    className={`dialog-btn confirm${sent ? " disabled" : ""}`}
                    disabled={sent || (!sendEmail && !phone.trim())}
                >
                    <span>{sent ? "Sent" : "Send"}</span>
                </button>
            </form>
        </div>
        </div>,
        document.body
    );
}