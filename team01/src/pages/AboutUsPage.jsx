import React from "react";
import Base from "./Base";
import { Pages } from "../data/Pages.jsx";
import "./AboutUsPage.css";

export default function AboutUsPage() {
  return (
    <Base pageTitle={Pages.ABOUT}>
      <div className="about-us-container">
        <div className="about-us-content">
          <h1 className="about-us-title">About Us</h1>
          <p className="about-us-description">
            Love In Action is more than just a dating app, we're a platform for meaningful connections.
            Our mission is to help people discover genuine relationships by doing what they love, together.
            We believe that the best relationships are built on shared experiences and common interests.
            Instead of endless swiping, we connect you with others who share your passions and interests
            through shared activities and experiences.
        </p>
          <h2 className="about-us-title">Meet the Founders</h2>
          <div className="founders-grid">
            <div className="founder-card">
              <img src="/assets/founder1.png" alt="Zainab Baig" className="founder-image" />
              <h3 className="founder-name">Zainab Baig</h3>
              <p className="founder-role">Co-Founder</p>
            </div>
            <div className="founder-card">
              <img src="/assets/founder2.png" alt="Minou Khademolsharie" className="founder-image" />
              <h3 className="founder-name">Minou Khademolsharie</h3>
              <p className="founder-role">Co-Founder</p>
            </div>
            <div className="founder-card">
              <img src="/assets/founder3.png" alt="Michelle Lei" className="founder-image" />
              <h3 className="founder-name">Michelle Lei</h3>
              <p className="founder-role">Co-Founder</p>
            </div>
            <div className="founder-card">
              <img src="/assets/founder4.png" alt="Allison Fellhauer" className="founder-image" />
              <h3 className="founder-name">Allison Fellhauer</h3>
              <p className="founder-role">Co-Founder</p>
            </div>
          </div>
        
        </div>
      </div>
    </Base>
  );
}