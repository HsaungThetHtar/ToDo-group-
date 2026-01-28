import React, { useState } from "react";
import { api } from "../api/api"; // Remove useNavigate import

function Login({ onLogin, onSwitchToRegister }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!username.trim() || !password.trim()) {
      setError("Username and password are required.");
      setLoading(false);
      return;
    }

    try {
      const data = await api.login(username, password);

      if (!data.token) {
        setError(data.message || "Login failed.");
        setLoading(false);
        return;
      }

      // Store token
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Call parent's onLogin (no navigate needed!)
      onLogin(data.user.username);

    } catch (err) {
      console.error(err);
      setError("Network error: Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">Login</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

      <p className="text-sm mt-4">
        Don't have an account?{" "}
        <button
          onClick={onSwitchToRegister}
          className="text-blue-600 hover:underline"
        >
          Register
        </button>
      </p>
    </div>
  );
}

export default Login;