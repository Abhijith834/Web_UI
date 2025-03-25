import React, { useState } from "react";
import "./Header.css";
import deleteIcon from "../assets/delete.svg";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [chats, setChats] = useState(["Chat 1", "Chat 2", "Chat 3"]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const addNewChat = (type) => {
    const newChat = type === "normal" ? `Normal Chat ${chats.length + 1}` : `Learning Chat ${chats.length + 1}`;
    setChats([...chats, newChat]);
  };

  const deleteChat = (index) => {
    setChats(chats.filter((_, i) => i !== index));
  };

  return (
    <>
      {/* Sidebar Menu */}
      <div className={`side-menu ${isMenuOpen ? "open" : ""}`}>
        {/* Plus Button with Hover Effect */}
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

        {/* Chat List */}
        <ul>
          {chats.map((chat, index) => (
            <li key={index} className="chat-item">
              <span>{chat}</span>
              <img src={deleteIcon} alt="Delete" className="delete-icon" onClick={() => deleteChat(index)} />
            </li>
          ))}
        </ul>
      </div>

      {/* Header */}
      <header className="header flex items-center px-4 py-3">
        <button className="text-white focus:outline-none" onClick={toggleMenu}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="ml-3 text-lg font-semibold">AI Pocket Tutor</h1>
      </header>
    </>
  );
};

export default Header;
