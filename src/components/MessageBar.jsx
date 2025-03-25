// MessageBar.jsx
import React, { useState } from "react";
import "./MessageBar.css";
import documentIcon from "../assets/document.svg";
import checkboxIcon from "../assets/checkbox.svg";
import sendIcon from "../assets/send.svg";
import micIcon from "../assets/mic.svg";

const MessageBar = () => {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    console.log("Send message:", message);
    setMessage("");
  };

  const handleMic = () => {
    console.log("Mic clicked");
  };

  return (
    <footer className="fixed bottom-4 left-0 w-full flex justify-center">
      <div className="message-bar-container">
        <div className="icon-button-container left-button">
          <button className="icon-button">
            <img src={documentIcon} alt="Document" className="w-6 h-6" />
          </button>
        </div>
        <div className="message-bar">
          <input
            type="text"
            className="message-input"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <div className="inner-buttons flex items-center gap-2 ml-2">
            <button onClick={handleSend} className="icon-button">
              <img src={sendIcon} alt="Send" className="w-6 h-6" />
            </button>
            <button onClick={handleMic} className="icon-button">
              <img src={micIcon} alt="Mic" className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className="icon-button-container right-button">
          <button onClick={handleSend} className="icon-button">
            <img src={checkboxIcon} alt="Send" className="w-6 h-6" />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default MessageBar;
