import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./MatchFilterForm.css";
import { changeView, setActiveSession } from "../../store/slices/userFlagsSlice.js";
import { Views } from "../../data/Views.jsx";
import { 
  createNewActivity, 
  setCurrentActivity,
  selectIsCreateLoading,
  selectCreateError,
  clearCreateError 
} from "../../store/slices/activitySlice.js";
import { useNavigate } from "react-router-dom";

export default function MatchFilterForm() {
  const dispatch = useDispatch();
  
  const isCreateLoading = useSelector(selectIsCreateLoading);
  const createError = useSelector(selectCreateError);
  
  const navigate = useNavigate();
  
  const activities = [
    "play Volleyball",
    "Swim",
    "Hike", 
    "Run",
    "Bike",
    "play Tennis",
    "play Basketball",
    "play Soccer",
    "do Yoga",
    "Dance",
  ];

  const locations = [
    "ubc",
    "kitsilano",
    "downtown", 
    "mt pleasant",
    "olympic village",
    "kerrisdale"
  ];

  const timesOfDay = [
    "morning",
    "afternoon", 
    "evening"
  ];

  const [activity, setActivity] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [location, setLocation] = useState("");

  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + 7);
  const maxDateString = maxDate.toISOString().split('T')[0];

  const allFieldsFilled = activity && selectedDate && location && timeOfDay;

  const handleConfirm = async () => {
    if (!allFieldsFilled) return;

    dispatch(clearCreateError());
    
    try {
      const activityData = {
        activityType: activity,
        location: location,
        dates: [new Date(selectedDate)],
        times: [timeOfDay]
      };

      const newActivity = await dispatch(createNewActivity(activityData)).unwrap();
      
      dispatch(setCurrentActivity(newActivity));
      dispatch(setActiveSession(true));
      navigate("/loveinaction/matches");

    } catch (error) {
      console.error("Failed to create activity:", error);
    }
  };

  const handleSurpriseMe = async () => {
    dispatch(clearCreateError());
    
    try {
      const randomActivity = activities[Math.floor(Math.random() * activities.length)];
      const randomLocation = locations[Math.floor(Math.random() * locations.length)];
      
      const activityData = {
        activityType: randomActivity,
        location: randomLocation,
        dates: [], // Open to any date
        times: [] // Open to any time
      };

      const newActivity = await dispatch(createNewActivity(activityData)).unwrap();
      
      dispatch(setCurrentActivity(newActivity));
      dispatch(setActiveSession(true));
      navigate("/loveinaction/matches");

    } catch (error) {
      console.error("Failed to create surprise activity:", error);
    }
  };

  return (
    <div className="match-filter">
      <h2 className="filter-title">Today I feel like doing....</h2>
      
      {createError && (
        <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>
          Error: {createError}
        </div>
      )}
      
      <form className="filter-form" onSubmit={(e) => e.preventDefault()}>
        <div className="filter-field">
          <label className="filter-label">What:</label>
          <select
            className="filter-input"
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            disabled={isCreateLoading}
          >
            <option value="">Select your activity...</option>
            {activities.map((act) => (
              <option key={act} value={act}>
                {act.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        
        <div className="filter-field">
          <label className="filter-label">Where:</label>
          <select
            className="filter-input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={isCreateLoading}
          >
            <option value="">Select your location...</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc.toUpperCase().replace(' ', ' ')}
              </option>
            ))}
          </select>
        </div>
        
        <div className="filter-field">
          <label className="filter-label">When:</label>
          <input
            className="filter-input"
            type="date"
            min={todayString}
            max={maxDateString}
            value={selectedDate}
            onKeyDown={(e) => e.preventDefault()}
            onChange={(e) => setSelectedDate(e.target.value)}
            disabled={isCreateLoading}
          />
        </div>
        
        <div className="filter-field">
          <label className="filter-label">Time of Day:</label>
          <select
            className="filter-input"
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(e.target.value)}
            disabled={isCreateLoading}
          >
            <option value="">Select which time of day...</option>
            {timesOfDay.map((time) => (
              <option key={time} value={time}>
                {time.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="btn-confirm"
          disabled={!allFieldsFilled || isCreateLoading}
          onClick={handleConfirm}
        >
          {isCreateLoading ? 'Creating...' : 'Confirm'}
        </button>

        <p className="or-text">OR</p>

        <button
          type="button"
          className="btn-surprise"
          onClick={handleSurpriseMe}
          disabled={isCreateLoading}
        >
          {isCreateLoading ? 'Creating...' : 'Surprise Me'}
        </button>
      </form>
    </div>
  );
}
