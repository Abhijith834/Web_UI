import React, { useState, useEffect } from "react";
import "./Header.css";
import deleteIcon from "../assets/delete.svg";
import Learning from "./Learning";
import MessageBar from "./MessageBar";

// 🔄 CHANGED: helper to route through ngrok or localhost
const fetchWithFallback = (endpoint, options = {}) => {
  const localUrl = `http://localhost:5000${endpoint}`;
  if (["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    return fetch(localUrl, options);
  }
  const ngrokUrl = `https://mint-jackal-publicly.ngrok-free.app${endpoint}`;
  const headers = { ...options.headers, "ngrok-skip-browser-warning": "true" };
  return fetch(ngrokUrl, { ...options, headers })
    .then((res) => {
      if (!res.ok) throw new Error(`Ngrok error: ${res.status}`);
      return res;
    })
    .catch(() => fetch(localUrl, options));
};

const Header = ({ setActiveChat, startedChats, activeChat, handleStart }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [chats, setChats] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [refreshAfterClose, setRefreshAfterClose] = useState(false);

  const toggleMenu = () => setIsMenuOpen((p) => !p);

  // 🔄 CHANGED: load list of chat folders via fallback helper
  const loadChats = () => {
    fetchWithFallback("/api/ai-pocket-tutor/database/folders")
      .then((r) => r.json())
      .then((data) => {
        if (!data.database_folders) return;
        const list = data.database_folders
          .filter((f) => f.startsWith("chat_"))
          .map((f) => ({ id: f.split("_")[1], name: `Chat ${f.split("_")[1]}` }))
          .sort((a, b) => +a.id - +b.id);
        setChats(list);
      })
      .catch(console.error);
  };

  // 🔄 CHANGED: sync active session via fallback helper
  const loadActiveSession = () => {
    fetchWithFallback("/api/database/session-state")
      .then((r) => r.json())
      .then((data) => {
        if (data.session_id && data.session_id !== activeChat) {
          if (showSearch) {
            setActiveChat(data.session_id);
          } else if (refreshAfterClose) {
            window.location.reload();
            setRefreshAfterClose(false);
          }
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadChats();
    loadActiveSession();
    const interval = setInterval(() => {
      loadChats();
      loadActiveSession();
    }, 3000);
    return () => clearInterval(interval);
  }, [showSearch, refreshAfterClose]);

  // 🔄 CHANGED: create new chat message via fallback helper
  const addNewChat = (type) => {
    const msg = type === "normal" ? "new chat (normal)" : "new chat (learning)";
    fetchWithFallback("/api/cli-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: msg,
        chat_session: activeChat,
        timestamp: new Date().toISOString(),
      }),
    }).catch(console.error);
    if (type === "learning") setShowSearch(true);
  };

  const deleteChat = (i) => setChats((p) => p.filter((_, idx) => idx !== i));
  const handleChatClick = (id) => setActiveChat(id);

  const closeSearch = () => {
    setShowSearch(false);
    setRefreshAfterClose(true);
  };

  const handleSearch = (term) => {
    console.log("Search term:", term);
    // integrate your learning-search API here
  };

  return (
    <>
      {/* Side menu */}
      <div className={`side-menu ${isMenuOpen ? "open" : ""}`}>
        <div className="add-chat-container">
          <button className="add-chat-button">+</button>
          <div className="chat-options">
            <button className="chat-option" onClick={() => addNewChat("normal")}>
              Normal
            </button>
            <button className="chat-option" onClick={() => addNewChat("learning")}>
              Learning
            </button>
          </div>
        </div>
        <ul>
          {chats.map((c, idx) => (
            <li
              key={c.id}
              className={`chat-item ${startedChats[c.id] ? "highlighted-chat" : ""}`}
              onClick={() => handleChatClick(c.id)}
            >
              <span>{c.name}</span>
              <img
                src={deleteIcon}
                alt="Delete"
                className="delete-icon"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChat(idx);
                }}
              />
            </li>
          ))}
        </ul>
      </div>

      {/* Header bar */}
      <header className="header flex items-center px-4 py-3">
        <button
          className="text-white focus:outline-none"
          onClick={toggleMenu}
          aria-expanded={isMenuOpen}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="ml-3 text-lg font-semibold">AI Pocket Tutor</h1>
      </header>

      {/* Learning popup, renders MessageBar inside */}
      <Learning show={showSearch} onClose={closeSearch} onSearch={handleSearch}>
        <div className="w-full fixed bottom-0">
          <MessageBar
            activeChat={activeChat}
            isStarted={!!startedChats[activeChat]}
            handleStart={handleStart}
          />
        </div>
      </Learning>
    </>
  );
};

export default Header;
