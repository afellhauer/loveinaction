import React from "react";
import "./Sidebar.css";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setLoggedIn, setSideBarOpen, logout } from "../../store/slices/userFlagsSlice.js";
import { persistor } from "../../store/store";
import { clearCurrentUser } from "../../store/slices/profilesSlice.js";

export default function Sidebar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const navigateAndClose = (path) => {
    navigate(path);
    dispatch(setSideBarOpen(false)); 
  };

  const onLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    persistor.purge().then(() => {
      dispatch(logout());
      dispatch(clearCurrentUser());
      dispatch(setLoggedIn(false));
      dispatch(setSideBarOpen(false));
      navigate("/login");
    });

  };

  return (
    <div className="sidebar visible">
      <div className="sidebar-content">
        <div className="sidebar-logo">
          <img src="/assets/logo_title.png" alt="Logo" className="logo-img" />
        </div>
        <nav className="nav-buttons">
          <button
              className="nav-button"
              onClick={() => navigateAndClose("/loveinaction/home")}>
            HOME
          </button>
          <button
              className="nav-button"
              onClick={() => navigateAndClose("/loveinaction/chat")}>
            CHAT
          </button>
          <button
              className="nav-button"
              onClick={() => navigateAndClose("/loveinaction/ratings")}>
            RATINGS
          </button>
          <button
              className="nav-button"
              onClick={() => navigateAndClose("/loveinaction/help")}>
            HELP
          </button>
          <button
              className="nav-button"
              onClick={() => navigateAndClose("/loveinaction/about")}>
            ABOUT US
          </button>
          <button
              className="nav-button-back-mobile-only"
              onClick={() => navigateAndClose("/loveinaction/home")}>
            BACK
          </button>
        </nav>
        <div className="logout-button" onClick={onLogout}>
          LOGOUT
        </div>
      </div>
    </div>
  );
}
