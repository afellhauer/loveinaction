import React, {useEffect, useMemo, useRef, useState} from "react";
import "./ChatDashboard.css";
import { useDispatch, useSelector } from "react-redux";
import { getCurrentUserIdFromToken } from "../../utils/jwt";
import { selectUser } from "../../store/slices/profileSlice";
import {
  removeMatchById,
  selectMatches,
  updateMatchConfirmedStatusInStore,
  updateTrustedStatusInStore
} from "../../store/slices/matchSlice";
import { loadMatchesWithProfiles } from "../../store/thunks/loadMatchesWithProfiles";
import {sendMessage, addMessage, fetchMessages, updateConfirmationState} from "../../store/slices/messageSlice";
import { socket } from "../../socket";
import SuggestPlanTemplate from "./SuggestPlanTemplate.jsx";
import FinalConfirmModal from "./FinalConfirmModal.jsx";
import ViewProfileCardModal from "../profile/ViewProfileCardModal.jsx";
import { Flag } from "lucide-react";
import BlockUserDialog from "./BlockUserDialog.jsx";
import Toast from "../base/Toast.jsx";
import SafetyScoreDialog from "./SafetyScoreDialog.jsx";
import ProvideContactInfoModal from "./ProvideContactInfoModal.jsx";
import { getUTCDate } from "../../utils/getUTCDate";

