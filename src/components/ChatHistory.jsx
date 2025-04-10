import React, { useEffect, useState, useRef } from "react";
import "./ChatHistory.css";
import speakerIcon from "../assets/speaker.svg";

// Helper function to fetch with fallback
const fetchWithFallback = (endpoint, options = {}) => {
  const localUrl = `http://localhost:5000${endpoint}`;
  // If the site is being accessed on the server PC, use localhost directly.
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return fetch(localUrl, options);
  }
  
  // Try using ngrok URL first
  const ngrokUrl = `https://mint-jackal-publicly.ngrok-free.app${endpoint}`;
  // Merge ngrok header with any existing headers
  const ngrokHeaders = {
    ...options.headers,
    "ngrok-skip-browser-warning": "true"
  };
  
  // Try fetching from ngrok, then fall back to localUrl if it fails
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

const ChatHistory = ({ activeChat }) => {
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  const fetchChatHistory = (sessionId) => {
    const endpoint = `/api/database/file?session=${sessionId}&filepath=chat_history.json`;
    fetchWithFallback(endpoint)
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

  // Poll for file changes every 3 seconds using the fallback fetch function
  useEffect(() => {
    const interval = setInterval(() => {
      const endpoint = "/api/database/notifications";
      fetchWithFallback(endpoint)
        .then((res) => res.json())
        .then((notifications) => {
          // If no new notifications, do nothing.
          if (!Array.isArray(notifications) || notifications.length === 0) return;

          // Look for an update for chat_history.json for the active chat.
          const updated = notifications.find((n) => {
            return (
              n.event_type === "modified" &&
              !n.is_directory &&
              n.src_path.includes(`chat_${activeChat}\\chat_history.json`)
            );
          });

          if (updated) {
            console.log(`[Watcher] Detected update for chat ${activeChat}`);
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
