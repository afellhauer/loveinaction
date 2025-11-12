import React from "react";
import "./MoreInfoDialog.css";
import {setShowMoreInfo} from "../../store/slices/userFlagsSlice.js";
import {useDispatch} from "react-redux";

export default function MoreInfoDialog() {
    const dispatch = useDispatch()
    const onClose = () => {
        dispatch(setShowMoreInfo(false))
    }

    return (
    <div className="dialog-overlay">
      <div className="moreinfo-dialog">
        <button className="dialog-close" onClick={onClose}>×</button>
        <div className="moreinfo-title">
          <span>How Safety Score System Works?</span>
        </div>
        <div className="moreinfo-content">
            <p>
                The Safety Score system is designed to enhance user safety and trust within the platform. 
                It evaluates user interactions based on various criteria, including:
            </p>
            <ul>
                <li>Verified ID status</li>
                <li>Feedback on safety and respect during interactions</li>
                <li>Connection quality, such as conversation skills and active listening</li>
            </ul>
            <p>
                Users can earn badges for completing safety checks and maintaining a positive interaction history. 
            </p>
          </div>
      </div>
    </div>
  );
}