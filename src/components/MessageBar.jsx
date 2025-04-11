import React, { useState, useRef } from "react";
import "./MessageBar.css";
import documentIcon from "../assets/document.svg";
import checkboxIcon from "../assets/checkbox.svg";
import sendIcon from "../assets/send.svg";
import micIcon from "../assets/mic.svg";
import { useNavigate } from "react-router-dom";

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
      if (!response.ok) throw new Error(`Ngrok error: ${response.status}`);
      return response;
    })
    .catch((err) => {
      console.warn("Ngrok fetch failed, falling back to localhost:5000", err);
      return fetch(localUrl, options);
    });
};

const MessageBar = ({ activeChat, isStarted, handleStart }) => {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleSend = () => {
    if (!isStarted) return;
    const payload = {
      message,
      chat_session: activeChat,
      timestamp: new Date().toISOString()
    };
    fetchWithFallback("/api/cli-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(() => setMessage(""));
  };

  const handleMic = async () => {
    if (!isStarted) return;
  
    const fileUrl = "/OSR_us_000_0032_8k.wav";
  
    try {
      // Fetch the audio file as a blob
      const response = await fetch(fileUrl);
      const blob = await response.blob();
  
      const formData = new FormData();
      formData.append("audio", blob, "OSR_us_000_0032_8k.wav");
      formData.append("session_id", activeChat);
  
      const res = await fetchWithFallback("/api/transcribe", {
        method: "POST",
        body: formData,
      });
  
      if (!res.ok) {
        throw new Error(`Failed to send audio: ${res.statusText}`);
      }
  
      console.log("✅ Audio file sent to backend");
    } catch (err) {
      console.error("❌ Error sending audio file:", err);
    }
  };
  

  const handleGoToMCQ = () => {
    if (!isStarted) return;
    navigate("/mcq", { state: { sessionId: activeChat } });
  };

  const handleFileButtonClick = async () => {
    if (!isStarted) return;
    try {
      const res = await fetch("http://localhost:5000/api/ai-pocket-tutor/database/files");
      const data = await res.json();
      const sessionFiles = data[activeChat];
      const hasPdf = sessionFiles?.some((f) => f.startsWith("pdf\\") || f.startsWith("pdf/"));

      if (hasPdf) {
        const pdfFile = sessionFiles.find(f => f.startsWith("pdf\\") || f.startsWith("pdf/"));
        const fileUrl = `http://localhost:5000/api/database/pdf?session=${activeChat}&filepath=${encodeURIComponent(pdfFile)}`;
        window.open(fileUrl, "_blank");
      } else {
        fileInputRef.current.click();
      }
    } catch (err) {
      console.error("Error checking for existing PDFs:", err);
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files.length) return;
  
    const formData = new FormData();
    formData.append("file", files[0]);
    formData.append("session_id", activeChat);
  
    try {
      const res = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        body: formData,
      });
  
      const result = await res.json();
  
      if (res.ok) {
        console.log("✅ File received by backend:", result.path);
  
        // 🔥 Fix double backslashes
        const normalizedPath = result.path.replace(/\\\\/g, "\\");
        const formattedMessage = `file (${normalizedPath})`;
        console.log(formattedMessage);
        alert(formattedMessage);

  
        await fetch("http://localhost:5000/api/cli-message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: formattedMessage,
            timestamp: Date.now(),
          }),
        });
  
        console.log("📤 CLI message sent:", formattedMessage);
      } else {
        console.error("❌ Upload failed:", result.error);
        alert(`Upload failed: ${result.error}`);
      }
    } catch (err) {
      console.error("❌ Upload error:", err);
      alert("Something went wrong while uploading the file.");
    }
  };
  

  const onStart = () => {
    setLoading(true);
    handleStart(activeChat); // optimistic UI update

    const payload = {
      message: `chat (${activeChat})`,
      chat_session: activeChat,
      timestamp: new Date().toISOString()
    };

    fetchWithFallback("/api/cli-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(() => {
        const poll = setInterval(() => {
          fetch("http://localhost:5000/api/database/session-state")
            .then((res) => res.json())
            .then((data) => {
              if (data.session_id === activeChat) {
                clearInterval(poll);
                handleStart(activeChat);
                setLoading(false);
              }
            });
        }, 2000);
      })
      .catch((err) => {
        console.error("Error sending cli-message:", err);
        setLoading(false);
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
              disabled={loading}
            >
              {loading ? "Loading..." : "Start"}
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
