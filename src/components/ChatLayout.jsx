// ChatLayout.jsx
import React from "react";
import Header from "./Header";
import ChatHistory from "./ChatHistory";
import MessageBar from "./MessageBar";

const ChatLayout = () => {
  return (
    <div className="flex flex-col h-screen relative">
      <Header />
      <div className="flex-1 overflow-y-auto pt-16 pb-20">
        <ChatHistory />
      </div>
      <MessageBar />
    </div>
  );
};

export default ChatLayout;
