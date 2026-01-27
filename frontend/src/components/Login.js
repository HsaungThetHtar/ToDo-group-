// frontend/src/components/Login.js
import React, { useState } from "react";

const API_URL = "http://localhost:5001/api";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Please enter a username.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || "Login failed due to server error.");
        return;
      }

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("todo_username", username);
        onLogin(username);
      } else {
        setError(data.message || "Login failed.");
      }
    } catch (err) {
      setError("Network error: Could not connect to the server.");
      console.error(err);
    }
  };

  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">
        Login
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Login
        </button>
      </form>

      {error && (
        <p className="text-red-500 text-sm mt-3">
          {error} 
        </p>
      )}
    </div>
  );
}

export default Login;