export default function ChatDashboard({ selectedMatchId }) {
  const allMessagesByMatchId = useSelector(state => state.messages.byMatchId);
  const dispatch = useDispatch();
  const userId = getCurrentUserIdFromToken();
  const user = useSelector(selectUser);

  const matches = useSelector(selectMatches);
  console.log("Matches in ChatDashboard:", matches);
  const profilesByUserId = useSelector(state => state.matchedProfiles.profilesByUserId);
  const [selectedMatchIdState, setSelectedMatchIdState] = useState(selectedMatchId || null);

  // States for various dialogs and modals
  const [showSuggestPlanDialog, setShowSuggestPlanDialog] = useState(false);
  const [showFinalConfirmModal, setShowFinalConfirmModal] = useState(false);
  const [showContactInfoModal, setShowContactInfoModal] = useState(false);
  const [showMatchProfile, setShowMatchProfile] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockMessage, setBlockMessage] = useState("");
  const [showSafety, setShowSafety] = useState(false);


  // Load matches with profiles when the component mounts or when selectedMatchId changes
  useEffect(() => {
    dispatch(loadMatchesWithProfiles());
  }, [selectedMatchId, dispatch]);

  // Select messages for the currently selected match [Memoization to avoid unnecessary re-renders]
  const messages = useSelector(state => state.messages.byMatchId[selectedMatchIdState]);
  const memoizedMessages = useMemo(() => messages || [], [messages]);


  const justSent = userJustSent(memoizedMessages, userId);
  const showConfirmButton = hasTwoConfirmations(memoizedMessages);
  const latestPlanMessage = [...memoizedMessages].reverse().find(m => m.messageType === "plans");

  const getMostRecentMessage = (id, otherUserId) => {
    const messages = allMessagesByMatchId[id];
    if (!messages) {
        return "Loading..."
    }
    if (messages.length === 0) {
        return "Start a conversation";
    }

    const recentMessage = messages[messages.length - 1];
    if (recentMessage.messageType === "plans") {
      if (recentMessage.senderId._id === otherUserId) {
        return "Response needed"
      } else {
        return "Waiting for response"
      }
    } else if (recentMessage.messageType === "confirmation") {
      if (recentMessage.senderId._id === otherUserId) {
        return "Confirmation needed"
      } else {
        return "Waiting for confirmation"
      }
    } else if (recentMessage.messageType === "cancellation") {
        return "Cancelled"
    }
  }

  // Handle matches being blocked [listen for socket event]
  useEffect(() => {
    const handleMatchesBlocked = ({ matchIds }) => {
      for (const id of matchIds) {
        dispatch(removeMatchById(id));
      }
    };

    socket.on("matchesBlocked", handleMatchesBlocked);
    return () => {
      socket.off("matchesBlocked", handleMatchesBlocked);
    };
  }, [dispatch]);


  // Join the room for the selected match and fetch messages when it changes
  useEffect(() => {
    if (selectedMatchIdState) {
      socket.emit("joinMatch", selectedMatchIdState);
      dispatch(fetchMessages({ matchId: selectedMatchIdState }));
    }

    return () => {
      if (selectedMatchIdState) {
        socket.emit("leaveMatch", selectedMatchIdState);
      }
    };
  }, [selectedMatchIdState, dispatch]);

  // Listen for incoming chat messages and dispatch them to the store
  useEffect(() => {
    const handler = (message = {}) => {
      console.log("Received message:", message);
      dispatch(addMessage(message));
    };
    socket.on("chatMessage", handler);
    return () => {
      socket.off("chatMessage", handler);
    };
  }, [dispatch]);

  const handleSend = (type, content = "") => {
    if (type === "confirmation" || type === "cancellation") {
      const contentMap = {
        confirmation: "Sounds good!",
        cancellation: "Sorry, I can't make it.",
      };
      content = contentMap[type];
    }

    //contact info serialization
    if (type === "contact_info" && typeof content === "object" && content !== null) {
      content = JSON.stringify(content);
    }
    dispatch(sendMessage({ matchId: selectedMatchIdState, content: content, messageType: type }));
  };

  const allowedTypes = getNextAllowedTypes(memoizedMessages);
  const done = isConversationDone(memoizedMessages);

  const currentMatch = matches.find(m => m._id === selectedMatchIdState);
  const currentProfile = currentMatch ? profilesByUserId[currentMatch.otherUser._id] : null;
  const status = confirmationStatus(currentMatch);
  const sentContactInfo = hasSentContactInfo(memoizedMessages, userId);

  useEffect(() => {
    const handleDateFinalized = (updatedMatch) => {
      dispatch(updateMatchConfirmedStatusInStore(updatedMatch));
    };

    const handleMeConfirmed = (updatedMatch) => {
      dispatch(updateMatchConfirmedStatusInStore(updatedMatch));
    };

    socket.on("dateFinalized", handleDateFinalized);
    socket.on("meConfirmed", handleMeConfirmed);

    return () => {
      socket.off("dateFinalized", handleDateFinalized);
      socket.off("meConfirmed", handleMeConfirmed);
    };
  }, [dispatch]);

  const messageContentRef = useRef(null);

  useEffect(() => {
    if (messageContentRef.current) {
      messageContentRef.current.scrollTop = messageContentRef.current.scrollHeight;
    }
  }, [memoizedMessages]);

  //join the user room for trusted contact notifications
  useEffect(() => {
    if (userId) {
      socket.emit("joinUserRoom", userId);
    }
  }, [userId]);

  useEffect(() => {
    function handleTrustedContactNotified({ matchId, message }) {
      dispatch(addMessage({
        matchId: matchId,
        _id: `system-${Date.now()}`,
        content: message,
        messageType: "system",
        createdAt: new Date().toISOString(),
      }));
      dispatch(updateTrustedStatusInStore(matchId))
    }
    socket.on("trustedContactNotified", handleTrustedContactNotified);
    return () => {
      socket.off("trustedContactNotified", handleTrustedContactNotified);
    };
  }, [dispatch]);

  useEffect(() => {
    if (selectedMatchId && selectedMatchId !== selectedMatchIdState) {
      setSelectedMatchIdState(selectedMatchId);
    }
  }, [selectedMatchId]);

  return (
      <div className="message-container">
        <div className="message-sidebar">
          {matches.map(match => {
            const isActive = match._id === selectedMatchIdState;
            return (
                <div
                    key={match._id}
                    className={`message-item${isActive ? " active" : ""}`}
                    onClick={() => {
                      setSelectedMatchIdState(match._id)
                    }}
                    style={{ cursor: "pointer" }}
                >
                  <div className="profile-icon-container">
                    <img
                        src={
                            profilesByUserId[match.otherUser._id]?.profile?.profilePicUrl
                            || "/assets/default-profile.png"
                        }
                        alt="Profile"
                        className="profile-icon-img"
                        onError={(e) => {
                          e.target.src = "/assets/default-profile.png";
                        }}
                    />
                    <div className="profile-text-column">
                      <div className="chatter-name">{`${match.otherUser.firstName} ${match.otherUser.lastName}`}</div>
                      <div className="chat-status">
                        {match.status === "confirmed" ? "Confirmed" : getMostRecentMessage(match._id, match.otherUser._id)}
                      </div>
                    </div>
                  </div>

                </div>
            );
          })}
        </div>

        <div className="message-body">
          {currentMatch && currentProfile ? (
              <>
                <div className="chat-profile-header">
                  <h2 className="chat-profile-name">{currentProfile.user.firstName}</h2>
                    <div className="profile-image-wrapper" onClick={() => setShowMatchProfile(true)}>
                      <img
                          src={
                              profilesByUserId[currentMatch.otherUser._id]?.profile?.profilePicUrl ||
                              "/assets/default-profile.png"
                          }
                          alt="Profile"
                          className="profile-icon-img large"
                          onError={(e) => {
                            e.target.src = "/assets/default-profile.png";
                          }}
                      />
                      <div className="view-overlay">
                        <div className="view-overlay-text">View</div>
                      </div>
                    </div>
                  <p className="profile-activity">
                    {currentMatch.activityType ? `Your activity: ${currentMatch.activityType}` : ""}
                  </p>
                  <div className="report-flag-container" onClick={() => setShowBlockModal(true)} title="Report or Block">
                    <Flag size={20} className="report-flag-icon"/>
                    <span className="report-label">Report</span>
                  </div>
                </div>

                <div className="message-content" ref={messageContentRef}>
                  {memoizedMessages.map((msg, idx) => {
                    const senderId = typeof msg.senderId === "string" ? msg.senderId : msg.senderId?._id;
                    const isSent = senderId === userId;

                    if (msg.messageType === "system") {
                      return (
                        <div
                          key={idx}
                          className="message-bubble system-message"
                        >
                          <span>{msg.content}</span>
                        </div>
                      );
                    }

                    // fromatting contact info messages
                    if (msg.messageType === "contact_info") {
                      let contact = null;
                      try {
                        contact = JSON.parse(msg.content);
                      } catch (e) {}
                      return (
                        <div
                          key={idx}
                          className={`message-bubble contact-info-message ${isSent ? "sent" : "received"}`}
                        >
                          <span>
                            Here are my contact details:<br/>
                            {contact && contact.email && (
                              <>
                                Email: {contact.email}<br/>
                              </>
                            )}
                            {contact && contact.phone && (
                              <>
                                Phone: {contact.phone}
                              </>
                            )}
                            {(!contact || (!contact.email && !contact.phone)) && (
                              <>{msg.content}</>
                            )}
                          </span>
                          <div className="timestamp">
                            {new Date(msg.createdAt || msg.timestamp || Date.now()).toLocaleTimeString()}
                          </div>
                        </div>
                      );
                    }

                    return (
                        <div
                            key={idx}
                            className={`message-bubble ${isSent ? "sent" : "received"}`}
                        >
                          <span>{msg.content}</span>
                          <div className="timestamp">
                            {new Date(msg.createdAt || msg.timestamp || Date.now()).toLocaleTimeString()}
                          </div>
                        </div>
                    );
                  })}
                </div>


                <div className="button-box-container chat-options">
                  {!done ? (
                      justSent ? (
                          <div className="waiting-message">
                            ⏳ Waiting for response from {currentProfile.user.firstName}
                          </div>
                      ) : (
                          allowedTypes.map(type => (
                              <button
                                  key={type}
                                  className="chat-button padding-extra"
                                  onClick={() => {
                                    if (type === "plans") {
                                      setShowSuggestPlanDialog(true)
                                    } else {
                                      handleSend(type);
                                    }
                                  }}
                              >
                                {type === "plans"
                                    ? "Suggest Plans"
                                    : type === "confirmation"
                                        ? "Sounds Good"
                                        : "Sorry I Can’t Make It"}
                              </button>
                          ))
                      )
                  ) : (
                      <div className="conversation-complete-wrapper">
                        <div className="conversation-complete">
                          {status !== "date_passed"
                            ? "✔️ Conversation Complete"
                            : "This conversation is closed as the date has passed."}
                        </div>
                        {currentProfile && status === "waiting_for_them" && (
                          <div className="waiting-under-complete">
                            <span role="img" aria-label="hourglass">⏳</span> Waiting for {currentProfile.user.firstName} to confirm...
                          </div>
                        )}
                        {currentProfile && status === "finalized" && (
                            <div className="conversation-confirmed">
                              🎉 Date Confirmed! You’re all set with {currentProfile.user.firstName}.
                              {!sentContactInfo && (
                                  <button
                                      className="chat-button padding-extra"
                                      onClick={() => setShowContactInfoModal(true)}
                                      style={{ marginTop: "0.5rem" }}
                                  >
                                    Send contact info
                                  </button>
                              )}
                            </div>
                        )}
                      </div>
                    )}
                </div>
                {showConfirmButton && (status === "waiting_for_me" || status === "not_confirmed")&& (
                    <button
                        className="chat-button final-confirm confirm-btn-compact"
                        onClick={() => setShowFinalConfirmModal(true)}
                        style={{margin: "0 auto", display: "block", minWidth: 0, width: "fit-content"}}
                    >
                      Would you like to confirm the plan?
                    </button>
                )}

              </>
          ) : (
              <p className="empty-text">Select a match to start chatting</p>
          )}
        </div>
        {showSuggestPlanDialog && currentProfile && (
            <SuggestPlanTemplate
                match={currentMatch}
                profile={currentProfile}
                onClose={() => setShowSuggestPlanDialog(false)}
                onSend={(content) => handleSend("plans", content)}
            />
        )}
        {showFinalConfirmModal && (
            <FinalConfirmModal
                latestPlanMessage={latestPlanMessage}
                onClose={() => setShowFinalConfirmModal(false)}
                onConfirm={() => {
                  dispatch(updateConfirmationState({ matchId: selectedMatchIdState }));
                  setShowFinalConfirmModal(false);
                }}
            />
        )}
        {showMatchProfile && currentProfile && currentMatch && (
              <ViewProfileCardModal
                  name = {currentProfile.user.firstName}
                  age = {currentProfile.profile.age}
                  image={currentProfile.profile.profilePicUrl}
                  bio={currentProfile.profile.bio}
                  safetyScore={currentMatch.safetyScore}
                  badges={currentMatch.badges}
                  gender={currentProfile.gender}
                  socialMedia={currentProfile.profile.socialMedia}
                  onClose={() => setShowMatchProfile(false)}
                  onShowSafety={() => setShowSafety(true)}
              />
        )}
        {showSafety && currentMatch && (
            <SafetyScoreDialog
              safetyScore={currentMatch.safetyScore}
              badges={currentMatch.badges}
              onClose={() => setShowSafety(false)}
            />

        )}
        {showBlockModal && currentProfile && (
            <BlockUserDialog
              user={currentProfile.user}
              onClose={() => setShowBlockModal(false)}
              setBlockMessage={(message)=> setBlockMessage(message)}
            />
        )}
        {blockMessage && <Toast message={blockMessage} />}

        {showContactInfoModal && (
          <ProvideContactInfoModal
              userEmail={user?.email}
              onSend={(content) => handleSend("contact_info", content)}
              onClose={() => setShowContactInfoModal(false)}
          />
        )}

      </div>
  );
}


