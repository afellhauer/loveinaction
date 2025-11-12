import { useEffect, useMemo, useRef } from "react";
import {
  fetchMyActivities,
  selectMyActivities,
  removeActivity,
  selectIsActivitiesLoading,
  setCurrentActivity,
  clearActivityData,
} from "../store/slices/activitySlice";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import "./MyActivitiesPage.css";
import { setActiveSession } from "../store/slices/userFlagsSlice";

export default function MyActivitiesPanel() {
  const dispatch = useDispatch();
  const activities = useSelector(selectMyActivities);
  const loading = useSelector(selectIsActivitiesLoading);
  const navigate = useNavigate();
  const deletingRef = useRef(new Set());

  useEffect(() => {
    dispatch(fetchMyActivities());
  }, [dispatch]);

  const handleDelete = async (id) => {
    try {
      if (deletingRef.current.has(id)) return;
      deletingRef.current.add(id);

      dispatch(clearActivityData(id));

      //navigate away if user is on an activity-related page
      const currentPath = window.location.pathname;
      if (
        currentPath.includes("/loveinaction/matches") ||
        currentPath.includes("/activity") ||
        currentPath.includes("/swipe")
      ) {
        navigate("/loveinaction/myactivities");
      }

      await dispatch(removeActivity(id)).unwrap();
    } catch (error) {
      console.error("Failed to delete activity:", error);
      dispatch(fetchMyActivities());
    } finally {
      deletingRef.current.delete(id);
    }
  };
  const onSelectActivity = (activity) => {
    dispatch(setCurrentActivity(activity)); // ① set in Redux
    navigate("/loveinaction/matches"); // ② go to matches page
  };
  const getDateOnly = (dateStr) => {
    const [year, month, day] = dateStr.slice(0, 10).split("-");
    return new Date(+year, +month - 1, +day);
  };
  const today = new Date();
  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const upcomingActivities = useMemo(() => {
    return activities.filter((a) => {
      if (!a.dates.length) return true;
      return getDateOnly(a.dates[0]) >= todayOnly;
    });
  }, [activities, todayOnly]);

  useEffect(() => {
    if (upcomingActivities.length >= 1) {
      dispatch(setActiveSession(true));
    } else {
      dispatch(setActiveSession(false));
    }
  }, [dispatch, upcomingActivities]);

  const pastActivities = activities.filter((a) => {
    if (!a.dates.length) return false;
    return getDateOnly(a.dates[0]) < todayOnly;
  });

  const cleanActivityName = (str) => {
    const words = str.split(" ");
    const firstWord = words[0].toLowerCase();
    if (["play", "do"].includes(firstWord)) {
      return words.slice(1).join(" ");
    }
    return str;
  };

  return (
    <div className="my-activities-section">
      <h2 className="my-activities-title">Your Activities</h2>

      {loading && (
        <p className="my-activities-loading">Loading activities...</p>
      )}
      {!loading && activities.length === 0 && (
        <p className="my-activities-empty">No activities created yet.</p>
      )}

      <div className="activity-columns-wrapper">
        <div className="activity-column">
          <h3 className="activity-section-subtitle">Past</h3>
          {pastActivities.length === 0 ? (
              <p>No past activities</p>
          ) : (
              pastActivities.map((a) => (
                  <div key={a._id} className="activity-card past">
                    <div className="activity-grid">
                      <div className="activity-grid-item">
                        <p>
                          ⭐ <strong>{cleanActivityName(a.activityType)}</strong>
                        </p>
                      </div>
                      <div className="activity-grid-item">
                        <p>📍 {a.location}</p>
                      </div>
                      <div className="activity-grid-item">
                        <p>
                          🗓️{" "}
                          {a.dates.length
                              ? a.dates.map((d) => d.slice(0, 10)).join(", ")
                              : "Any day"}
                        </p>
                      </div>
                      <div className="activity-grid-item">
                        <p>⏰ {a.times.length ? a.times.join(", ") : "Any time"}</p>
                      </div>
                    </div>
                  </div>
              ))
          )}
        </div>
        <div className="activity-column">
          <h3 className="activity-section-subtitle">Upcoming</h3>
          {upcomingActivities.length === 0 ? (
              <p>No upcoming activities</p>
          ) : (
              upcomingActivities.map((a) => (
                  <div
                      key={a._id}
                      className="activity-card"
                      style={{cursor: "pointer"}}
                      onClick={() => onSelectActivity(a)}>
                    <button
                        className="delete-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(a._id)
                        }}
                        aria-label="Delete activity">
                      ×
                    </button>
                    <div className="activity-grid">
                      <div className="activity-grid-item">
                        <p>
                          ⭐ <strong>{cleanActivityName(a.activityType)}</strong>
                        </p>
                      </div>
                      <div className="activity-grid-item">
                        <p>📍 {a.location}</p>
                      </div>
                      <div className="activity-grid-item">
                        <p>
                          {" "}
                          🗓️{" "}
                          {a.dates.length
                              ? a.dates.map((d) => d.slice(0, 10)).join(", ")
                              : "Any day"}
                        </p>
                      </div>
                      <div className="activity-grid-item">
                        <p>
                          {" "}
                          ⏰ {a.times.length ? a.times.join(", ") : "Any time"}
                        </p>
                      </div>
                    </div>
                  </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
