import "./MyMatchesSection.css";
import {useSelector} from "react-redux";
import {useNavigate} from "react-router-dom";
import {convertDateToDayString} from "../utils/getUTCDate.js";


export default function MyMatchesSection() {
    const matches = useSelector((state) => state.matches.matches || []);
    const navigate = useNavigate();
    console.log("MyMatchesSection matches:", matches);

    const activeMatches = matches.filter((m) => m.status === "active");
    const confirmedMatches = matches.filter((m) => m.status === "confirmed");

    const trustedContact = useSelector((state => state.profile.user.trustedContact));


    const renderActiveMatchCard = (match) => {
        const dateStr =
            match.dates && match.dates.length > 0
                ? convertDateToDayString(match.dates[0])
                : "No date set";
        return (
            <div
                key={match._id}
                className="activity-card"
                style={{cursor: "pointer"}}
                onClick={() => navigate(`/loveinaction/chat/${match._id}`)}
            >
                <div className="activity-grid">
                    <div className="activity-grid-item">
                        <p>
                            ⭐ <strong>{match.activityType}</strong>
                        </p>
                    </div>
                    <div className="activity-grid-item">
                        <p>📍 {match.location}</p>
                    </div>
                    <div className="activity-grid-item">
                        <p>📅 {dateStr}</p>
                    </div>
                </div>
            </div>
        );
    };

    const renderConfirmedMatchCard = (match) => {
        const dateStr =
            match.dates && match.dates.length > 0
                ? convertDateToDayString(match.dates[0])
                : "No date set";
        const trustedContactNotified = match.myTrustedContactNotified || false;
        return (
            <div
                key={match._id}
                className="activity-card"
                style={{cursor: "pointer"}}
                onClick={() => navigate(`/loveinaction/chat/${match._id}`)}
            >
                <div className="activity-grid">
                    <div className="activity-grid-item">
                        <p>
                            ⭐ <strong>{match.activityType}</strong>
                        </p>
                    </div>
                    <div className="activity-grid-item">
                        <p>📍 {match.location}</p>
                    </div>
                    <div className="activity-grid-item">
                        <p>📅 {dateStr}</p>
                    </div>
                    {trustedContactNotified ? (
                    <div className="activity-grid-item">

                            <p className="trusted-contact-status">
                                <span role="img" aria-label="shield" className="trusted-contact-shield">🛡️</span>
                                    <span
                                        className={trustedContactNotified ?
                                            "trusted-contact-status-green" :
                                            "trusted-contact-status-red"}
                                    >
                                        {trustedContactNotified
                                            ? "Contact notified"
                                            : "Contact not notified"}
                                    </span>
                            </p>
                        
                    </div>
                    ) : (
                        <p className="trusted-contact-status">
                            <span role="img" aria-label="shield" className="trusted-contact-shield">🛡️</span>
                            <span className="trusted-contact-status-red">No trusted contact set. <a
                                href={"/loveinaction/profile#trusted-contact"}>Click here to add one.</a></span>

                        </p>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="my-matches-section">
            <h2 className="matches-title">Your Matches</h2>
            <div className="activity-columns-wrapper">
                <div className="activity-column">
                    <h3 className="activity-section-subtitle">Active</h3>
                    {activeMatches.length === 0 ? (
                        <p>No active matches</p>
                    ) : (
                        activeMatches.map(renderActiveMatchCard)
                    )}
                </div>
                <div className="activity-column">
                    <h3 className="activity-section-subtitle">Confirmed</h3>
                    {confirmedMatches.length === 0 ? (
                        <p>No confirmed matches</p>
                    ) : (
                        confirmedMatches.map(renderConfirmedMatchCard)
                    )}
                </div>
            </div>
        </div>
    );
}
