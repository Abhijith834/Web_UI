import React, { useEffect, useState, useRef } from "react";
import "./ChatHistory.css";
import speakerIcon from "../assets/speaker.svg";

// Helper function to fetch with fallback
const fetchWithFallback = (endpoint, options = {}) => {
  const localUrl = `http://localhost:5000${endpoint}`;
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return fetch(localUrl, options);
  }

  const ngrokUrl = `https://mint-jackal-publicly.ngrok-free.app${endpoint}`;
  const ngrokHeaders = {
    ...options.headers,
    "ngrok-skip-browser-warning": "true"
  };

  return fetch(ngrokUrl, { ...options, headers: ngrokHeaders })
    .then((response) => {
      if (!response.ok) throw new Error(`Ngrok error: ${response.status}`);
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
  // playingTTSId tracks which assistant block’s TTS is active
  const [playingTTSId, setPlayingTTSId] = useState(null);
  // loadingTTSId tracks which TTS audio is pending from the backend
  const [loadingTTSId, setLoadingTTSId] = useState(null);
  const bottomRef = useRef(null);

  // Refs to track current audio object and polling interval
  const currentAudioRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  const fetchChatHistory = (sessionId) => {
    const endpoint = `/api/database/file?session=${sessionId}&filepath=chat_history.json`;
    fetchWithFallback(endpoint)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return response.json();
      })
      .then((data) => {
        if (!data || !data.content) throw new Error("Missing 'content' field in response");

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

  // Poll for notifications to update chat history if modified
  useEffect(() => {
    const interval = setInterval(() => {
      const endpoint = "/api/database/notifications";
      fetchWithFallback(endpoint)
        .then((res) => res.json())
        .then((notifications) => {
          if (!Array.isArray(notifications) || notifications.length === 0) return;

          const updated = notifications.find((n) => (
            n.event_type === "modified" &&
            !n.is_directory &&
            n.src_path.includes(`chat_${activeChat}\\chat_history.json`)
          ));

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

  // Poll for the TTS audio file until it is available, then play it.
  const startPollingAudio = (identifier) => {
    const encodedIdentifier = encodeURIComponent(identifier);
    const url = `http://localhost:5000/api/tts/chat_${activeChat}/${encodedIdentifier}.wav`;
    console.log("Polling for TTS file at", url);
    pollingIntervalRef.current = setInterval(() => {
      // Use HEAD request to check if file exists
      fetch(url, { method: "HEAD" })
        .then((response) => {
          if (response.ok) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
            const audio = new Audio(url);
            // When playback starts, clear the loading state
            setLoadingTTSId(null);
            // Store the current audio information
            currentAudioRef.current = { identifier, audio };
            // When playback ends, clear the playing state.
            audio.addEventListener("ended", () => {
              currentAudioRef.current = null;
              setPlayingTTSId(null);
              console.log(`[TTS] Playback ended for ${identifier}`);
            });
            audio.play();
            console.log("[TTS] Audio playing for", identifier);
          }
        })
        .catch((err) => {
          console.log("[TTS] Audio file not available yet...", err);
        });
    }, 1000);
  };

  // Handle click on the speaker button for a given assistant-only index.
  const handleSpeakerClick = (assistantIndex) => {
    if (!activeChat) return;
    const identifier = `chat_${activeChat}#${assistantIndex}`;

    // If this same identifier is already playing, stop playback.
    if (playingTTSId === identifier) {
      if (currentAudioRef.current) {
        currentAudioRef.current.audio.pause();
        currentAudioRef.current.audio.currentTime = 0;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setPlayingTTSId(null);
      setLoadingTTSId(null);
      console.log(`[TTS] Stopped audio for ${identifier}`);
      return;
    }

    // If some other TTS is playing, stop it first.
    if (playingTTSId && currentAudioRef.current) {
      currentAudioRef.current.audio.pause();
      currentAudioRef.current.audio.currentTime = 0;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setPlayingTTSId(null);
      setLoadingTTSId(null);
      currentAudioRef.current = null;
    }

    // Set the playing identifier and mark it as loading.
    setPlayingTTSId(identifier);
    setLoadingTTSId(identifier);

    // Send the TTS request with the compact identifier.
    const payload = {
      message: `tts (${identifier})`,
      chat_session: activeChat,
      timestamp: new Date().toISOString()
    };

    fetchWithFallback("/api/cli-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("[TTS] Sent:", data);
        // Start polling for the TTS audio file.
        startPollingAudio(identifier);
      })
      .catch((err) => {
        console.error("[TTS] Error:", err);
        setPlayingTTSId(null);
        setLoadingTTSId(null);
      });
  };

  if (error) {
    return <div className="chat-history error-message">{error}</div>;
  }

  let assistantCounter = 0;

  return (
    <div className="chat-history">
      {messages.map((msg, index) => {
        if (!msg || typeof msg !== "object") return null;

        if (msg.role === "assistant") {
          const currentAssistantIndex = assistantCounter++;
          let prefix = "";
          let content = msg.content || "";
          const newlineIndex = content.indexOf("\n");
          if (newlineIndex !== -1 && newlineIndex < 20) {
            prefix = content.substring(0, newlineIndex);
            content = content.substring(newlineIndex + 1);
          }

          const currentIdentifier = `chat_${activeChat}#${currentAssistantIndex}`;
          return (
            <div key={index} className="message-container assistant-align hover-group">
              {prefix && <div className="message-bar-left">{prefix}</div>}
              <div className="message assistant-message">{content}</div>
              <button
                className={`speaker-button-below ${
                  playingTTSId === currentIdentifier ? "active" : ""
                }`}
                onClick={() => handleSpeakerClick(currentAssistantIndex)}
              >
                {playingTTSId === currentIdentifier && loadingTTSId === currentIdentifier ? (
                  <img src="/loading-loading-forever.gif" alt="Loading" />
                ) : (
                  <img src={speakerIcon} alt="Speaker" />
                )}
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
