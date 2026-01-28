import React, { useState } from "react";
import { api } from "../api/api"; // Remove useNavigate import

function Register({ onSwitchToLogin }) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!fullName || !username || !password) {
      setError("All fields are required.");
      setLoading(false);
      return;
    }

    try {
      const data = await api.register(fullName, username, password);

      if (data.message === "User registered successfully") {
        setSuccess("Account created successfully! Redirecting to login...");
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          onSwitchToLogin(); // Use this instead of navigate!
        }, 2000);
      } else {
        setError(data.message || "Registration failed.");
      }

    } catch (err) {
      console.error(err);
      setError("Network error.");
    } finally {
      setLoading(false);
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

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? "Creating account..." : "Register"}
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