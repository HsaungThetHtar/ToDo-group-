import React, { useState } from "react";
// import ReCAPTCHA from "react-google-recaptcha";
// import { api } from "../api/api";

function Register({ onSwitchToLogin }) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null)
//   const [recaptchaToken, setRecaptchaToken] = useState(null);


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
    
    const formData = new FormData();
    formData.append("full_name", fullName);
    formData.append("username", username);
    formData.append("password", password);

    if (image) {
      formData.append("profile_image", image);
    }

    try {
      const response = await fetch("http://localhost:5001/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          username,
          password,
        }),formData
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Registration failed.");
        setLoading(false);
        return;
      }

      setSuccess("Account created successfully! Redirecting to login...");
      setTimeout(() => {
        onSwitchToLogin();
      }, 2000);

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
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files[0])}
          className="w-full"
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