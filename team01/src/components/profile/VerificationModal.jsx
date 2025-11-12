import React, { useState, useEffect } from "react";
import "./VerificationModal.css";
import {
  submitVerification,
  getVerificationStatus,
} from "../../utils/api/verification";
import ReactDOM from "react-dom";

const VerificationModal = ({ isOpen, onClose, onSuccess, user }) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    idType: "",
    idPhoto: null,
    selfie: null,
  });
  const [previewImages, setPreviewImages] = useState({
    idPhoto: null,
    selfie: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const idTypes = [
    { value: "drivers_license", label: "Driver's License" },
    { value: "passport", label: "Passport" },
    { value: "state_id", label: "State ID Card" },
    { value: "military_id", label: "Military ID" },
    { value: "national_id", label: "National ID" },
  ];

  // Helper function to format date for input
  const formatDateForInput = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  };

  // Pre-fill form with user data when modal opens or user data changes
  useEffect(() => {
    if (user && isOpen) {
      setFormData((prev) => ({
        ...prev,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        dateOfBirth: formatDateForInput(user.dateOfBirth) || "",
      }));
    }
  }, [user, isOpen]);

  // Close modal when clicking outside
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const handleFileChange = (fieldName, file) => {
    if (file && file.type.startsWith("image/")) {
      setFormData((prev) => ({ ...prev, [fieldName]: file }));
      setPreviewImages((prev) => ({
        ...prev,
        [fieldName]: URL.createObjectURL(file),
      }));
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.idPhoto || !formData.selfie) {
      setError("Both ID photo and selfie are required");
      return;
    }

    if (!formData.idType) {
      setError("Please select your ID type");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const submitData = new FormData();
    submitData.append("firstName", formData.firstName);
    submitData.append("lastName", formData.lastName);
    submitData.append("dateOfBirth", formData.dateOfBirth);
    submitData.append("idType", formData.idType);
    submitData.append("idPhoto", formData.idPhoto);
    submitData.append("selfie", formData.selfie);

    try {
      const resultData = await submitVerification(submitData);
      setResult(resultData);
      if (resultData.verified) {
        setTimeout(() => {
          onSuccess(resultData);
          onClose();
        }, 2000);
      }
    } catch (err) {
      setError(err.message || "Verification failed");
    }

    setIsSubmitting(false);
  };

  const resetForm = () => {
    setFormData({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      dateOfBirth: formatDateForInput(user?.dateOfBirth) || "",
      idType: "",
      idPhoto: null,
      selfie: null,
    });
    setPreviewImages({
      idPhoto: null,
      selfie: null,
    });
    setError("");
    setResult(null);
  };

  const getUploadInstructions = () => {
    switch (formData.idType) {
      case "drivers_license":
        return {
          title: "Driver's License Photo",
          instructions:
            "Ensure all text is clear and readable. Include the full card with all corners visible.",
        };
      case "passport":
        return {
          title: "Passport Photo Page",
          instructions:
            "Photograph the main page with your photo and personal details. Ensure the machine-readable zone is visible.",
        };
      case "state_id":
        return {
          title: "State ID Card Photo",
          instructions:
            "Include the full card with all text clearly visible. Make sure there's no glare or shadows.",
        };
      case "military_id":
        return {
          title: "Military ID Photo",
          instructions:
            "Photograph the front of your CAC or military ID. Ensure all text is legible.",
        };
      case "national_id":
        return {
          title: "National ID Photo",
          instructions:
            "Include the full document with all security features visible.",
        };
      default:
        return {
          title: "Government ID Photo",
          instructions: "Select your ID type above for specific instructions.",
        };
    }
  };

  const uploadInstructions = getUploadInstructions();

  if (!isOpen) return null;

  // Show result screen
  if (result) {
    return (
      <div className="verification-modal-overlay" onClick={handleBackdropClick}>
        <div className="verification-result-modal">
          <div
            className={`verification-result-icon ${
              result.verified ? "success" : "failed"
            }`}>
            {result.verified ? "✅" : "❌"}
          </div>

          <h3 className="verification-result-title">
            {result.verified
              ? "Verification Successful!"
              : "Verification Failed"}
          </h3>

          <p className="verification-result-message">{result.message}</p>

          <div className="verification-result-details">
            <p className="verification-result-score">
              Score: {result.score}/100
            </p>
            <div className="verification-result-reasons">
              {result.reasons &&
                result.reasons.map((reason, index) => (
                  <div key={index} className="verification-result-reason">
                    {reason}
                  </div>
                ))}
            </div>
            {result.documentAnalysis && (
              <div className="verification-document-analysis">
                <h4>Document Analysis:</h4>
                <ul>
                  <li>
                    Document Type:{" "}
                    {result.documentAnalysis.documentType || "Unknown"}
                  </li>
                  <li>
                    Authenticity:{" "}
                    {result.documentAnalysis.authentic
                      ? "Verified"
                      : "Could not verify"}
                  </li>
                  <li>
                    Expiration:{" "}
                    {result.documentAnalysis.expired ? "Expired" : "Valid"}
                  </li>
                </ul>
              </div>
            )}
          </div>

          <div className="verification-result-actions">
            {!result.verified && (
              <button
                onClick={() => {
                  setResult(null);
                  resetForm();
                }}
                className="verification-modal-btn">
                Try Again
              </button>
            )}
            <button onClick={onClose} className="verification-modal-btn cancel">
              {result.verified ? "Continue" : "Close"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="verification-modal-overlay" onClick={handleBackdropClick}>
      <div className="verification-modal">
        {/* Header */}
        <div className="verification-modal-header">
          <h2 className="verification-modal-title">🛡️ ID Verification</h2>
          <button onClick={onClose} className="verification-modal-close">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="verification-modal-content">
          {/* Security notice */}
          <div className="verification-security-notice">
            <div className="verification-security-header">
              <span className="verification-security-icon">🔐</span>
              <h3 className="verification-security-title">
                Advanced Document Verification
              </h3>
            </div>
            <p className="verification-security-text">
              We use AWS AI services to verify document authenticity, check
              security features, and ensure your ID is legitimate. Your images
              are encrypted, processed automatically, and deleted after
              verification.
            </p>
          </div>

          {/* Form */}
          <div className="verification-form">
            <div className="verification-form-row">
              <div className="verification-form-field">
                <label className="verification-form-label">First Name</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                  required
                  placeholder="As shown on ID"
                  className="verification-form-input"
                  readOnly={!!user?.firstName}
                  style={
                    user?.firstName
                      ? {
                          background:
                            "linear-gradient(135deg, #fdfdfd 0%, #f8f8f8 100%)",
                          color: "#777",
                          cursor: "not-allowed",
                        }
                      : {}
                  }
                />
                {user?.firstName && (
                  <p className="verification-form-note">
                    Using name from your profile
                  </p>
                )}
              </div>
              <div className="verification-form-field">
                <label className="verification-form-label">Last Name</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                  required
                  placeholder="As shown on ID"
                  className="verification-form-input"
                  readOnly={!!user?.lastName}
                  style={
                    user?.lastName
                      ? {
                          background:
                            "linear-gradient(135deg, #fdfdfd 0%, #f8f8f8 100%)",
                          color: "#777",
                          cursor: "not-allowed",
                        }
                      : {}
                  }
                />
                {user?.lastName && (
                  <p className="verification-form-note">
                    Using name from your profile
                  </p>
                )}
              </div>
            </div>

            <div className="verification-form-row">
              <div className="verification-form-field">
                <label className="verification-form-label">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      dateOfBirth: e.target.value,
                    }))
                  }
                  required
                  className="verification-form-input"
                  readOnly={!!user?.dateOfBirth}
                  style={
                    user?.dateOfBirth
                      ? {
                          background:
                            "linear-gradient(135deg, #fdfdfd 0%, #f8f8f8 100%)",
                          color: "#777",
                          cursor: "not-allowed",
                        }
                      : {}
                  }
                />
                <p className="verification-form-note">
                  {user?.dateOfBirth
                    ? "Using date of birth from your profile"
                    : "Must match the date on your ID"}
                </p>
              </div>
              <div className="verification-form-field">
                <label className="verification-form-label">ID Type</label>
                <select
                  value={formData.idType}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, idType: e.target.value }))
                  }
                  required
                  className="verification-form-input verification-form-select">
                  <option value="">Select ID Type</option>
                  {idTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <p className="verification-form-note">
                  Choose the type of ID you'll upload
                </p>
              </div>
            </div>

            <div className="verification-upload-section">
              <div className="verification-upload-field">
                <label className="verification-form-label">
                  {uploadInstructions.title}
                </label>
                <div className="verification-upload-area">
                  {previewImages.idPhoto ? (
                    <div className="verification-image-preview">
                      <img
                        src={previewImages.idPhoto}
                        alt="ID Preview"
                        className="verification-preview-image"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, idPhoto: null }));
                          setPreviewImages((prev) => ({
                            ...prev,
                            idPhoto: null,
                          }));
                        }}
                        className="verification-remove-image">
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="verification-upload-placeholder">
                      <div className="verification-upload-icon">📄</div>
                      <p className="verification-upload-text">
                        Upload{" "}
                        {formData.idType
                          ? idTypes.find((t) => t.value === formData.idType)
                              ?.label
                          : "ID"}
                      </p>
                      <p className="verification-upload-subtext">
                        {uploadInstructions.instructions}
                      </p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleFileChange("idPhoto", e.target.files[0])
                    }
                    required
                    className="verification-upload-input"
                  />
                </div>
              </div>

              <div className="verification-upload-field">
                <label className="verification-form-label">Selfie Photo</label>
                <div className="verification-upload-area">
                  {previewImages.selfie ? (
                    <div className="verification-image-preview">
                      <img
                        src={previewImages.selfie}
                        alt="Selfie Preview"
                        className="verification-preview-image"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, selfie: null }));
                          setPreviewImages((prev) => ({
                            ...prev,
                            selfie: null,
                          }));
                        }}
                        className="verification-remove-image">
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="verification-upload-placeholder">
                      <div className="verification-upload-icon">🤳</div>
                      <p className="verification-upload-text">Upload Selfie</p>
                      <p className="verification-upload-subtext">
                        Clear, well-lit photo of your face. Look directly at
                        camera.
                      </p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleFileChange("selfie", e.target.files[0])
                    }
                    required
                    className="verification-upload-input"
                  />
                </div>
              </div>
            </div>

            {formData.idType && (
              <div className="verification-tips">
                <h4>
                  📋 Photo Tips for{" "}
                  {idTypes.find((t) => t.value === formData.idType)?.label}:
                </h4>
                <ul>
                  <li>Use good lighting - avoid shadows and glare</li>
                  <li>Keep the document flat and all corners visible</li>
                  <li>Ensure all text is sharp and readable</li>
                  <li>Don't cover any part of the document</li>
                  {formData.idType === "passport" && (
                    <li>Include the machine-readable zone at the bottom</li>
                  )}
                  {formData.idType === "drivers_license" && (
                    <li>Include any holograms or security features</li>
                  )}
                </ul>
              </div>
            )}

            {error && (
              <div className="verification-error">
                <span className="verification-error-icon">❌</span>
                <p className="verification-error-text">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="verification-modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="verification-modal-btn cancel">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !formData.idPhoto ||
              !formData.selfie ||
              !formData.firstName ||
              !formData.lastName ||
              !formData.dateOfBirth ||
              !formData.idType
            }
            className="verification-modal-btn">
            {isSubmitting ? (
              <>
                <div className="verification-loading-spinner"></div>
                Verifying Document...
              </>
            ) : (
              "Submit for Verification"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const VerificationModalWrapper = (props) => {
  if (!props.isOpen) return null;
  return ReactDOM.createPortal(
      <VerificationModal {...props} />,
      document.body
  );
};
export default VerificationModalWrapper;
