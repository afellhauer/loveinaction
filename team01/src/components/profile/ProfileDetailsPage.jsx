// 📁 src/components/ProfileDetailsPage.jsx
import React, {useState, useEffect, useRef} from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  selectUser,
  selectProfile,
  selectIsLoading,
  selectLoadError,
  selectIsSaving,
  selectSaveError,
  loadProfile,
  saveProfile,
  clearLoadError,
  clearSaveError,
} from "../../store/slices/profileSlice";
import "./ProfileDetailsPage.css";
import VerificationStatusDisplay from "./VerificationStatusDisplay";
import VerificationModal from "./VerificationModal";
import AccountSettings from "./AccountSettings.jsx";

export default function ProfileDetailsPage() {
  const dispatch = useDispatch();

  // —— Redux state ——
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);
  const isLoading = useSelector(selectIsLoading);
  const loadError = useSelector(selectLoadError);
  const isSaving = useSelector(selectIsSaving);
  const saveError = useSelector(selectSaveError);

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

  const trustedContactRef = useRef(null);

  useEffect(() => {
    if (window.location.hash === "#trusted-contact" && trustedContactRef.current) {
      trustedContactRef.current.focus();
    }
  }, []);

  // Helper function to format date for input
  const formatDateForInput = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  };

  // —— Local form state ——
  const [form, setForm] = useState({
    name: "",
    email: "",
    dateOfBirth: "",
    calculatedAge: null,
    location: "",
    gender: "",
    pronouns: "",
    preference: "",
    occupation: "",
    education: "",
    bio: "",
    profilePic: null,
    profilePicUrl: "",
    socialMedia: { instagram: "", snapchat: "", tiktok: "" },
    safetyScore: "",
    badges: [],
    trustedContactName: "",
    trustedContactEmail: "",
    autoNotifyTrustedContact: false,
  });
  const [buttonText, setButtonText] = useState("Save");
  const [imagePreview, setImagePreview] = useState(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Load profile when component mounts
  useEffect(() => {
    dispatch(loadProfile());
    return () => {
      dispatch(clearLoadError());
      dispatch(clearSaveError());
    };
  }, [dispatch]);

  // Whenever the user+profile arrive, seed the form
  useEffect(() => {
    if (!user) return;
    const p = profile || {};

    const userDOB = user.dateOfBirth || "";
    const calculatedAge = userDOB ? calculateAge(userDOB) : null;

    setForm({
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      dateOfBirth: formatDateForInput(userDOB),
      calculatedAge: calculatedAge,
      location: p.location ?? "",
      gender: p.gender ?? "",
      pronouns: p.pronouns ?? "",
      preference: p.preference || "",
      occupation: p.occupation ?? "",
      education: p.education ?? "",
      bio: p.bio ?? "",
      profilePic: null,
      profilePicUrl: p.profilePicUrl ?? "",
      socialMedia: {
        instagram: p.socialMedia?.instagram ?? "",
        snapchat: p.socialMedia?.snapchat ?? "",
        tiktok: p.socialMedia?.tiktok ?? "",
      },
      safetyScore: p.safetyScore ?? "",
      badges: p.badges ?? [],
      trustedContactName: p.trustedContact?.name || user.trustedContact?.name || "",
      trustedContactEmail: p.trustedContact?.email || user.trustedContact?.email || "",
      autoNotifyTrustedContact: (typeof p.autoNotifyTrustedContact !== 'undefined') ? !!p.autoNotifyTrustedContact : !!user.autoNotifyTrustedContact,
    });

    // and preview the existing picture if there is one
    if (p.profilePicUrl) {
      setImagePreview(p.profilePicUrl);
    }
  }, [user, profile]);

  // Form field change handler
  const handleChange = (e) => {
    const { name, value, files, type, checked } = e.target;
    if (name === "profilePic") {
      const file = files[0];
      setForm((f) => ({ ...f, profilePic: file }));
      setImagePreview(file ? URL.createObjectURL(file) : null);
    } else if (["instagram", "snapchat", "tiktok"].includes(name)) {
      setForm((f) => ({
        ...f,
        socialMedia: { ...f.socialMedia, [name]: value },
      }));
    } else if (name === "dateOfBirth") {
      // When DOB changes, recalculate age
      const newAge = value ? calculateAge(value) : null;
      setForm((f) => ({
        ...f,
        [name]: value,
        calculatedAge: newAge,
      }));
    } else if (name === "autoNotifyTrustedContact") {
      setForm((f) => ({ ...f, [name]: checked }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const handleVerificationSuccess = (result) => {
    console.log("Verification successful:", result);
    // Reload profile to get updated verification status
    dispatch(loadProfile());
  };

  // Remove selected image
  const handleRemoveImage = () => {
    setForm((f) => ({ ...f, profilePic: null, profilePicUrl: "" }));
    setImagePreview(null);
    const fileInput = document.querySelector('input[name="profilePic"]');
    if (fileInput) fileInput.value = "";
  };

  // Save handler
  const handleSave = async (e) => {
    e.preventDefault();
    const data = new FormData();

    // Include dateOfBirth in the submission
    data.append("dateOfBirth", form.dateOfBirth);
    data.append("age", form.calculatedAge || "");
    data.append("location", form.location);
    data.append("gender", form.gender);
    data.append("pronouns", form.pronouns);
    data.append("preference", form.preference);
    data.append("occupation", form.occupation);
    data.append("education", form.education);
    data.append("bio", form.bio);
    data.append("instagram", form.socialMedia.instagram);
    data.append("snapchat", form.socialMedia.snapchat);
    data.append("tiktok", form.socialMedia.tiktok);
    if (form.profilePic) data.append("profilePic", form.profilePic);
    
    // Signal if user wants to remove the profile image
    if (!form.profilePic && !form.profilePicUrl) {
      data.append("removeProfilePic", "true");
    }
    // Trusted contact fields
    data.append("trustedContactName", form.trustedContactName);
    data.append("trustedContactEmail", form.trustedContactEmail);
    data.append("autoNotifyTrustedContact", form.autoNotifyTrustedContact);
    const resultAction = await dispatch(saveProfile(data));
    
    if (saveProfile.fulfilled.match(resultAction)) {
      setButtonText("✅ Saved!");
      dispatch(loadProfile());
      setTimeout(() => setButtonText("Save"), 2000);
    }
  };

  // —— Loading / error states ——
  if (isLoading) {
    return (
      <div className="profile-details-page">
        <div className="profile-details-page-loading">
          Loading your profile...
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="profile-details-page">
        <div className="profile-details-page-error">
          <strong>⚠️ Error loading profile:</strong> {loadError}
        </div>
        <div className="profile-details-page-buttons">
          <button
            className="profile-details-page-btn confirm"
            onClick={() => dispatch(loadProfile())}>
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  // —— Main form UI ——
  return (
    <div className="profile-details-page">
      <h2 className="profile-details-page-title">✨ Your Profile</h2>

      {saveError && (
        <div className="profile-details-page-error">
          <strong>❌ Save Error:</strong> {saveError}
        </div>
      )}

      <form
        className="profile-details-page-form"
        onSubmit={handleSave}
        autoComplete="off">
        {/* Profile Picture Section */}
        <div className="profile-details-page-field profile-picture-section">
          <label className="profile-details-page-label">
            📸 Profile Picture
          </label>
          <div className="profile-picture-container">
            {imagePreview ? (
              <div className="profile-picture-preview">
                <img
                  src={imagePreview}
                  alt="Profile"
                  className="profile-picture-image"
                />
                <button
                  type="button"
                  className="remove-image-btn"
                  onClick={handleRemoveImage}
                  title="Remove image"
                  aria-label="Remove profile picture">
                  ×
                </button>
              </div>
            ) : (
              <div className="profile-picture-placeholder"></div>
            )}
            <input
              name="profilePic"
              type="file"
              accept="image/*"
              className="profile-details-page-file-input"
              onChange={handleChange}
              aria-label="Upload profile picture"
            />
          </div>
        </div>

        {/* Name & Email (read-only) */}
        <div className="profile-details-page-field">
          <label className="profile-details-page-label">👤 Name</label>
          <input
            className="profile-details-page-input"
            name="name"
            value={form.name}
            readOnly
            aria-label="Full name (read-only)"
          />
        </div>

        <div className="profile-details-page-field">
          <label className="profile-details-page-label">📧 Email</label>
          <input
            className="profile-details-page-input"
            name="email"
            value={form.email}
            readOnly
            disabled
            aria-label="Email address (read-only)"
          />
        </div>

        {/* Date of Birth */}
        <div className="profile-details-page-field">
          <label className="profile-details-page-label">📅 Date of Birth</label>
          <div className="dob-with-age">
            <input
                className="profile-details-page-input"
                name="dateOfBirth"
                type="date"
                value={form.dateOfBirth}
                onChange={handleChange}
                required
                max={new Date().toISOString().split("T")[0]} // Prevent future dates
                aria-label="Date of birth"
            />
            {form.calculatedAge !== null && (
                <span className="calculated-age">{form.calculatedAge} yrs old</span>
            )}
          </div>
          <div className="profile-details-page-field-note">
            {form.calculatedAge === null ? (
                <span>Please enter your date of birth</span>
            ) : (
                form.calculatedAge < 18 && (
                    <span className="age-warning">⚠️ You must be 18 or older</span>
                )
            )}
          </div>
        </div>

        {/* Location */}
        <div className="profile-details-page-field">
          <label className="profile-details-page-label">📍 Location</label>
          <input
            className="profile-details-page-input"
            name="location"
            type="text"
            value={form.location}
            onChange={handleChange}
            required
            placeholder="Enter your location"
            aria-label="Location"
          />
        </div>

        {/* Gender dropdown */}
        <div className="profile-details-page-field">
          <label className="profile-details-page-label">⚧ Gender</label>
          <select
            className="profile-details-page-input"
            name="gender"
            value={form.gender}
            onChange={handleChange}
            required
            aria-label="Select your gender">
            <option value="">Select your gender</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
            <option value="Non-binary">Non-binary</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Pronouns dropdown */}
        <div className="profile-details-page-field">
          <label className="profile-details-page-label">💬 Pronouns</label>
          <select
            className="profile-details-page-input"
            name="pronouns"
            value={form.pronouns}
            onChange={handleChange}
            required
            aria-label="Select your pronouns">
            <option value="">Select your pronouns</option>
            <option value="She/Her">She/Her</option>
            <option value="He/Him">He/Him</option>
            <option value="They/Them">They/Them</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Preference dropdown */}
        <div className="profile-details-page-field">
          <label className="profile-details-page-label">💕 Preference</label>
          <select
            name="preference"
            className="profile-details-page-input"
            value={form.preference}
            onChange={handleChange}
            required
            aria-label="Select your dating preference">
            <option value="">Select preference</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
            <option value="Everyone">Everyone</option>
          </select>
        </div>

        {/* More dynamic fields */}
        {[
          {
            label: "💼 Occupation",
            name: "occupation",
            placeholder: "What do you do for work?",
          },
          {
            label: "🎓 Education",
            name: "education",
            placeholder: "Your educational background",
          },
        ].map(({ label, name, placeholder }) => (
          <div className="profile-details-page-field" key={name}>
            <label className="profile-details-page-label">{label}</label>
            <input
              className="profile-details-page-input"
              name={name}
              type="text"
              value={form[name]}
              onChange={handleChange}
              placeholder={placeholder}
              aria-label={label.replace(/[^\w\s]/g, "")}
            />
          </div>
        ))}

        {/* Bio */}
        <div className="profile-details-page-field">
          <label className="profile-details-page-label">📝 Bio</label>
          <textarea
            className="profile-details-page-input"
            name="bio"
            value={form.bio}
            onChange={handleChange}
            placeholder="Tell others about yourself..."
            rows="4"
            aria-label="Personal bio"
          />
        </div>

        {/* Safety Score (read-only) */}
        <div className="profile-details-page-field">
          <label className="profile-details-page-label">🛡️ Safety Score</label>
          <input
            className="profile-details-page-input"
            name="safetyScore"
            value={form.safetyScore || "Not yet rated"}
            readOnly
            disabled
            aria-label="Safety score (read-only)"
          />
        </div>

        {/* Badges */}
        <div className="profile-details-page-field">
          <label className="profile-details-page-label">🏆 Badges</label>
          <div className="badges-container">
            {form.badges?.length ? (
              form.badges.map((badge, index) => (
                <span key={`${badge}-${index}`} className="badge">
                  {badge}
                </span>
              ))
            ) : (
              <span className="badge placeholder">No badges earned yet</span>
            )}
          </div>
        </div>

        {/* Social Media */}
        <div
          className="profile-details-page-field"
          style={{ gridColumn: "1 / -1" }}>
          <label className="profile-details-page-label">📱 Social Media</label>
          <div className="profile-details-page-social-links">
            {Object.entries(form.socialMedia).map(([platform, handle]) => (
              <div className="profile-details-page-social-link" key={platform}>
                <strong>
                  {platform === "instagram" && "📷"}
                  {platform === "snapchat" && "👻"}
                  {platform === "tiktok" && "🎵"}
                  {" " + platform}:
                </strong>
                <span>{handle || "Not connected"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ID Verification Status */}
        <div className="profile-details-page-field">
          <label className="profile-details-page-label">
            🛡️ ID Verification
          </label>
          <VerificationStatusDisplay
            onOpenModal={() => setShowVerificationModal(true)}
          />
        </div>

        {/* Trusted Contact Section */}
        <div className="profile-details-page-field" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <label className="profile-details-page-label" style={{ margin: 0, minWidth: 140, textAlign: 'center', alignSelf: 'center' }}>🆘 Trusted Contact</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            <input
              className="profile-details-page-input"
              ref={trustedContactRef}
              tabIndex={-1}
              name="trustedContactName"
              type="text"
              value={form.trustedContactName}
              onChange={handleChange}
              placeholder="Contact Name"
              aria-label="Trusted contact name"
              style={{ marginBottom: 0 }}
            />
            <input
              className="profile-details-page-input"
              name="trustedContactEmail"
              type="email"
              value={form.trustedContactEmail}
              onChange={handleChange}
              placeholder="Contact Email"
              aria-label="Trusted contact email"
              style={{ marginBottom: 0 }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <input
                type="checkbox"
                name="autoNotifyTrustedContact"
                checked={form.autoNotifyTrustedContact}
                onChange={handleChange}
                style={{ marginRight: 6 }}
              />
              <span style={{ fontSize: 13 }}>
                Automatically notify my trusted contact when a date is confirmed.
              </span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="profile-details-page-buttons">
          <button
            type="submit"
            className="profile-details-page-btn confirm"
            disabled={
              isSaving ||
              (form.calculatedAge !== null && form.calculatedAge < 18)
            }
            aria-label={isSaving ? "Saving profile" : "Save profile"}>
            {isSaving ? "💫 Saving..." : buttonText}
          </button>
          {form.calculatedAge !== null && form.calculatedAge < 18 && (
            <div
              className="profile-details-page-error"
              style={{ marginTop: "10px" }}>
              You must be 18 or older to use this platform
            </div>
          )}
        </div>
      </form>
      <AccountSettings/>


      <VerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onSuccess={handleVerificationSuccess}
        user={user}
      />
    </div>
  );
}
