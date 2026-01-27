import React, { useState } from "react";

const API_URL = "http://localhost:5001/api";

function EditProfile({ username, onBack }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleSave = async () => {
    setError("");

    if (!fullName) {
      setError("Full name is required");
      return;
    }

    const formData = new FormData();
    formData.append("full_name", fullName);

    if (file) {
      formData.append("profile_image", file);
    }

    try {
      const response = await fetch(`${API_URL}/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to update profile");
        return;
      }

      alert("✅ Profile updated successfully!");
      onBack();
    } catch (err) {
      setError("Server error. Try again.");
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow p-6">
      <h2 className="text-xl font-bold mb-4">Edit Profile</h2>

      <p className="mb-3 text-gray-600">
        Username: <span className="font-medium">{username}</span>
      </p>

      <input
        type="text"
        placeholder="Full name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        className="w-full border rounded px-3 py-2 mb-3"
      />

      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="mb-4"
      />

      {preview && (
        <img
          src={preview}
          alt="Preview"
          className="w-32 h-32 rounded-full object-cover mb-4"
        />
      )}

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Save
        </button>

        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
        >
          Back
        </button>
      </div>
    </div>
  );
}

export default EditProfile;
