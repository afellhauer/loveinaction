import React, { useState, useEffect } from "react";
import "./AlertCard.css";
import RatingModal from "./rating/RatingModal.jsx";
import { AlertTriangle } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setAlertDismissed } from "../store/slices/userFlagsSlice.js";
import { submitRatingThunk } from "../store/slices/ratingSlice";
import { resetRatingStatus } from "../store/slices/ratingSlice";
import { loadMatches } from "../store/slices/matchSlice.js";
import ModalPortal from "./base/ModalPortal.jsx";

export default function AlertCard({
  title,
  message,
  className = "",
  action = "",
  rateeId,
  name,
}) {
  const [modalIsOpen, setIsOpen] = useState(false);
  // grab _all_ matches still in “date_passed”
  const pending = useSelector((s) =>
    (s.matches.matches || []).filter((m) => m.status === "date_passed")
  );
  // which one we’re currently rating
  const [idx, setIdx] = useState(0);
  const current = pending[idx];

  const dispatch = useDispatch();
  const ratingSuccess = useSelector((state) => state.ratings.success);

  useEffect(() => {
    if (ratingSuccess) {
      dispatch(setAlertDismissed(true));
      dispatch(resetRatingStatus());
      dispatch(loadMatches());
    }
  }, [ratingSuccess, dispatch]);

  const onClose = () => {
    dispatch(setAlertDismissed(true));
  };

  const handleSubmitRating = (ratingData) => {
    dispatch(
      submitRatingThunk({ ...ratingData, ratee: current.otherUser._id })
    );
    setIsOpen(false);
  };

  return (
    <div className={`alert-card alert-red ${className}`}>
      <div className="alert-text">
        <h3>
          <AlertTriangle
            size={24}
            color="#000"
            style={{ marginRight: "8px" }}
          />
          {title}
        </h3>
        <p>{message}</p>

        {action === "rate" && rateeId && name && (
          <>
            <button className="rate-button" onClick={() => setIsOpen(true)}>
              Rate
            </button>
            {modalIsOpen && (
              <ModalPortal>
                <RatingModal
                  onSubmit={handleSubmitRating}
                  onClose={() => setIsOpen(false)}
                  name={name}
                  rateeId={rateeId}
                />
              </ModalPortal>
            )}
          </>
        )}
      </div>
      <button className="alert-close" onClick={onClose}>
        ×
      </button>
    </div>
  );
}
