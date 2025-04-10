// ChatHistory.jsx
import React, { useEffect, useState, useRef } from "react";
import "./ChatHistory.css";
import speakerIcon from "../assets/speaker.svg";

const ChatHistory = ({ activeChat }) => {
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  const fetchChatHistory = (sessionId) => {
    const url = `http://localhost:5000/api/database/file?session=${sessionId}&filepath=chat_history.json`;

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        if (!data || !data.content) {
          throw new Error("Missing 'content' field in response");
        }

        let parsed;
        try {
          parsed = JSON.parse(data.content);
        } catch (err) {
          throw new Error("Failed to parse inner JSON in 'content'");
        }

        if (!parsed.chat_history || !Array.isArray(parsed.chat_history)) {
          throw new Error("Parsed chat history is invalid or not an array");
        }

        setMessages(parsed.chat_history);
        setError(null);
      })
      .catch((err) => {
        console.error("ChatHistory fetch error:", err);
        setMessages([]);
        setError("⚠️ Failed to load chat history.");
      });
  };

  useEffect(() => {
    if (!activeChat) return;
    fetchChatHistory(activeChat);
  }, [activeChat]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [messages]);

  // Poll for file changes every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetch("http://localhost:5000/api/database/notifications")
        .then((res) => res.json())
        .then((notifications) => {
          if (!Array.isArray(notifications)) return;

          const updated = notifications.find((n) => {
            return (
              n.event_type === "modified" &&
              !n.is_directory &&
              n.src_path.includes(`chat_${activeChat}\\chat_history.json`)
            );
          });

          if (updated) {
            console.log(`[Watcher] Reloading chat ${activeChat}`);
            fetchChatHistory(activeChat);
          }
        })
        .catch((err) => {
          console.warn("Notification polling failed:", err);
        });
    }, 3000);

    return () => clearInterval(interval);
  }, [activeChat]);

  const handleSpeakerClick = (content) => {
    console.log("Play audio for:", content);
  };

  if (error) {
    return <div className="chat-history error-message">{error}</div>;
  }

  return (
    <div className="chat-history">
      {messages.map((msg, index) => {
        if (!msg || typeof msg !== "object") return null;

        if (msg.role === "assistant") {
          let prefix = "";
          let content = msg.content || "";
          const newlineIndex = content.indexOf("\n");
          if (newlineIndex !== -1 && newlineIndex < 20) {
            prefix = content.substring(0, newlineIndex);
            content = content.substring(newlineIndex + 1);
          }
          return (
            <div key={index} className="message-container assistant-align hover-group">
              {prefix && <div className="message-bar-left">{prefix}</div>}
              <div className="message assistant-message">{content}</div>
              <button
                className="speaker-button-below"
                onClick={() => handleSpeakerClick(content)}
              >
                <img src={speakerIcon} alt="Speaker" />
              </button>
            </div>
          );
        }

        return (
          <div key={index} className="message-container user-align">
            <div className="message user-message">{msg.content}</div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
};

export default ChatHistory;
