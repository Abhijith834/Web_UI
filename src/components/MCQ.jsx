// src/components/MCQ.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const MCQ = () => {
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submittedAnswers, setSubmittedAnswers] = useState({});
  const [mcqFiles, setMcqFiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const sessionId = location.state?.sessionId;

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
      .then((res) => {
        if (!res.ok) throw new Error("Ngrok fetch failed");
        return res;
      })
      .catch(() => fetch(localUrl, options));
  };

  const loadFileList = async () => {
    const listRes = await fetchWithFallback(`/api/ai-pocket-tutor/database/files`);
    const listData = await listRes.json();
    const allFiles = listData[sessionId] || [];

    return allFiles.filter(f => /^mcqs(_\d+)?\.json$/i.test(f)).sort();
  };

  useEffect(() => {
    if (!sessionId) return;

    loadFileList()
      .then(setMcqFiles)
      .catch((err) => console.error("Failed to list MCQ files:", err));
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || mcqFiles.length === 0) return;

    const filename = mcqFiles[currentIndex];
    const filePath = encodeURIComponent(filename);
    const endpoint = `/api/database/file?session=${sessionId}&filepath=${filePath}`;

    fetchWithFallback(endpoint)
      .then((res) => res.json())
      .then((data) => {
        const parsed = JSON.parse(data.content);
        setTitle(parsed.title || "");
        setQuestions(parsed.mcqs || []);
        setSelectedAnswers({});
        setSubmittedAnswers({});
      })
      .catch((err) => {
        console.error("Failed to load MCQ file:", err);
      });
  }, [currentIndex, mcqFiles, sessionId]);

  useEffect(() => {
    if (!isCreating) return;

    const interval = setInterval(async () => {
      const updatedList = await loadFileList();
      if (updatedList.length > mcqFiles.length) {
        setIsCreating(false);
        clearInterval(interval);
        setMcqFiles(updatedList);
        setCurrentIndex(updatedList.length - 1); // Go to the new file
      }
    }, 2000);

    setPollingInterval(interval);
    return () => clearInterval(interval);
  }, [isCreating]);

  const handleSelect = (index, value) => {
    setSelectedAnswers((prev) => ({ ...prev, [index]: value }));
  };

  const handleSubmit = (index) => {
    setSubmittedAnswers((prev) => ({ ...prev, [index]: true }));
  };

  const checkAnswer = (index, correctAnswer) => {
    const selected = selectedAnswers[index];
    if (!selected) return false;
    const trimmedSelected = selected.replace(/^[A-D]\)\s*/, "").trim();
    return trimmedSelected === correctAnswer.trim();
  };

  const handleCreateMCQMessage = () => {
    if (!sessionId || isCreating) return;

    setIsCreating(true);

    const payload = {
      message: "(MCQ)",
      chat_session: sessionId,
      timestamp: new Date().toISOString()
    };

    fetchWithFallback("/api/cli-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to send (MCQ) message");
        return res.json();
      })
      .then((data) => {
        console.log("✅ (MCQ) message sent:", data);
      })
      .catch((err) => {
        console.error("❌ Error sending (MCQ) message:", err);
        setIsCreating(false);
      });
  };

  return (
    <div className="mcq-container p-4">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => navigate("/")}
          className="bg-blue-600 px-4 py-2 rounded"
        >
          Back to Chat
        </button>
        <div className="flex flex-col items-end space-y-2">
          <div className="space-x-2">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
              disabled={currentIndex === 0}
              className="bg-blue-600 px-3 py-1 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setCurrentIndex((prev) => Math.min(prev + 1, mcqFiles.length - 1))
              }
              disabled={currentIndex === mcqFiles.length - 1}
              className="bg-blue-600 px-3 py-1 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <button
            onClick={handleCreateMCQMessage}
            disabled={isCreating}
            className="bg-blue-600 px-4 py-1 rounded disabled:opacity-50"
          >
            {isCreating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>

      <h1
        className="text-3xl font-bold mb-4"
        dangerouslySetInnerHTML={{ __html: title }}
      />

      {questions.length === 0 && <p>Loading questions...</p>}
      {questions.map((q, index) => (
        <div
          key={index}
          className="mcq-question p-4 border border-gray-600 rounded my-4"
        >
          <h2 className="font-bold mb-2">{q.question}</h2>
          <div className="options mb-2">
            {q.options.map((option, optIndex) => (
              <div key={optIndex} className="mb-1">
                <label>
                  <input
                    type="radio"
                    name={`question-${index}`}
                    value={option}
                    onChange={(e) => handleSelect(index, e.target.value)}
                    disabled={submittedAnswers[index]}
                    className="mr-2"
                  />
                  {option}
                </label>
              </div>
            ))}
          </div>
          {submittedAnswers[index] ? (
            <div className="result">
              {checkAnswer(index, q.answer) ? (
                <p className="text-green-400 font-bold">Correct!</p>
              ) : (
                <p className="text-red-400 font-bold">
                  Incorrect. {q.explanation}
                </p>
              )}
            </div>
          ) : (
            <button
              onClick={() => handleSubmit(index)}
              className="bg-blue-600 text-white px-4 py-2 rounded mt-2"
            >
              Submit
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default MCQ;
