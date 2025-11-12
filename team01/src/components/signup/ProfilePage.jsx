// 📁 src/components/ProfilePage.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

import "./ProfilePage.css";

export default function ProfilePage({ onComplete }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

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

  // Helper function to format date for input
  const formatDateForInput = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  };

  // Autofill suggestions
  const locationSuggestions = [
    "UBC",
    "Kitsilano",
    "Downtown Vancouver",
    "Mount Pleasant",
    "Olympic Village",
    "Kerrisdale",
    "Richmond",
    "Burnaby",
    "Surrey",
    "North Vancouver",
    "West Vancouver",
    "New Westminster",
    "Coquitlam",
    "Langley",
    "Delta",
    "White Rock",
    "Maple Ridge",
    "Port Coquitlam",
    "Port Moody",
    "Pitt Meadows",
    "Bowen Island",
    "Lions Bay",
  ];

  const occupationSuggestions = [
    "Software Engineer",
    "Product Manager",
    "Designer",
    "Marketing Specialist",
    "Sales Representative",
    "Teacher",
    "Nurse",
    "Doctor",
    "Lawyer",
    "Accountant",
    "Consultant",
    "Analyst",
    "Manager",
    "Student",
    "Researcher",
    "Artist",
    "Writer",
    "Photographer",
    "Chef",
    "Bartender",
    "Real Estate Agent",
    "Financial Advisor",
    "Therapist",
    "Social Worker",
    "Engineer",
    "Architect",
    "Graphic Designer",
    "Web Developer",
    "Data Scientist",
    "Project Manager",
    "HR Specialist",
    "Operations Manager",
    "Business Owner",
    "Freelancer",
    "Contractor",
  ];

  const educationSuggestions = [
    "High School Diploma",
    "Some College",
    "Associate Degree",
    "Bachelor's Degree",
    "Master's Degree",
    "PhD",
    "Professional Degree",
    "Trade School",
    "Certification",
    "Bachelor of Arts",
    "Bachelor of Science",
    "Bachelor of Engineering",
    "Bachelor of Commerce",
    "Master of Business Administration",
    "Master of Arts",
    "Master of Science",
    "Juris Doctor",
    "Doctor of Medicine",
    "Doctor of Philosophy",
    "Self-taught",
  ];

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
    q1: "",
    q1Text: "",
    socialMedia: { instagram: "", snapchat: "", tiktok: "" },
  });

  // Suggestion states
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [showOccupationSuggestions, setShowOccupationSuggestions] =
    useState(false);
  const [showEducationSuggestions, setShowEducationSuggestions] =
    useState(false);
  const [filteredLocationSuggestions, setFilteredLocationSuggestions] =
    useState([]);
  const [filteredOccupationSuggestions, setFilteredOccupationSuggestions] =
    useState([]);
  const [filteredEducationSuggestions, setFilteredEducationSuggestions] =
    useState([]);

  // Load profile on mount
  useEffect(() => {
    dispatch(loadProfile());
    return () => {
      dispatch(clearLoadError());
      dispatch(clearSaveError());
    };
  }, [dispatch]);

  // Seed form when user+profile arrive
  useEffect(() => {
    if (!user) return;
    const p = profile || {};

    const userDOB = user.dateOfBirth || "";
    const calculatedAge = userDOB ? calculateAge(userDOB) : null;

    setForm((prev) => ({
      ...prev,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      dateOfBirth: formatDateForInput(userDOB),
      calculatedAge: calculatedAge,
      location: p.location ?? prev.location,
      gender: p.gender ?? prev.gender,
      pronouns: p.pronouns ?? prev.pronouns,
      preference: p.preference ?? prev.preference,
      occupation: p.occupation ?? prev.occupation,
      education: p.education ?? prev.education,
      bio: p.bio ?? prev.bio,
      q1: p.q1 ?? prev.q1,
      q1Text: p.q1Text ?? prev.q1Text,
      socialMedia: {
        instagram: p.socialMedia?.instagram ?? prev.socialMedia.instagram,
        snapchat: p.socialMedia?.snapchat ?? prev.socialMedia.snapchat,
        tiktok: p.socialMedia?.tiktok ?? prev.socialMedia.tiktok,
      },
    }));
  }, [user, profile]);

  // Filter suggestions based on input
  const filterSuggestions = (suggestions, value) => {
    if (!value) return suggestions.slice(0, 5); // Show first 5 when empty
    return suggestions
      .filter((item) => item.toLowerCase().includes(value.toLowerCase()))
      .slice(0, 8); // Show max 8 filtered results
  };

  // Field change handler
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "profilePic") {
      setForm((f) => ({ ...f, profilePic: files[0] }));
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
    } else if (name === "location") {
      setForm((f) => ({ ...f, [name]: value }));
      setFilteredLocationSuggestions(
        filterSuggestions(locationSuggestions, value)
      );
      setShowLocationSuggestions(true);
    } else if (name === "occupation") {
      setForm((f) => ({ ...f, [name]: value }));
      setFilteredOccupationSuggestions(
        filterSuggestions(occupationSuggestions, value)
      );
      setShowOccupationSuggestions(true);
    } else if (name === "education") {
      setForm((f) => ({ ...f, [name]: value }));
      setFilteredEducationSuggestions(
        filterSuggestions(educationSuggestions, value)
      );
      setShowEducationSuggestions(true);
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "location") setShowLocationSuggestions(false);
    if (field === "occupation") setShowOccupationSuggestions(false);
    if (field === "education") setShowEducationSuggestions(false);
  };

  // Handle input focus
  const handleInputFocus = (field) => {
    if (field === "location") {
      setFilteredLocationSuggestions(
        filterSuggestions(locationSuggestions, form.location)
      );
      setShowLocationSuggestions(true);
    } else if (field === "occupation") {
      setFilteredOccupationSuggestions(
        filterSuggestions(occupationSuggestions, form.occupation)
      );
      setShowOccupationSuggestions(true);
    } else if (field === "education") {
      setFilteredEducationSuggestions(
        filterSuggestions(educationSuggestions, form.education)
      );
      setShowEducationSuggestions(true);
    }
  };

  // Handle input blur (with delay to allow suggestion clicks)
  const handleInputBlur = (field) => {
    setTimeout(() => {
      if (field === "location") setShowLocationSuggestions(false);
      if (field === "occupation") setShowOccupationSuggestions(false);
      if (field === "education") setShowEducationSuggestions(false);
    }, 200);
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate age requirement
    if (form.calculatedAge !== null && form.calculatedAge < 18) {
      alert("You must be 18 or older to create a profile.");
      return;
    }

    const data = new FormData();
    data.append("dateOfBirth", form.dateOfBirth);
    data.append("age", form.calculatedAge || ""); // Include calculated age as backup
    data.append("location", form.location);
    data.append("gender", form.gender);
    data.append("pronouns", form.pronouns);
    data.append("preference", form.preference);
    data.append("occupation", form.occupation);
    data.append("education", form.education);
    data.append("bio", form.bio);
    data.append("q1", form.q1);
    data.append("q1Text", form.q1Text);
    data.append("instagram", form.socialMedia.instagram);
    data.append("snapchat", form.socialMedia.snapchat);
    data.append("tiktok", form.socialMedia.tiktok);
    if (form.profilePic) {
      data.append("profilePic", form.profilePic);
    }

    const result = await dispatch(saveProfile(data));
    if (saveProfile.fulfilled.match(result)) {
      if (onComplete) {
        onComplete();
      } else {
        navigate("/loveinaction/home");
      }
    }
  };

  // —— Loading / error handling ——
  if (isLoading) {
    return <div className="profile">Loading your profile…</div>;
  }
  if (loadError) {
    return (
      <div className="profile">
        <p className="profile-error">Error: {loadError}</p>
        <button onClick={() => dispatch(loadProfile())}>Try again</button>
      </div>
    );
  }

  // Check if form is valid for submission
  const isFormValid =
    form.dateOfBirth &&
    form.calculatedAge !== null &&
    form.calculatedAge >= 18 &&
    form.location &&
    form.gender &&
    form.pronouns &&
    form.preference;

  return (
    <div className="profile">
      <h2 className="profile-title">Create Your Profile</h2>
      {saveError && <div className="profile-error">{saveError}</div>}

      <form className="profile-form" onSubmit={handleSubmit} autoComplete="off">
        {/* Name & Email (read-only) */}
        <div className="profile-field">
          <label className="profile-label">Name</label>
          <input
            name="name"
            value={form.name}
            readOnly
            className="profile-input"
          />
        </div>
        <div className="profile-field">
          <label className="profile-label">Email</label>
          <input
            name="email"
            value={form.email}
            readOnly
            className="profile-input"
          />
        </div>

        {/* Date of Birth */}
        <div
          className="profile-field"
          style={{ flexDirection: "column", alignItems: "stretch" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              justifyContent: "space-between",
            }}>
            <label className="profile-label">Date of Birth *</label>
            <input
              name="dateOfBirth"
              type="date"
              className="profile-input"
              value={form.dateOfBirth}
              onChange={handleChange}
              max={new Date().toISOString().split("T")[0]} // Prevent future dates
              required
            />
          </div>
          <div
            className="profile-field-note"
            style={{ marginTop: "8px", marginLeft: "116px" }}>
            {form.calculatedAge !== null ? (
              <span
                style={{
                  color: form.calculatedAge >= 18 ? "#28a745" : "#dc3545",
                  fontSize: "0.85em",
                  fontWeight: form.calculatedAge < 18 ? "bold" : "normal",
                }}>
                Your age: {form.calculatedAge} years old
                {form.calculatedAge < 18 && " - You must be 18 or older"}
              </span>
            ) : (
              <span style={{ color: "#6c757d", fontSize: "0.85em" }}>
                Please enter your date of birth
              </span>
            )}
          </div>
        </div>

        {/* Location with suggestions */}
        <div className="profile-field" style={{ position: "relative" }}>
          <label className="profile-label">Location *</label>
          <div style={{ flex: 1, position: "relative" }}>
            <input
              name="location"
              className="profile-input"
              value={form.location}
              onChange={handleChange}
              onFocus={() => handleInputFocus("location")}
              onBlur={() => handleInputBlur("location")}
              placeholder="Enter your city or area"
              required
            />
            {showLocationSuggestions &&
              filteredLocationSuggestions.length > 0 && (
                <div
                  className="suggestions-dropdown"
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    backgroundColor: "white",
                    border: "1px solid #646566",
                    borderRadius: "15px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    zIndex: 9999,
                    maxHeight: "200px",
                    overflowY: "auto",
                    marginTop: "4px",
                  }}>
                  {filteredLocationSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="suggestion-item"
                      style={{
                        padding: "10px 16px",
                        cursor: "pointer",
                        borderBottom:
                          index < filteredLocationSuggestions.length - 1
                            ? "1px solid #eee"
                            : "none",
                        fontSize: "16px",
                      }}
                      onMouseDown={() =>
                        handleSuggestionSelect("location", suggestion)
                      }
                      onMouseEnter={(e) =>
                        (e.target.style.backgroundColor = "#f5f5f5")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.backgroundColor = "white")
                      }>
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>

        {/* Required dropdowns */}
        <div className="profile-field">
          <label className="profile-label">Gender *</label>
          <select
            name="gender"
            className="profile-input"
            value={form.gender}
            onChange={handleChange}
            required>
            <option value="">Select your gender</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
            <option value="Non-binary">Non-binary</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="profile-field">
          <label className="profile-label">Pronouns *</label>
          <select
            name="pronouns"
            className="profile-input"
            value={form.pronouns}
            onChange={handleChange}
            required>
            <option value="">Select your pronouns</option>
            <option value="She/Her">She/Her</option>
            <option value="He/Him">He/Him</option>
            <option value="They/Them">They/Them</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="profile-field">
          <label className="profile-label">Looking for *</label>
          <select
            name="preference"
            className="profile-input"
            value={form.preference}
            onChange={handleChange}
            required>
            <option value="">Select your preference</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
            <option value="Everyone">Everyone</option>
          </select>
        </div>

        {/* Occupation with suggestions */}
        <div className="profile-field" style={{ position: "relative" }}>
          <label className="profile-label">Occupation</label>
          <div style={{ flex: 1, position: "relative" }}>
            <input
              name="occupation"
              className="profile-input"
              value={form.occupation}
              onChange={handleChange}
              onFocus={() => handleInputFocus("occupation")}
              onBlur={() => handleInputBlur("occupation")}
              placeholder="What do you do for work?"
            />
            {showOccupationSuggestions &&
              filteredOccupationSuggestions.length > 0 && (
                <div
                  className="suggestions-dropdown"
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    backgroundColor: "white",
                    border: "1px solid #646566",
                    borderRadius: "15px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    zIndex: 9999,
                    maxHeight: "200px",
                    overflowY: "auto",
                    marginTop: "4px",
                  }}>
                  {filteredOccupationSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="suggestion-item"
                      style={{
                        padding: "10px 16px",
                        cursor: "pointer",
                        borderBottom:
                          index < filteredOccupationSuggestions.length - 1
                            ? "1px solid #eee"
                            : "none",
                        fontSize: "16px",
                      }}
                      onMouseDown={() =>
                        handleSuggestionSelect("occupation", suggestion)
                      }
                      onMouseEnter={(e) =>
                        (e.target.style.backgroundColor = "#f5f5f5")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.backgroundColor = "white")
                      }>
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>

        {/* Education with suggestions */}
        <div className="profile-field" style={{ position: "relative" }}>
          <label className="profile-label">Education</label>
          <div style={{ flex: 1, position: "relative" }}>
            <input
              name="education"
              className="profile-input"
              value={form.education}
              onChange={handleChange}
              onFocus={() => handleInputFocus("education")}
              onBlur={() => handleInputBlur("education")}
              placeholder="Your educational background"
            />
            {showEducationSuggestions &&
              filteredEducationSuggestions.length > 0 && (
                <div
                  className="suggestions-dropdown"
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    backgroundColor: "white",
                    border: "1px solid #646566",
                    borderRadius: "15px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    zIndex: 9999,
                    maxHeight: "200px",
                    overflowY: "auto",
                    marginTop: "4px",
                  }}>
                  {filteredEducationSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="suggestion-item"
                      style={{
                        padding: "10px 16px",
                        cursor: "pointer",
                        borderBottom:
                          index < filteredEducationSuggestions.length - 1
                            ? "1px solid #eee"
                            : "none",
                        fontSize: "16px",
                      }}
                      onMouseDown={() =>
                        handleSuggestionSelect("education", suggestion)
                      }
                      onMouseEnter={(e) =>
                        (e.target.style.backgroundColor = "#f5f5f5")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.backgroundColor = "white")
                      }>
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>

        {/* Bio */}
        <div className="profile-field" style={{ alignItems: "flex-start" }}>
          <label className="profile-label">Bio</label>
          <textarea
            name="bio"
            className="profile-input"
            value={form.bio}
            onChange={handleChange}
            placeholder="Tell others about yourself..."
            rows="3"
            style={{ resize: "vertical" }}
          />
        </div>

        {/* Photo upload */}
        <div className="profile-field" style={{ alignItems: "flex-start" }}>
          <label className="profile-label">Profile Photo</label>
          <div className="profile-file-upload" style={{ flex: 1 }}>
            <label
              style={{
                display: "inline-block",
                backgroundColor: "#cbcfb5",
                padding: "10px 16px",
                border: "1px solid #646566",
                borderRadius: "15px",
                cursor: "pointer",
                fontSize: "16px",
              }}>
              <input
                type="file"
                name="profilePic"
                accept="image/*"
                onChange={handleChange}
                style={{ display: "none" }}
              />
              Choose Photo
            </label>
            <span
              style={{ marginLeft: "12px", fontSize: "14px", color: "#666" }}>
              {form.profilePic ? form.profilePic.name : "No file chosen"}
            </span>
          </div>
        </div>

        {/* Q1 */}
        <div className="profile-field" style={{ alignItems: "flex-start" }}>
          <label className="profile-label">Tell Us More</label>
          <div className="profile-question-inputs">
            <select
              name="q1"
              className="profile-input"
              value={form.q1}
              onChange={handleChange}>
              <option value="">Choose a question</option>
              <option value="What's your spirit animal?">
                What's your spirit animal?
              </option>
              <option value="If your personality were an activity, what would it be?">
                If your personality were an activity, what would it be?
              </option>
            </select>
            <input
              name="q1Text"
              className="profile-input"
              value={form.q1Text}
              onChange={handleChange}
              placeholder="Your answer"
            />
          </div>
        </div>

        {/* Social Links */}
        <div className="profile-field" style={{ alignItems: "flex-start" }}>
          <label className="profile-label">Social Links</label>
          <div className="profile-social-inputs">
            <input
              name="instagram"
              className="profile-input"
              value={form.socialMedia.instagram}
              onChange={handleChange}
              placeholder="Instagram username"
            />
            <input
              name="snapchat"
              className="profile-input"
              value={form.socialMedia.snapchat}
              onChange={handleChange}
              placeholder="Snapchat username"
            />
            <input
              name="tiktok"
              className="profile-input"
              value={form.socialMedia.tiktok}
              onChange={handleChange}
              placeholder="TikTok username"
            />
          </div>
        </div>

        {/* Age requirement notice for underage users */}
        {form.calculatedAge !== null && form.calculatedAge < 18 && (
          <div
            style={{
              backgroundColor: "#dab9b9",
              color: "#000000",
              padding: "12px",
              borderRadius: "15px",
              border: "1px solid #646566",
              marginBottom: "16px",
              textAlign: "center",
            }}>
            <strong>⚠️ Age Requirement:</strong> You must be 18 or older to use
            this platform. Please verify your date of birth is correct.
          </div>
        )}

        {/* Actions */}
        <div className="profile-buttons">
          <button
            type="submit"
            className="profile-btn confirm"
            disabled={isSaving || !isFormValid}
            style={{
              opacity: !isFormValid ? 0.6 : 1,
              cursor: !isFormValid ? "not-allowed" : "pointer",
            }}>
            {isSaving ? "Creating Profile..." : "Create Profile"}
          </button>
          {!isFormValid && (
            <div
              style={{
                fontSize: "0.85em",
                color: "#666",
                marginTop: "8px",
                textAlign: "center",
              }}>
              Please fill in all required fields and ensure you're 18 or older
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
