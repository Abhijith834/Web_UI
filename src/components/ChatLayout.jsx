import React, { useState, useEffect } from "react";
import Header from "./Header";
import ChatHistory from "./ChatHistory";
import MessageBar from "./MessageBar";

const ChatLayout = () => {
  const [activeChat, setActiveChat] = useState(null);
  const [startedChats, setStartedChats] = useState({});
  const [loadingSession, setLoadingSession] = useState(true); // 👈 loading state

  const handleStart = (chatId) => {
    setStartedChats({ [chatId]: true }); // only one chat active at a time
  };

  useEffect(() => {
    // Fetch session-state from API on initial load
    fetch("http://localhost:5000/api/database/session-state")
      .then((res) => res.json())
      .then((data) => {
        if (data.session_id) {
          setActiveChat(data.session_id);
          setStartedChats({ [data.session_id]: true });
        }
      })
      .catch((err) => {
        console.error("Failed to fetch session state:", err);
      })
      .finally(() => setLoadingSession(false)); // ✅ ensure layout renders after load
  }, []);

  if (loadingSession) {
    return (
      <div className="flex h-screen items-center justify-center text-white text-xl">
        Loading chat session...
      </div>
    );
  }

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
