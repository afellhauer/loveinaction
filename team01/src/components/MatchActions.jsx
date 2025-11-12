// 📁 src/components/MatchActions.jsx
import "./MatchActions.css";

import {resetSwipes} from "../store/slices/profilesSlice.js";
import {useDispatch, useSelector} from "react-redux";
import { useNavigate } from "react-router-dom";
import { selectHasUnratedConfirmedMatches } from '../store/slices/matchSlice.js';

export default function MatchActions() {
  const activeSession = useSelector((state) => state.userFlags.activeSession);
  const dispatch = useDispatch();
  const hasUnratedMatches = useSelector(selectHasUnratedConfirmedMatches);


  const navigate = useNavigate();
  const onNewMatch = () => {
    dispatch(resetSwipes());
    navigate("/loveinaction/make-a-new-match");
  }
  const onResumeMatching = () => {
        navigate("/loveinaction/matches");
    };

  return (
      <div className="match-actions">
        {activeSession && (
            <button className="action-button" onClick={onResumeMatching}>
              Resume Matching
            </button>
        )}
        <div className="tooltip-wrapper">
          <button
              className="action-button"
              onClick={onNewMatch}
              disabled={hasUnratedMatches}>
            New Activity
          </button>
          {hasUnratedMatches && (
          <div className="custom-tooltip">
            Please rate your previous match before starting a new one
          </div>
          )}
        </div>
      </div>
    );
  }
