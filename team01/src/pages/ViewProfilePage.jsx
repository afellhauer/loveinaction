import React from "react";
import Base from "./Base";
import ProfileDetailsPage from "../components/profile/ProfileDetailsPage.jsx";
import { Pages } from "../data/Pages.jsx";

export default function ViewProfilePage() {
  return (
    <Base pageTitle={Pages.PROFILE}>
      <div className="main-content">
        <ProfileDetailsPage />
      </div>
    </Base>
  );
}