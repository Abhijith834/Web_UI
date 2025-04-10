import React, { useState } from "react";
import Header from "./Header";
import ChatHistory from "./ChatHistory";
import MessageBar from "./MessageBar";

const ChatLayout = () => {
  const [activeChat, setActiveChat] = useState("1");
  const [startedChats, setStartedChats] = useState({});

  const handleStart = (chatId) => {
    setStartedChats({ [chatId]: true }); // only one chat active at a time
  };

  return (
    <div className="flex flex-col h-screen relative">
      <Header
        setActiveChat={setActiveChat}
        startedChats={startedChats}
        activeChat={activeChat}
      />
      <div className="flex-1 overflow-y-auto pt-16 pb-20">
        <ChatHistory activeChat={activeChat} />
      </div>
      <MessageBar
        activeChat={activeChat}
        isStarted={!!startedChats[activeChat]}
        handleStart={handleStart}
      />
    </div>
  );
};

export default ChatLayout;
