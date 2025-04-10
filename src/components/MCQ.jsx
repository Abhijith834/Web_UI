// src/components/MCQ.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const MCQ = () => {
  const [questions, setQuestions] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submittedAnswers, setSubmittedAnswers] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch the JSON file using the Vite base URL
    fetch(`${import.meta.env.BASE_URL}mcqs.json`)
      .then((response) => response.json())
      .then((data) => setQuestions(data))
      .catch((error) => console.error("Error loading MCQs:", error));
  }, []);

  const handleSelect = (index, value) => {
    setSelectedAnswers((prev) => ({ ...prev, [index]: value }));
  };

  const handleSubmit = (index) => {
    setSubmittedAnswers((prev) => ({ ...prev, [index]: true }));
  };

  const checkAnswer = (index, correctAnswer) => {
    const selected = selectedAnswers[index];
    if (!selected) return false;
    // Remove any leading option letter (e.g., "A) ") before comparing
    const trimmedSelected = selected.replace(/^[A-D]\)\s*/, "").trim();
    return trimmedSelected === correctAnswer.trim();
  };

  return (
    <div className="mcq-container p-4">
      <button
        onClick={() => navigate("/")}
        className="bg-blue-600 px-4 py-2 rounded mb-4"
      >
        Back to Chat
      </button>
      <h1 className="text-3xl font-bold mb-4">MCQs on Neutron Stars</h1>
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
