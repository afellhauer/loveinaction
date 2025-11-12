
import './RatingDashboard.css';
import React, {useEffect, useState} from "react";
import {useDispatch, useSelector} from "react-redux";
import {selectMatches, selectMatchesError, selectMatchesLoading} from "../../store/slices/matchSlice.js";
import {fetchProfilesByUserIds} from "../../store/slices/matchedProfilesSlice.js";
import RatingModal from "./RatingModal.jsx";
import {selectUser} from "../../store/slices/profileSlice.js";
import { loadMatches } from "../../store/slices/matchSlice.js";

export default function RatingsPage() {
    const dispatch = useDispatch();
    const matches = useSelector(selectMatches);
    const matchesLoading = useSelector(selectMatchesLoading);
    const matchesError = useSelector(selectMatchesError);
    const userIdProfileMap = useSelector((state) => state.matchedProfiles.profilesByUserId);
    const [selectedPerson, setSelectedPerson] = useState(null);

    const matchUserIds = (matches || []).map(m => m.otherUser._id);
    useEffect(() => {
        if (matchUserIds.length > 0) {
            dispatch(fetchProfilesByUserIds(matchUserIds));
        }
    }, [dispatch, matchUserIds.join(",")]);

    const refreshMatches = () => {
        dispatch(loadMatches());
    };

    const chatProfiles = (matches || []).map(match => {
        const profile = userIdProfileMap?.[match.otherUser._id];
        return  {
            id: match.otherUser._id,
            matchStatus: match.status || "active",
            notYetRated: match.myRating === null,
            name: profile
                ? `${profile.user.firstName} ${profile.user.lastName}`
                : `${match.otherUser.firstName} ${match.otherUser.lastName}`,
            age: profile?.profile.age || match.otherUser.age || 25,
            image: profile?.profile.profilePicUrl || "/assets/default-profile.png",
            activity: match.activityType || "hang out",
            safetyScore: profile?.profile.safetyScore || 5,
            time: match.dates?.[0]?.split('T')[0].split('-').slice(1).concat(match.dates[0]?.split('-')[0].slice(-2)).join('/') || "No date set",
            location: match.location || "Vancouver",
            timeOfDay: match.timeOfDay || "afternoon",
            matchId: match._id,
            bio: profile?.profile.bio || "No bio available.",
            socialMedia: {
                instagram: profile?.profile.socialMedia?.instagram || "",
                snapchat: profile?.profile.socialMedia?.snapchat || "",
                tiktok: profile?.profile.socialMedia?.tiktok || ""
            },
        };
    });


    const handleRateClick = (person) => {
        setSelectedPerson(person);
    };

    return( <>
            <div className="ratings-container">
                {matchesLoading && <p className="empty-text">Loading matches...</p>}
                {matchesError && <p className="empty-text">Error loading matches: {matchesError}</p>}
                {!matchesLoading && !matchesError && (
                    chatProfiles.length > 0 ? (
                        chatProfiles.some(person => person.matchStatus === "date_passed") ? (
                            <div className="ratings-grid">
                                {chatProfiles.map((person) => (
                                    person.matchStatus === "date_passed" && (
                                        <div key={person.id} className="rating-card">
                                            <div className="rating-content">
                                                <img
                                                    src={person.image}
                                                    alt={person.name}
                                                    className="profile-image"
                                                />
                                                <h3>{person.name}</h3>
                                                <p>Activity: {person.activity}</p>
                                                <p>Date: {person.time}</p>
                                                {person.notYetRated ? (
                                                    <button className="rate-button" onClick={() => handleRateClick(person)}>
                                                        Rate Match
                                                    </button>
                                                ) : (
                                                    <button className="rate-button" disabled>
                                                        You have already rated this match.
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                ))}
                            </div>
                        ) : (
                            <p className="empty-text">No confirmed dates yet!</p>
                        )
                    ) : (
                        <p className="empty-text">No matches yet. Go swipe to find matches!</p>
                    )
                )}
            </div>
            {selectedPerson && (
                <RatingModal
                    onClose={() => setSelectedPerson(null)}
                    name={selectedPerson.name}
                    rateeId={selectedPerson.id}
                    onRatingSubmitted={refreshMatches}
                />
            )}
    </>
    );
}
