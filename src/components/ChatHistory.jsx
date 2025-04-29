import React, { useEffect, useState, useRef } from "react";
import "./ChatHistory.css";
import speakerIcon from "../assets/speaker.svg";

// Helper to try fetch via ngrok or localhost
const fetchWithFallback = (endpoint, options = {}) => {
  const local = `http://localhost:5000${endpoint}`;
  if (["localhost","127.0.0.1"].includes(window.location.hostname)) {
    return fetch(local, options);
  }
  const ngrok = `https://mint-jackal-publicly.ngrok-free.app${endpoint}`;
  return fetch(ngrok, {
    ...options,
    headers: { ...options.headers, "ngrok-skip-browser-warning":"true" }
  }).catch(() => fetch(local, options));
};

const ChatHistory = ({ activeChat }) => {
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [playingTTSId, setPlayingTTSId] = useState(null);
  const [loadingTTSId, setLoadingTTSId] = useState(null);
  const bottomRef = useRef(null);

  // refs to manage audio & polling
  const currentAudioRef = useRef(null);
  const pollingRef = useRef(null);

  // Fetch chat_history.json
  const fetchChatHistory = (sessionId) => {
    fetchWithFallback(`/api/database/file?session=${sessionId}&filepath=chat_history.json`)
      .then(res => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then(data => {
        const parsed = JSON.parse(data.content);
        setMessages(parsed.chat_history || []);
        setError(null);
      })
      .catch(err => {
        console.error(err);
        setError("   ");
        setMessages([]);
      });
  };

  useEffect(() => {
    if (activeChat) fetchChatHistory(activeChat);
  }, [activeChat]);

  // scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages]);

  // watch for file-change notifications
  useEffect(() => {
    const id = setInterval(() => {
      fetchWithFallback("/api/database/notifications")
        .then(res => res.json())
        .then(notes => {
          if (!Array.isArray(notes)) return;
          if (notes.some(n =>
            n.event_type==="modified" &&
            !n.is_directory &&
            n.src_path.includes(`chat_${activeChat}\\chat_history.json`)
          )) {
            fetchChatHistory(activeChat);
          }
        });
    }, 3000);
    return () => clearInterval(id);
  }, [activeChat]);

  // Starts polling until the .wav appears, then plays
  const startPollingAudio = (identifier) => {
    const encoded = encodeURIComponent(identifier);
    // 🔄 CHANGED: dynamic base URL for TTS
    const base = ["localhost","127.0.0.1"].includes(window.location.hostname)
      ? "http://localhost:5000"
      : "https://mint-jackal-publicly.ngrok-free.app";
    const url = `${base}/api/tts/chat_${activeChat}/${encoded}.wav`;

    pollingRef.current = setInterval(() => {
      // 🔄 CHANGED: use fallback for HEAD check
      fetchWithFallback(`/api/tts/chat_${activeChat}/${encoded}.wav`, { method: "HEAD", mode: "cors" })
        .then(res => {
          if (res.ok) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            setLoadingTTSId(null);

            const audio = new Audio(url);  // 🔄 CHANGED: URL comes from dynamic base
            currentAudioRef.current = { identifier, audio };

            audio.addEventListener("ended", () => {
              setPlayingTTSId(null);
              currentAudioRef.current = null;
            });

            audio.play();
          }
        })
        .catch(() => {/* keep polling */});
    }, 1000);
  };

  // Main click handler
  const handleSpeakerClick = (assistantIndex) => {
    if (!activeChat) return;
    const identifier = `chat_${activeChat}#${assistantIndex}`;
    const encoded = encodeURIComponent(identifier);
    // 🔄 CHANGED: dynamic base URL for TTS
    const base = ["localhost","127.0.0.1"].includes(window.location.hostname)
      ? "http://localhost:5000"
      : "https://mint-jackal-publicly.ngrok-free.app";
    const url = `${base}/api/tts/chat_${activeChat}/${encoded}.wav`;

    // 1) If already playing this block, stop it
    if (playingTTSId === identifier) {
      currentAudioRef.current?.audio.pause();
      currentAudioRef.current.audio.currentTime = 0;
      clearInterval(pollingRef.current);
      setPlayingTTSId(null);
      setLoadingTTSId(null);
      return;
    }

    // 2) If another TTS is playing, stop that first
    if (playingTTSId) {
      currentAudioRef.current?.audio.pause();
      currentAudioRef.current.audio.currentTime = 0;
      clearInterval(pollingRef.current);
      setPlayingTTSId(null);
      setLoadingTTSId(null);
      currentAudioRef.current = null;
    }

    // 3) HEAD-check to see if file already exists
    // 🔄 CHANGED: use fallback for HEAD check
    fetchWithFallback(`/api/tts/chat_${activeChat}/${encoded}.wav`, { method: "HEAD" })
      .then(res => {
        if (res.ok) {
          // File exists → play immediately
          setPlayingTTSId(identifier);
          setLoadingTTSId(null);

          const audio = new Audio(url);  // 🔄 CHANGED: dynamic URL
          currentAudioRef.current = { identifier, audio };
          audio.addEventListener("ended", () => setPlayingTTSId(null));
          audio.play();
        } else {
          // Not there yet → request TTS then poll
          setPlayingTTSId(identifier);
          setLoadingTTSId(identifier);

          fetchWithFallback("/api/cli-message", {  // 🔄 CHANGED
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: `tts (${identifier})`,
              chat_session: activeChat,
              timestamp: new Date().toISOString()
            })
          })
            .then(() => startPollingAudio(identifier))
            .catch(err => {
              console.error(err);
              setPlayingTTSId(null);
              setLoadingTTSId(null);
            });
        }
      })
      .catch(() => {
        // Network error on HEAD → treat as “not there yet”
        setPlayingTTSId(identifier);
        setLoadingTTSId(identifier);
        fetchWithFallback("/api/cli-message", {  // 🔄 CHANGED
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `tts (${identifier})`,
            chat_session: activeChat,
            timestamp: new Date().toISOString()
          })
        })
          .then(() => startPollingAudio(identifier))
          .catch(err => {
            console.error(err);
            setPlayingTTSId(null);
            setLoadingTTSId(null);
          });
      });
  };

  if (error) return <div className="chat-history error-message">{error}</div>;

  let assistantCounter = 0;

  return (
    <div className="chat-history">
      {messages.map((msg, idx) => {
        if (msg.role !== "assistant") {
          return (
            <div key={idx} className="message-container user-align">
              <div className="message user-message">{msg.content}</div>
            </div>
          );
        }

        const aiIndex = assistantCounter++;
        const idStr = `chat_${activeChat}#${aiIndex}`;
        let prefix = "";
        let content = msg.content || "";
        const nl = content.indexOf("\n");
        if (nl !== -1 && nl < 20) {
          prefix = content.slice(0, nl);
          content = content.slice(nl + 1);
        }

        return (
          <div key={idx} className="message-container assistant-align hover-group">
            {prefix && <div className="message-bar-left">{prefix}</div>}
            <div className="message assistant-message">{content}</div>
            <button
              className={`speaker-button-below ${
                playingTTSId === idStr ? "active" : ""
              }`}
              onClick={() => handleSpeakerClick(aiIndex)}
            >
              {loadingTTSId === idStr ? (
                <img src="/loading-loading-forever.gif" alt="loading" />
              ) : (
                <img src={speakerIcon} alt="speaker" />
              )}
            </button>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
};

export default ChatHistory;
