import React, { useState, useRef } from "react";
import "./MessageBar.css";
import documentIcon from "../assets/document.svg";
import checkboxIcon from "../assets/checkbox.svg";
import sendIcon from "../assets/send.svg";
import micIcon from "../assets/mic.svg";
import { useNavigate } from "react-router-dom";

// Helper function to fetch with fallback.
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

const MessageBar = ({ activeChat, isStarted, handleStart }) => {
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Send a plain text chat message along with a timestamp.
  const handleSend = () => {
    if (!isStarted) return;
    console.log(`Send message in chat ${activeChat}:`, message);
    const payload = {
      message: message,
      chat_session: activeChat,
      timestamp: new Date().toISOString()
    };

    fetchWithFallback("/api/cli-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then((response) => {
        if (!response.ok) {
          console.error("[handleSend] HTTP error! Status:", response.status);
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Message sent via cli-message:", data);
      })
      .catch((error) => {
        console.error("Error sending message via cli-message:", error);
      });
    setMessage("");
  };

  const handleMic = () => {
    if (!isStarted) return;
    console.log(`Mic clicked in chat ${activeChat}`);
  };

  const handleGoToMCQ = () => {
    if (!isStarted) return;
    navigate("/mcq");
  };

  const handleFileButtonClick = () => {
    if (!isStarted) return;
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files.length) {
      console.log("Selected files:", files);
    }
  };

  // onStart sends a CLI message (e.g., to start a chat session) along with a timestamp.
  const onStart = () => {
    handleStart(activeChat);
    const payload = {
      message: `chat (${activeChat})`,
      chat_session: activeChat,
      timestamp: new Date().toISOString()
    };

    console.log("[MessageBar.onStart] Sending payload:", payload);

    fetchWithFallback("/api/cli-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Chat started and cli-message sent:", data);
      })
      .catch((error) => {
        console.error("Error sending cli-message:", error);
      });
  };

  return (
    <footer className="fixed bottom-4 left-0 w-full flex justify-center">
      <div className="message-bar-container">
        <div className="icon-button-container left-button">
          <button
            className={`icon-button ${!isStarted ? "opacity-50 pointer-events-none" : ""}`}
            onClick={handleFileButtonClick}
          >
            <img src={documentIcon} alt="Document" className="w-6 h-6" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
            multiple
            accept=".txt,.rtf,.doc,.docx,.odt,.xls,.xlsx,.ppt,.pptx,.html,.htm,.xml,.md,.pdf"
          />
        </div>

        <div className="message-bar">
          {!isStarted && (
            <button
              onClick={onStart}
              style={{ backgroundColor: "rgba(13, 134, 190, 0.3)" }}
              className="text-black px-3 py-1 rounded mr-2"
            >
              Start
            </button>
          )}
          <input
            type="text"
            className={`message-input ${!isStarted ? "opacity-50 pointer-events-none" : ""}`}
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <div className="inner-buttons flex items-center gap-2 ml-2">
            <button
              onClick={handleSend}
              className={`icon-button ${!isStarted ? "opacity-50 pointer-events-none" : ""}`}
            >
              <img src={sendIcon} alt="Send" className="w-6 h-6" />
            </button>
            <button
              onClick={handleMic}
              className={`icon-button ${!isStarted ? "opacity-50 pointer-events-none" : ""}`}
            >
              <img src={micIcon} alt="Mic" className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="icon-button-container right-button">
          <button
            onClick={handleGoToMCQ}
            className={`icon-button ${!isStarted ? "opacity-50 pointer-events-none" : ""}`}
          >
            <img src={checkboxIcon} alt="MCQ" className="w-6 h-6" />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default MessageBar;
