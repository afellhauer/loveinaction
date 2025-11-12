import React from "react";
import { useNavigate } from "react-router-dom";
import "./PublicAboutPage.css";

export default function PublicAboutPage() {
  const navigate = useNavigate();

  return (
    <div className="public-about-container">
      <div className="public-about-header">
        <button 
          onClick={() => navigate("/login")}
          className="back-to-login-btn"
        >
          ← Back to Login
        </button>
        <div className="public-login-header-right">
          <h1 className="public-login-main-title">
            Love In <span className="public-login-main-title-accent">Action</span>
          </h1>
        </div>
      </div>
      
      <div className="public-about-content">
        <div className="public-about-intro">
          <h2 className="public-about-title">About Us</h2>
          <p className="public-about-description">
            Love In Action is more than just a dating app, we're a platform for meaningful connections.
            Our mission is to help people discover genuine relationships by doing what they love, together.
            We believe that the best relationships are built on shared experiences and common interests.
            Instead of endless swiping, we connect you with others who share your passions and interests
            through shared activities and experiences.
          </p>
        </div>
        
        <div className="public-founders-section">
          <h2 className="public-founders-title">Meet Our Founders</h2>
          <div className="public-founders-grid">
            <div className="public-founder-card">
              <img src="/assets/founder1.png" alt="Zainab Baig" className="public-founder-image" />
              <h3 className="public-founder-name">Zainab Baig</h3>
              <p className="public-founder-role">Co-Founder</p>
            </div>
            <div className="public-founder-card">
              <img src="/assets/founder2.png" alt="Minou Khademolsharie" className="public-founder-image" />
              <h3 className="public-founder-name">Minou Khademolsharie</h3>
              <p className="public-founder-role">Co-Founder</p>
            </div>
            <div className="public-founder-card">
              <img src="/assets/founder3.png" alt="Michelle Lei" className="public-founder-image" />
              <h3 className="public-founder-name">Michelle Lei</h3>
              <p className="public-founder-role">Co-Founder</p>
            </div>
            <div className="public-founder-card">
              <img src="/assets/founder4.png" alt="Allison Fellhauer" className="public-founder-image" />
              <h3 className="public-founder-name">Allison Fellhauer</h3>
              <p className="public-founder-role">Co-Founder</p>
            </div>
          </div>
        </div>
        


        <div className="public-cta-section">
          <h3 className="public-cta-title">Ready to find your perfect match?</h3>
          <div className="public-cta-buttons">
            <button 
              onClick={() => navigate("/login")}
              className="public-cta-login"
            >
              Login
            </button>
            <button 
              onClick={() => navigate("/signup")}
              className="public-cta-signup"
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}