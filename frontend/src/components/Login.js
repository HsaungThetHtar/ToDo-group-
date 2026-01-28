import React, { useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { GoogleLogin } from "@react-oauth/google";
import { api } from "../api/api";

function Login({ onLogin, onSwitchToRegister }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState(null);

  const handleRecaptchaChange = (token) => {
    setRecaptchaToken(token);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setError("");
      setLoading(true);

      const response = await fetch("http://localhost:5001/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      const data = await response.json();

      if (!data.token) {
        setError(data.message || "Google login failed.");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      onLogin(data.user.username);
    } catch (err) {
      console.error(err);
      setError("Network error: Could not connect to the server.");
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google login failed. Please try again.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!username.trim() || !password.trim()) {
      setError("Username and password are required.");
      setLoading(false);
      return;
    }

    if (!recaptchaToken) {
      setError("Please complete the reCAPTCHA.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:5001/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, recaptchaToken }),
      });

      const data = await response.json();

      if (!data.token) {
        setError(data.message || "Login failed.");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

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

        {/* reCAPTCHA */} 
        <div className="flex justify-center">
          <ReCAPTCHA
            sitekey="6LftoFgsAAAAACCLAwvct_taGG5q0hDNKcbuTOJm"
            onChange={handleRecaptchaChange}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <div className="mt-4">
        <p className="text-gray-600 text-sm mb-3">Or login with:</p>
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
          />
        </div>
      </div>

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