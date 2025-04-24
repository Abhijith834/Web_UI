import React, { useState } from "react";
import MessageBar from "./MessageBar";

// 🔄 CHANGED: helper to route through ngrok or localhost
const fetchWithFallback = (endpoint, options = {}) => {
  const local = `http://localhost:5000${endpoint}`;
  if (["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    return fetch(local, options);
  }
  const ngrok = `https://mint-jackal-publicly.ngrok-free.app${endpoint}`;
  const headers = { ...options.headers, "ngrok-skip-browser-warning": "true" };
  return fetch(ngrok, { ...options, headers })
    .then(res => {
      if (!res.ok) throw new Error(`Ngrok error: ${res.status}`);
      return res;
    })
    .catch(() => fetch(local, options));
};

const Learning = ({ show, onClose, isStarted, handleStart }) => {
  const [term, setTerm] = useState("");
  const [pdfLinks, setPdfLinks] = useState([]);

  if (!show) return null;

  const handleSubmit = async e => {
    e.preventDefault();
    let sessionId;
    try {
      // 🔄 CHANGED: session-state via fallback
      const resp = await fetchWithFallback("/api/database/session-state");
      sessionId = (await resp.json()).session_id;
    } catch {
      console.error("Failed to fetch session state");
      return;
    }

    // 🔄 CHANGED: send CLI message via fallback
    await fetchWithFallback("/api/cli-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: term,
        chat_session: sessionId,
        timestamp: new Date().toISOString(),
      }),
    }).catch(console.error);
    setTerm("");

    const pollInterval = 2000, maxAttempts = 10;
    let attempts = 0;
    const poll = async () => {
      attempts++;
      try {
        const url = `/api/database/file?session=${sessionId}&filepath=pdf_options.json`;
        // 🔄 CHANGED: polling via fallback
        const fileResp = await fetchWithFallback(url);
        if (fileResp.ok) {
          const links = JSON.parse((await fileResp.json()).content);
          setPdfLinks(links);
          return;
        }
      } catch {}
      if (attempts < maxAttempts) setTimeout(poll, pollInterval);
      else console.warn("pdf_options.json not found after polling");
    };
    poll();
  };

  const handleSelect = async number => {
    let sessionId;
    try {
      // 🔄 CHANGED: session-state via fallback
      const resp = await fetchWithFallback("/api/database/session-state");
      sessionId = (await resp.json()).session_id;
    } catch {
      console.error("Failed to fetch session state for select");
      return;
    }
    // 🔄 CHANGED: send selection via fallback
    await fetchWithFallback("/api/cli-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `${number}`,
        chat_session: sessionId,
        timestamp: new Date().toISOString(),
      }),
    }).catch(console.error);
    onClose();
  };

  return (
    <div className="learning-modal fixed inset-0 flex flex-col justify-between bg-black bg-opacity-50 p-4">
      <div className="bg-blue-600 text-white p-4 rounded shadow-lg w-full max-w-4xl mx-auto mt-8">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold">Learning Search</h2>
          <button onClick={onClose} aria-label="Close Search" className="text-2xl font-bold">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex mb-4">
          <input
            type="text"
            className="flex-grow border p-2 rounded-l text-black"
            placeholder="Type a message..."
            value={term}
            onChange={e => setTerm(e.target.value)}
          />
          <button type="submit" className="px-4 bg-blue-800 text-white rounded-r">
            Go
          </button>
        </form>

        {pdfLinks.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto max-h-96">
            {pdfLinks.map((url, i) => (
              <div key={i} className="bg-white rounded shadow flex flex-col overflow-hidden">
                <iframe
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`}
                  title={`pdf-preview-${i}`}
                  className="w-full h-36 flex-shrink-0"
                />
                <div className="p-2 flex-1 flex flex-col justify-between">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline text-sm break-words text-center mb-2"
                  >
                    {url.split("/").pop()}
                  </a>
                  <button
                    onClick={() => handleSelect(i + 1)}
                    className="mt-auto bg-green-600 hover:bg-green-700 text-white py-1 rounded"
                  >
                    Select
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="w-full fixed bottom-0">
        <MessageBar activeChat={undefined} isStarted={isStarted} handleStart={handleStart} />
      </div>
    </div>
  );
};

export default Learning;
