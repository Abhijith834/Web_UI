// ChatHistory.jsx
import React, { useEffect, useState, useRef } from "react";
import "./ChatHistory.css";
import speakerIcon from "../assets/speaker.svg";

const ChatHistory = () => {
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    fetch("/chat_history.json")
      .then((response) => response.json())
      .then((data) => setMessages(data.chat_history))
      .catch((error) => console.error("Error loading chat history:", error));
  }, []);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [messages]);

  const handleSpeakerClick = (content) => {
    console.log("Play audio for:", content);
    // Integrate your TTS or audio functionality here.
  };

  return (
    <div className="chat-history">
      {messages.map((msg, index) => {
        if (msg.role === "assistant") {
          let prefix = "";
          let content = msg.content;
          const newlineIndex = msg.content.indexOf("\n");
          // If a newline is found within the first 20 characters, split the content.
          if (newlineIndex !== -1 && newlineIndex < 20) {
            prefix = msg.content.substring(0, newlineIndex);
            content = msg.content.substring(newlineIndex + 1);
          }
          return (
            <div key={index} className="message-container assistant-align">
              {prefix && (
                <div className="message-bar-left">
                  {prefix}
                </div>
              )}
              <div className="message assistant-message">
                {content}
                <button
                  className="speaker-button"
                  onClick={() => handleSpeakerClick(content)}
                >
                  <img src={speakerIcon} alt="Speaker" />
                </button>
              </div>
            </div>
          );
        } else {
          return (
            <div key={index} className="message-container user-align">
              <div className="message user-message">
                {msg.content}
              </div>
            </div>
          );
        }
      })}
      <div ref={bottomRef} />
    </div>
  );
};

export default ChatHistory;