function getNextAllowedTypes(messages) {
  if (!messages || messages.length === 0) return ["plans"];

  const last = messages[messages.length - 1];
  if (last.messageType === "cancellation") return [];

  // const plans = messages.filter((m) => m.messageType === "plans"); // no use for plans yet
  const confirmations = messages.filter((m) => m.messageType === "confirmation");

  const hasBothConfirmed = new Set(confirmations.map((m) => m.senderId)).size === 2;
  if (hasBothConfirmed) return [];

  if (confirmations.length === 1) return ["confirmation", "cancellation"];

  return ["plans", "confirmation", "cancellation"];
}

function confirmationStatus(match) {
  if (!match) return "not_confirmed";
    if (match.status === "confirmed") {
      return "finalized";
    } else if (match.status === "date_passed" || match.status === "expired") {
      return "date_passed";
    } else if (match.theirConfirmed === true && match.myConfirmed === false) {
      return "waiting_for_me";
    } else if (match.theirConfirmed === false && match.myConfirmed === true) {
      return "waiting_for_them";
    } else {
      return "not_confirmed";
    }
}

function isConversationDone(messages) {
  if (!messages || messages.length === 0) return false;

  const last = messages[messages.length - 1];
  if (last.messageType === "cancellation") return true;

  const confirmations = messages.filter((m) => m.messageType === "confirmation");
  return new Set(confirmations.map((m) => m.senderId)).size === 2;
}

