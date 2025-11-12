import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setLoggedIn, logout } from "../../store/slices/userFlagsSlice";
import { jwtDecode } from "jwt-decode";
import { persistor } from "../../store/store";
import { getCurrentUserIdFromToken } from "../../utils/auth";
import { clearCurrentUser, setCurrentUser } from "../../store/slices/profilesSlice";

export default function RequireAuth({ children, redirectTo = "/login" }) {
  const token = localStorage.getItem("accessToken");
  const location = useLocation();
  const dispatch = useDispatch();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    let invalid = false;
    if (!token) {
      invalid = true;
    } else {
      try {
        const { exp } = jwtDecode(token);
        if (Date.now() >= exp * 1000) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          invalid = true;
        }
      } catch {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        invalid = true;
      }
    }
    if (invalid) {
      persistor.purge().then(() => {
        dispatch(setLoggedIn(false));
        dispatch(clearCurrentUser())
        dispatch(logout());
        setShouldRedirect(true);
      });
    } else {
      dispatch(setLoggedIn(true));
      const userId = getCurrentUserIdFromToken();
      if (userId) {
        dispatch(setCurrentUser({ userId }));
      } 
    }
  }, [token, dispatch]);

  if (shouldRedirect) {
    return (
      <Navigate
        to={redirectTo}
        state={{ next: location.pathname, message: "Logged out due to session expiry" }}
        replace
      />
    );
  }

  return children;
}