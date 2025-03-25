// MessageBubble.jsx
import React from "react";
import "./MessageBubble.css";
import speakerIcon from "../assets/speaker.svg";

const MessageBubble = ({ message, isUser }) => {
  const handleSpeakerClick = () => {
    console.log("Play audio for:", message);
    // You can integrate a TTS engine or other audio logic here.
  };

  return (
    <div className={`message-bubble-container ${isUser ? "user" : "assistant"}`}>
      <div className={`message-bubble ${isUser ? "user" : "assistant"}`}>
        {message}
        {!isUser && (
          <button className="speaker-button" onClick={handleSpeakerClick}>
            <img src={speakerIcon} alt="Speaker" />
          </button>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
