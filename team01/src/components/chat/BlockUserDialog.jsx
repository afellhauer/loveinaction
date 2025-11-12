// src/components/chat/BlockUserDialog.jsx
import React, { useState } from "react";
import {useDispatch, useSelector} from "react-redux";
import {blockUserAsync, fetchBlockedUsers, selectBlockedUsersLoading} from "../../store/slices/blockedUsersSlice";
import "./BlockUserDialog.css";

const BlockUserDialog = ({ user, onClose, setBlockMessage  }) => {
  const loading = useSelector(selectBlockedUsersLoading);
  const [reason, setReason] = useState("inappropriate");

  const dispatch = useDispatch();


  const handleBlock = async () => {
    try {
      console.log("Attempting to block user:", { userId: user.id || user._id, reason });
      
      if (handleBlockUser) {
        await handleBlockUser(reason);
      }
      await dispatch(fetchBlockedUsers());
      onClose();
    } catch (error) {
      console.error("Error blocking user:", error);
    }
  };

  const handleBlockUser = async (reason) => {
      try {
        await dispatch(
            blockUserAsync({ userId: user.id, reason })
        ).unwrap();
        console.log("Block successful");

        const firstName = user.firstName;
        setBlockMessage(
            `${firstName} has been blocked.`
        );

        setTimeout(() => {
          setBlockMessage("");
        }, 5000);
      } catch (error) {
        console.error("Error blocking user:", error);
        setBlockMessage("Failed to block user. Please try again.");
        setTimeout(() => setBlockMessage(""), 3000);
      }
  };

  const userName = user.firstName || user.name?.split(' ')[0] || 'User';

  return (
    <div className="block-dialog-overlay" onClick={onClose}>
      <div className="block-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="block-dialog-header">
          <h3>Block {userName}?</h3>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="block-dialog-content">
          <p className="block-warning">
            You will no longer be able to see each other's profiles, send messages, or match again.
          </p>
          
          <div className="block-reason-section">
            <label>Reason for blocking:</label>
            <div className="reason-options">
              <label>
                <input
                  type="radio"
                  value="inappropriate"
                  checked={reason === "inappropriate"}
                  onChange={(e) => setReason(e.target.value)}
                />
                Inappropriate behavior
              </label>
              <label>
                <input
                  type="radio"
                  value="harassment"
                  checked={reason === "harassment"}
                  onChange={(e) => setReason(e.target.value)}
                />
                Harassment
              </label>
              <label>
                <input
                  type="radio"
                  value="spam"
                  checked={reason === "spam"}
                  onChange={(e) => setReason(e.target.value)}
                />
                Spam
              </label>
              <label>
                <input
                  type="radio"
                  value="other"
                  checked={reason === "other"}
                  onChange={(e) => setReason(e.target.value)}
                />
                Other
              </label>
            </div>
            

          </div>
        </div>
        
        <div className="block-dialog-actions">
          <button className="cancel-button" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button 
            className="block-button" 
            onClick={handleBlock}
            disabled={loading}
          >
            {loading ? "Blocking..." : "Block User"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlockUserDialog;
