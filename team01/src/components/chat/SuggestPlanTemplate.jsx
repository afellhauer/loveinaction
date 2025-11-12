// SuggestPlanTemplate.jsx
import { useState } from "react";
import { createPortal } from "react-dom";
import "../safety-score/SafetyScoreDialog.css";
import "./SuggestPlanTemplate.css"
import { generatePlanMessage } from "../../utils/chatHelpers.js";
import 'react-time-picker/dist/TimePicker.css';
import TimePicker from 'react-time-picker';
import {convertDateToDayString, getUTCDate} from "../../utils/getUTCDate.js";

export default function SuggestPlanTemplate({ onClose, match, profile, onSend }) {
    const [timeString, setTimeString] = useState("16:00");
    const [locationString, setLocationString] = useState(match.location);
    const [isFormValid, setIsFormValid] = useState(true);
    const [message, setMessage] = useState(generatePlanMessage(convertTo12HourFormat(timeString), match.location, profile.user.firstName, match.activityType, convertDateToDayString(match.dates[0])));


    const generateMessage = (time, location) => {
        const profileFirst = profile.user.firstName;
        const activity = match.activityType;
        const scheduledTime = convertDateToDayString(match.dates[0]);
        return generatePlanMessage(time, location, profileFirst, activity, scheduledTime);
    };

    const handleTimeChange = (value) => {
        const formatted = convertTo12HourFormat(value);
        setTimeString(formatted);
        const newMessage = generateMessage(formatted, locationString);
        setMessage(newMessage);
        setIsFormValid(formatted.trim() !== "" && locationString.trim() !== "");
    };

    const handleLocationChange = (e) => {
        const value = e.target.value;
        setLocationString(value);
        const newMessage = generateMessage(timeString, value);
        setMessage(newMessage);
        setIsFormValid(timeString.trim() !== "" && value.trim() !== "");
    };

    return createPortal(
        <div className="dialog-overlay suggest-plan-overlay">
            <div className="safety-dialog">
                <button className="dialog-close" onClick={onClose}>×</button>
                <h2 className="dialog-title">Make your plans!</h2>
                <p>Activity: {match.activityType}</p>
                <p>Time: {convertDateToDayString(match.dates[0])}</p>
                <form className="login-form" onSubmit={(e) => e.preventDefault()}>
                    <div className="login-field">
                        <label className="login-label">Time</label>
                        <TimePicker
                            onChange={handleTimeChange}
                            value={timeString}
                            disableClock={true}
                            format="hh:mm a"
                            required
                            className="custom-time-picker"
                        />
                    </div>
                    <div className="login-field">
                        <label className="login-label">Location</label>
                        <input
                            className="login-input"
                            placeholder="Please specify a specific location"
                            value={locationString}
                            onChange={handleLocationChange}
                            required
                        />
                    </div>
                    <label className="login-label">Output:</label>
                    <div className="login-field">
                        <textarea className="login-textarea" readOnly value={message}></textarea>
                    </div>
                </form>
                <div className="dialog-buttons">
                    <button className="dialog-btn back" onClick={onClose}>Cancel</button>
                    <button
                        className="dialog-btn back"
                        onClick={() => {
                            onSend(message)
                            onClose()
                        }}
                        disabled={!isFormValid}
                    >
                        Submit
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}



function convertTo12HourFormat(time24) {
    if (!time24) return "";
    const [hourStr, minute] = time24.split(":");
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${ampm}`;
}