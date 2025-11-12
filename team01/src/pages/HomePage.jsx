import { useSelector, useDispatch } from "react-redux";
import Base from "./Base";
import UpcomingCard from "../components/matching/UpcomingCard.jsx";
import MatchActions from "../components/MatchActions";
import { Pages } from "../data/Pages.jsx";
import MyActivitiesPage from "./MyActivitiesPage.jsx";
import Tutorial from "../components/tutorial/Tutorial.jsx";
import MyMatchesSection from "./MyMatchesSection.jsx";

export default function HomePage() {
  const dispatch = useDispatch();

  const upcomingDismissed = useSelector((s) => s.userFlags.upcomingDismissed);
  return (
    <Base pageTitle={Pages.HOME}>
          <div className="landing-container">
            {!upcomingDismissed && (
              <UpcomingCard
                title="UPCOMING DATES"
                message="You have an upcoming date!"
                onClose={() =>
                  dispatch({
                    type: "userFlags/setUpcomingDismissed",
                    payload: true,
                  })
                }
              />
            )}
            <MatchActions/>
            <MyMatchesSection />
            <MyActivitiesPage />
          </div>
        <Tutorial/>
    </Base>
  );
}