function userJustSent(messages, userId) {
  if (!messages || messages.length === 0) return false;

  const last = messages[messages.length - 1];
  const senderId = typeof last.senderId === "string" ? last.senderId : last.senderId?._id;
  return senderId === userId;
}

function hasTwoConfirmations(messages) {
  if (!messages || messages.length < 2) return false;

  const lastTwo = messages.slice(-2);
  const bothConfirmations = lastTwo.every(m => m.messageType === "confirmation");

  if (!bothConfirmations) return false;

  const senderIds = new Set(
      lastTwo.map(m => (typeof m.senderId === "string" ? m.senderId : m.senderId?._id))
  );

  return senderIds.size === 2;
}

function isDateToday(currentMatch) {
  if (!currentMatch || !currentMatch.dates || currentMatch.dates.length === 0) {
    return false;
  }
  const date = getUTCDate(currentMatch.dates[0]); // this should hopefully return the date in UTC (non-localized)
  const today = new Date(); // this should be today localized
  console.log("Current date:", date);
    console.log("Today's date:", today);

  return (
    date.getUTCDate() === today.getDate() &&
    date.getUTCMonth() === today.getMonth() &&
    date.getUTCFullYear() === today.getFullYear()
  );
}

function hasSentContactInfo(messages, userId) {
  if (!messages || messages.length === 0) return false;

  const contactInfoMessages = messages.filter(
    (m) => m.messageType === "contact_info" && m.senderId._id === userId
  );

  return contactInfoMessages.length > 0;
}