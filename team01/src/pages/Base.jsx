import React from "react";
import { useSelector, useDispatch } from "react-redux";
import Sidebar from "../components/base/Sidebar";
import Header from "../components/base/Header";

export default function Base({ children, pageTitle }) {
  const dispatch = useDispatch();
  const sidebarOpen = useSelector((s) => s.userFlags.sideBarOpen);

  const closeSidebar = () =>
    dispatch({ type: "userFlags/setSideBarOpen", payload: false });

  return (
      <div className="app-container">
          <div id="modal-root"></div>
          <div id="toast-root"></div>
          <Header pageTitle={pageTitle}/>

          <div className="app-layout">
              {sidebarOpen && (
                  <>
                      <div className="overlay" onClick={closeSidebar}/>
                      <Sidebar/>
                  </>
              )}

              <div className="main-content">{children}</div>
          </div>
      </div>
  );
}