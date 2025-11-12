// 📁 src/App.jsx
import React, { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";

import ProtectedAppRoutes from "./ProtectedAppRoutes";

import RequireAuth from "./components/core/RequireAuth";
import LoginPage from "./components/login/LoginPage";
import SignUpPage from "./components/signup/SignUpPage";
import SignupSuccessPage from "./components/signup/SignupSuccessPage";
import TermsDialog from "./components/signup/TermsDialog";
import VerifyPage from "./components/signup/VerifyPage";

import ProfilePage from "./components/signup/ProfilePage";
import PublicAboutPage from "./components/login/PublicAboutPage.jsx";

import { setLoggedIn } from "./store/slices/userFlagsSlice";
import { signup as apiSignup } from "./utils/api";
import {
  resetSwipes,
  setCurrentUser,
  clearCurrentUser,
} from "./store/slices/profilesSlice";

import { getCurrentUserIdFromToken, isAuthenticated } from "./utils/auth";

import { loadProfile } from "./store/slices/profileSlice";
import { setShowTermsDialog } from "./store/slices/userFlagsSlice";
import { loadMatches } from "./store/slices/matchSlice.js";
import "./App.css";

// --------------------------------------------------
// 1) AuthRoutes: login / signup / verify / etc.
// --------------------------------------------------
function AuthRoutes() {
  const isLoggedIn = useSelector((state) => state.userFlags.isLoggedIn);
  const [showTerms, setShowTerms] = useState(false);
  const [authError, setAuthError] = useState("");
  const [signupForm, setSignupForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    dateOfBirth: "",
    terms: false,
  });
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleSignup = async () => {
    setAuthError("");
    try {
      await apiSignup({ ...signupForm });
      navigate("/signup-success", { replace: true });
    } catch (err) {
      setAuthError(err.message || "Signup failed");
    }
  };

  const handleLoginSuccess = async (user, tokens) => {
    dispatch(setCurrentUser({ userId: user.id }));
    dispatch(setLoggedIn(true));
    const profile = await dispatch(loadProfile()).unwrap?.();
    // dispatch(loadProfile());

    if (!profile.profile || !profile.profile.age) {
      navigate("/complete-profile", { replace: true });
    } else {
      navigate("/loveinaction/home", { replace: true });
    }
  };

  if (isLoggedIn) {
    return <Navigate to="/loveinaction/home" replace />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <LoginPage onLogin={handleLoginSuccess} errorMsg={authError} />
        }
      />
      <Route
        path="/signup"
        element={
          <SignUpPage
            form={signupForm}
            setForm={setSignupForm}
            onSubmit={handleSignup}
            errorMsg={authError}
          />
        }
      />
      <Route path="/signup-success" element={<SignupSuccessPage />} />
      <Route path="/verify-success" element={<VerifyPage />} />
      <Route
        path="/terms"
        element={<TermsDialog onClose={() => setShowTerms(false)} />}
      />

      {/* fallback for unknown public routes */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
// --------------------------------------------------
// 3) Complete-Profile wrapper at top level
// --------------------------------------------------
function CompleteProfileWrapper() {
  const navigate = useNavigate();
  const isLoggedIn = useSelector((state) => state.userFlags.isLoggedIn);

  // If user is not logged in, redirect to login
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return (
    <RequireAuth redirectTo="/login">
      <ProfilePage onComplete={() => navigate("/loveinaction/home")} />
    </RequireAuth>
  );
}

// --------------------------------------------------
// 4) Top-level App
// --------------------------------------------------
export default function App() {
  const dispatch = useDispatch();
  const isLoggedIn = useSelector((state) => state.userFlags.isLoggedIn);

  useEffect(() => {
    document.title = "Love In Action";
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      dispatch(loadProfile());
    }
  }, [isLoggedIn, dispatch]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Protected Routes (loveinaction) */}
        <Route
          path="/loveinaction/*"
          element={
            <RequireAuth redirectTo="/login">
              <ProtectedAppRoutes />
            </RequireAuth>
          }
        />

        {/* Complete Profile */}
        <Route path="/complete-profile" element={<CompleteProfileWrapper />} />

        {/* Auth Routes */}
        <Route path="/*" element={<AuthRoutes />} />
        <Route path="/about" element={<PublicAboutPage />} />
      </Routes>
    </BrowserRouter>
  );
}
