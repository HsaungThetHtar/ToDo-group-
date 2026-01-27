import React, { useState } from "react";

const API_URL = "http://localhost:5001/api";

function Register({ onSwitchToLogin }) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!fullName || !username || !password) {
      setError("All fields are required.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Registration failed.");
        return;
      }

      setSuccess("Account created successfully!");
    } catch (err) {
      console.error(err);
      setError("Network error.");
    }
  };

  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">Register</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        />

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        />

        <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
          Register
        </button>
      </form>

      {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      {success && <p className="text-green-600 text-sm mt-3">{success}</p>}

      <p className="text-sm mt-4">
        Already have an account?{" "}
        <button
          onClick={onSwitchToLogin}
          className="text-blue-600 hover:underline"
        >
          Login
        </button>
      </p>
    </div>
  );
}

export default Register;
