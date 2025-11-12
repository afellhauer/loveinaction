import React from "react";
import { useSelector, useDispatch } from "react-redux";
import Base from "./Base";
import SwipeDashboard from "../components/matching/SwipeDashboard";
import SafetyScoreDialog from "../components/safety-score/SafetyScoreDialog";
import MoreInfoDialog from "../components/safety-score/MoreInfoDialog";

export default function MatchesPage() {
  const dispatch = useDispatch();
  const showSafety = useSelector((s) => s.userFlags.showSafety);
  const showMoreInfo = useSelector((s) => s.userFlags.showMoreInfo);

  return (
    <Base pageTitle="Matches">
      <div className="main-content">
        <div className="dashboard-container">
          <SwipeDashboard
            onViewSafety={() =>
              dispatch({ type: "userFlags/setShowSafety", payload: true })
            }
          />
          {showSafety && (
            <SafetyScoreDialog
              onClose={() =>
                dispatch({
                  type: "userFlags/setShowSafety",
                  payload: false,
                })
              }
            />
          )}
          {showMoreInfo && (
            <MoreInfoDialog
              onClose={() =>
                dispatch({
                  type: "userFlags/setShowMoreInfo",
                  payload: false,
                })
              }
            />
          )}
        </div>
      </div>
    </Base>
  );
}