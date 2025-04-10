import React, { useState, useEffect } from "react";
import "./Header.css";
import deleteIcon from "../assets/delete.svg";

// Helper function to fetch with fallback
const fetchWithFallback = (endpoint, options = {}) => {
  const localUrl = `http://localhost:5000${endpoint}`;
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    return fetch(localUrl, options);
  }
  const ngrokUrl = `https://mint-jackal-publicly.ngrok-free.app${endpoint}`;
  const ngrokHeaders = {
    ...options.headers,
    "ngrok-skip-browser-warning": "true"
  };
  return fetch(ngrokUrl, { ...options, headers: ngrokHeaders })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Ngrok error: ${response.status}`);
      }
      return response;
    })
    .catch((err) => {
      console.warn("Ngrok fetch failed, falling back to localhost:5000", err);
      return fetch(localUrl, options);
    });
};

const Header = ({ setActiveChat, startedChats, activeChat }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [chats, setChats] = useState([]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    fetchWithFallback("/api/ai-pocket-tutor/database/folders")
      .then((res) => res.json())
      .then((data) => {
        if (!data.database_folders) return;

        const chatFolders = data.database_folders
          .filter((folder) => folder.startsWith("chat_"))
          .map((folder) => ({
            id: folder.split("_")[1],
            name: `Chat ${folder.split("_")[1]}`
          }))
          .sort((a, b) => parseInt(a.id) - parseInt(b.id));

        setChats(chatFolders);

        // Auto-select first chat if any exist.
        if (chatFolders.length > 0) {
          setActiveChat(chatFolders[0].id);
        }
      })
      .catch((err) => console.error("Failed to fetch chat folders:", err));
  }, [setActiveChat]);

  const addNewChat = (type) => {
    const newId = chats.length + 1;
    const newChat = {
      id: newId.toString(),
      name: type === "normal" ? `Normal Chat ${newId}` : `Learning Chat ${newId}`
    };
    setChats([...chats, newChat]);

    // Send message to backend with a timestamp.
    const messageText = type === "normal" ? "new chat (normal)" : "new chat (learning)";
    const payload = {
      message: messageText,
      chat_session: activeChat,
      timestamp: new Date().toISOString()
    };
    fetchWithFallback("/api/cli-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Chat creation message sent:", data);
      })
      .catch((error) => {
        console.error("Error sending chat creation message:", error);
      });
  };

  const deleteChat = (index) => {
    setChats(chats.filter((_, i) => i !== index));
  };

  const handleChatClick = (chatId) => {
    setActiveChat(chatId);
  };

  return (
    <>
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
          {chats.map((chat, index) => (
            <li
              key={index}
              className={`chat-item ${startedChats[chat.id] ? "highlighted-chat" : ""}`}
              onClick={() => setActiveChat(chat.id)}
            >
              <span>{chat.name}</span>
              <img
                src={deleteIcon}
                alt="Delete"
                className="delete-icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setChats(chats.filter((_, i) => i !== index));
                }}
              />
            </li>
          ))}
        </ul>
      </div>

      <header className="header flex items-center px-4 py-3">
        <button className="text-white focus:outline-none" onClick={toggleMenu}>
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="ml-3 text-lg font-semibold">AI Pocket Tutor</h1>
      </header>
    </>
  );
};

export default Header;
