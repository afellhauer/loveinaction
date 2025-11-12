import React from "react";
import Base from "./Base";
import MatchFilterForm from "../components/matching/MatchFilterForm.jsx";
import { Pages } from "../data/Pages.jsx";

export default function FilterPage() {

  return (
    <Base pageTitle={Pages.FILTER}>
        <MatchFilterForm />
    </Base>
  );
}