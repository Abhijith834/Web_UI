// App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import ChatLayout from "./components/ChatLayout";
import MCQ from "./components/MCQ"; // Import MCQ
import "./index.css";

function App() {
  return (
    <div className="w-full min-h-screen flex flex-col text-white">
      <Routes>
        <Route path="/" element={<ChatLayout />} />
        <Route path="/mcq" element={<MCQ />} />
      </Routes>
    </div>
  );
}

export default App;
