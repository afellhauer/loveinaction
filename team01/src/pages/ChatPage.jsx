import React from "react";
import Base from "./Base";
import ChatDashboard from "../components/chat/ChatDashboard";
import {Pages} from "../data/Pages.jsx";
import { useParams } from "react-router-dom";

export default function ChatPage() {
  const { matchId } = useParams();

  return (
    <Base pageTitle={Pages.CHAT}>
        <ChatDashboard selectedMatchId={matchId} />
    </Base>
  );
}