import React from "react";
import Base from "./Base";
import {Pages} from "../data/Pages.jsx";
import HowTo from "../components/tutorial/HowTo.jsx";

export default function TutorialPage() {
    return (
        <Base pageTitle={Pages.HELP}>
            <HowTo/>
        </Base>
    );
}