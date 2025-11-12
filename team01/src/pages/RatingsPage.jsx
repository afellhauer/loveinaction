import React from "react";
import Base from "./Base";
import RatingDashboard from "../components/rating/RatingDashboard";
import {Pages} from "../data/Pages.jsx";

export default function ChatPage() {
    return (
        <Base pageTitle={Pages.RATINGS}>
            <RatingDashboard />
        </Base>
    );
}