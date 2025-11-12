// 📁 src/components/SignUpPage.jsx

import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./SignUpPage.css";
import { setShowTermsDialog } from "../../store/slices/userFlagsSlice";
import { useSelector } from "react-redux";
import TermsDialog from "./TermsDialog";
import { useDispatch } from "react-redux";
import ModalPortal from "../base/ModalPortal";

export default function SignUpPage({
  form, // { firstName, lastName, email, password, confirmPassword, dateOfBirth, terms }
  setForm, // setter for the form object
  onSubmit, // callback from App.jsx to call apiSignup(...)
  errorMsg, // server‐side error message from App (e.g. "Email already in use")
}) {
  const navigate = useNavigate();
  const [localError, setLocalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const showTermsDialog = useSelector((s) => s.userFlags.showTermsDialog);
  const dispatch = useDispatch();

  // Helper function to calculate age from date of birth
  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  };

  // Calculate current age for display
  const currentAge = form.dateOfBirth ? calculateAge(form.dateOfBirth) : null;

  // Show server‐side error first, otherwise local validation errors
  const errorToShow = errorMsg || localError;

  const [isStrongPassword, setIsStrongPassword] = useState(false);
  const [isLongEnough, setIsLongEnough] = useState(false);
  const [hasUpperCase, setHasUpperCase] = useState(false);
  const [hasLowerCase, setHasLowerCase] = useState(false);
  const [hasNumber, setHasNumber] = useState(false);
  const [hasSpecialChar, setHasSpecialChar] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(false);

  const passwordValidation = (password) => {
    const longEnough = password.length >= 8;
    const upperCase = /[A-Z]/.test(password);
    const lowerCase = /[a-z]/.test(password);
    const number = /\d/.test(password);
    const specialChar = /[^A-Za-z0-9]/.test(password);

    setIsLongEnough(longEnough);
    setHasUpperCase(upperCase);
    setHasLowerCase(lowerCase);
    setHasNumber(number);
    setHasSpecialChar(specialChar);

    return longEnough && upperCase && lowerCase && number && specialChar;
  };

  const sanitizeInput = (str) => {
    return str.replace(/[<>&"'`]/g, ""); // Remove HTML special chars
  };

  const [showSanitizedToast, setShowSanitizedToast] = useState(false);
  const toastTimeoutRef = useRef(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let sanitizedValue = value;

    if (
      type !== "checkbox" &&
      ["firstName", "lastName", "email"].includes(name)
    ) {
      const sanitized = sanitizeInput(value);
      sanitizedValue = sanitized;
      if (name === "email" && sanitized !== value) {
        setShowSanitizedToast(true);
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(
          () => setShowSanitizedToast(false),
          2000
        );
      }
    }

    const newForm = {
      ...form,
      [name]: type === "checkbox" ? checked : sanitizedValue,
    };
    setForm(newForm);

    if (name === "password" || name === "confirmPassword") {
      setIsStrongPassword(passwordValidation(newForm.password));
      setPasswordsMatch(newForm.password === newForm.confirmPassword);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");

    // Front‐end validation
    if (
      !form.firstName ||
      !form.lastName ||
      !form.email ||
      !form.password ||
      !form.confirmPassword ||
      !form.dateOfBirth
    ) {
      setLocalError("Please fill in all the mandatory fields!");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setLocalError("Passwords do not match!");
      return;
    }

    // Age validation
    if (currentAge === null) {
      setLocalError("Please enter a valid date of birth!");
      return;
    }

    if (currentAge < 18) {
      setLocalError("You must be 18 or older to create an account!");
      return;
    }

    if (!form.terms) {
      setLocalError("Please accept the terms and conditions!");
      return;
    }

    setIsSubmitting(true);
    try {
      // Call App.jsx's onSubmit (which does apiSignup)
      await onSubmit();
      // After signup, AppRoutes will redirect to /signup-success
    } catch (err) {
      setLocalError(err.message || "Signup failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="signup">
      {showSanitizedToast && (
        <div className="sanitized-toast">
          Your email was sanitized to remove unsafe characters.
        </div>
      )}
      <h2 className="signup-title">Sign Up</h2>
      {errorToShow && <div className="signup-error">{errorToShow}</div>}
      {showTermsDialog && (
        <ModalPortal>
          <TermsDialog onClose={() => dispatch(setShowTermsDialog(false))} />
        </ModalPortal>
      )}

      <form className="signup-form" autoComplete="off" onSubmit={handleSubmit}>
        <div className="signup-field">
          <label className="signup-label">First Name *</label>
          <input
            className="signup-input"
            name="firstName"
            type="text"
            placeholder="Enter first name"
            value={form.firstName}
            onChange={handleChange}
            autoComplete="given-name"
            required
          />
        </div>

        <div className="signup-field">
          <label className="signup-label">Last Name *</label>
          <input
            className="signup-input"
            name="lastName"
            type="text"
            placeholder="Enter last name"
            value={form.lastName}
            onChange={handleChange}
            autoComplete="family-name"
            required
          />
        </div>

        <div className="signup-field">
          <label className="signup-label">Email *</label>
          <input
            className="signup-input"
            name="email"
            type="email"
            placeholder="Enter email address"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />
        </div>

        <div className="signup-field">
          <label className="signup-label">Date of Birth *</label>
          <input
            className="signup-input"
            name="dateOfBirth"
            type="date"
            value={form.dateOfBirth}
            onChange={handleChange}
            max={new Date().toISOString().split("T")[0]} // Prevent future dates
            autoComplete="bday"
            required
          />
          <div className="signup-field-note">
            {currentAge !== null ? (
              <span
                style={{
                  color: currentAge >= 18 ? "#28a745" : "#dc3545",
                  fontSize: "0.85em",
                  marginTop: "4px",
                  display: "block",
                  fontWeight: currentAge < 18 ? "bold" : "normal",
                }}>
                Age: {currentAge} years old
                {currentAge < 18 && " - You must be 18 or older"}
              </span>
            ) : (
              <span
                style={{
                  color: "#6c757d",
                  fontSize: "0.85em",
                  marginTop: "4px",
                  display: "block",
                }}>
                You must be 18 or older to join
              </span>
            )}
          </div>
        </div>

        <div className="signup-field">
          <label className="signup-label">Password *</label>
          <input
            className="signup-input"
            name="password"
            type="password"
            placeholder="Create a strong password"
            value={form.password}
            onChange={handleChange}
            autoComplete="new-password"
            required
          />
        </div>
        {isLongEnough &&
        hasUpperCase &&
        hasLowerCase &&
        hasNumber &&
        hasSpecialChar ? (
          <div className="password-strong">✅ Password is strong</div>
        ) : (
          form.password && (
            <div className="password-requirements">
              <p className="password-requirements-title">
                Password Requirements:
              </p>
              <ul className="password-requirements-list">
                <li className={isLongEnough ? "valid" : "invalid"}>
                  At least 8 characters
                </li>
                <li className={hasUpperCase ? "valid" : "invalid"}>
                  At least one uppercase letter
                </li>
                <li className={hasLowerCase ? "valid" : "invalid"}>
                  At least one lowercase letter
                </li>
                <li className={hasNumber ? "valid" : "invalid"}>
                  At least one number
                </li>
                <li className={hasSpecialChar ? "valid" : "invalid"}>
                  At least one special character (e.g. !@#$%^&*)
                </li>
              </ul>
            </div>
          )
        )}

        <div className="signup-field">
          <label className="signup-label">Confirm Password *</label>
          <input
            className="signup-input"
            name="confirmPassword"
            type="password"
            placeholder="Re-enter your password"
            value={form.confirmPassword}
            onChange={handleChange}
            autoComplete="new-password"
            required
          />
        </div>
        {!passwordsMatch && form.confirmPassword && (
          <div className="password-mismatch-error">
            ❌ Passwords do not match!
          </div>
        )}
        {passwordsMatch && form.confirmPassword && (
          <div className="password-match-success">✅ Passwords match</div>
        )}

        {/* Age requirement notice for underage users */}
        {currentAge !== null && currentAge < 18 && (
          <div
            className="signup-age-warning"
            style={{
              backgroundColor: "#f8d7da",
              color: "#721c24",
              padding: "12px",
              borderRadius: "6px",
              border: "1px solid #f5c6cb",
              marginBottom: "16px",
              textAlign: "center",
            }}>
            <strong>⚠️ Age Requirement</strong>
            <br />
            You must be 18 or older to create an account on this platform.
            <br />
            Please verify your date of birth is correct.
          </div>
        )}

        <label className="checkbox-label">
          <input
            name="terms"
            type="checkbox"
            checked={form.terms}
            onChange={handleChange}
            required
          />
          I accept the{" "}
          <button
            type="button"
            className="terms-link-btn"
            onClick={() => dispatch(setShowTermsDialog(true))}>
            Terms & Conditions
          </button>
        </label>

        <div className="signup-buttons">
          <button
            type="button"
            className="signup-btn back"
            onClick={() => navigate("/login")}>
            Back
          </button>
          <button
            type="submit"
            className="signup-btn submit"
            disabled={
              !isStrongPassword ||
              isSubmitting ||
              !passwordsMatch ||
              (currentAge !== null && currentAge < 18)
            }
            style={{
              opacity: currentAge !== null && currentAge < 18 ? 0.6 : 1,
              cursor:
                currentAge !== null && currentAge < 18
                  ? "not-allowed"
                  : "pointer",
            }}>
            {isSubmitting ? "Signing Up..." : "Create Account"}
          </button>
        </div>

        {/* Help text for form completion */}
        <div
          className="signup-help-text"
          style={{
            fontSize: "0.85em",
            color: "#6c757d",
            textAlign: "center",
            marginTop: "12px",
          }}>
          All fields marked with * are required
        </div>
      </form>
    </div>
  );
}
