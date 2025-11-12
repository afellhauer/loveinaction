import React from "react";
import "./Header.css";
import { ArrowLeft } from 'lucide-react';
import {useDispatch, useSelector} from "react-redux";
import {Pages} from "../../data/Pages.jsx";
import {changeView, setSideBarOpen} from "../../store/slices/userFlagsSlice.js";
import { useNavigate } from "react-router-dom";

export default function Header({pageTitle}) {
    const dispatch = useDispatch()
    const navigate = useNavigate();
    const profilePicUrl = useSelector((s) => s.profile?.profile?.profilePicUrl);
    const onToggleSidebar = () => {
        dispatch(setSideBarOpen(true))
    }

    const onBack = () => {
        navigate("/loveinaction/home");
    };

    const goToProfile = () => {
        navigate("/loveinaction/profile");
    };

    return (
        <header className="header">
            <div className="header-top">
                <div className="menu-box" onClick={onToggleSidebar} aria-label="Toggle Sidebar">
                    <div className="side-by-side">
                        <button className="hamburger">
                            <div className="bar"></div>
                            <div className="bar"></div>
                            <div className="bar"></div>
                        </button>
                        <span className="menu-label">MENU</span>
                    </div>
                </div>
                <div className={'logo-container'}>
                    <img src="/assets/logo_title.png" alt="Logo" className="logo"
                    onClick={onBack}
                         style={{ cursor: pageTitle !== Pages.HOME ? "pointer" : "default" }}/>
                </div>
                <div style={{ flex: 1 }}></div>
                <button className="profile-icon-btn" onClick={goToProfile} aria-label="Go to profile">
                    <img 
                        src={profilePicUrl || "/assets/default-profile.png"} 
                        alt="Profile" 
                        className="profile-icon-img" 
                        onError={(e) => {
                            e.target.src = "/assets/default-profile.png";
                        }}
                    />
                </button>
            </div>
            <div className="header-bottom page-header">
                {pageTitle !== Pages.HOME && (
                    <div className="header-content" onClick={onBack}>
                        <button className="back-button">
                            <ArrowLeft size={25} strokeWidth={2.5}/>
                        </button>
                        <span className="page-name">{pageTitle.toUpperCase()}</span>
                    </div>
                )}
                {pageTitle === Pages.HOME && (
                    <span className="page-name">{pageTitle.toUpperCase()}</span>
                )}
            </div>
        </header>
    );
}
